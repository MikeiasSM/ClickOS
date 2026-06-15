"""Regras de negócio puras: numeração, cálculo de totais e conversão Orçamento->OS."""
import base64
import hashlib
import hmac
import os

PBKDF2_ITER = 120000
SENHA_RESET = "1234"  # senha temporária aplicada ao redefinir (usuário troca no 1º login)


class EmVinculo(Exception):
    """Levantada ao tentar excluir um registro que possui documentos vinculados."""


def image_data_uri(blob) -> str:
    """Monta um data: URI a partir dos bytes de uma imagem (detecta png/jpeg/gif/webp)."""
    if not blob:
        return ""
    head = bytes(blob[:12])
    if head[:3] == b"\xff\xd8\xff":
        mime = "image/jpeg"
    elif head[:8] == b"\x89PNG\r\n\x1a\n":
        mime = "image/png"
    elif head[:6] in (b"GIF87a", b"GIF89a"):
        mime = "image/gif"
    elif head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        mime = "image/webp"
    else:
        mime = "image/png"
    return "data:%s;base64,%s" % (mime, base64.b64encode(bytes(blob)).decode("ascii"))


def hash_senha(senha, salt=None):
    """Gera (salt_hex, hash_hex) com PBKDF2-HMAC-SHA256 (stdlib, sem dependências).
    Se `salt` vier (hex str), reaproveita-o — útil para conferir uma senha."""
    if salt is None:
        salt = os.urandom(16)
    elif isinstance(salt, str):
        salt = bytes.fromhex(salt)
    dk = hashlib.pbkdf2_hmac("sha256", str(senha or "").encode("utf-8"), salt, PBKDF2_ITER)
    return salt.hex(), dk.hex()


def verifica_senha(senha, salt_hex, hash_hex) -> bool:
    """Compara a senha informada com o hash salvo (comparação em tempo constante)."""
    if not salt_hex or not hash_hex:
        return False
    _, calc = hash_senha(senha, salt_hex)
    return hmac.compare_digest(calc, hash_hex)


def _num(x) -> float:
    """Coerção numérica tolerante (None, vazio, vírgula decimal)."""
    if x is None:
        return 0.0
    if isinstance(x, (int, float)):
        return float(x)
    s = str(x).strip()
    if not s:
        return 0.0
    if "," in s and "." not in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def next_number(con, tipo: str, ano: int) -> str:
    """Gera o próximo número sequencial por tipo/ano: ORC-AAAA-#### ou OS-AAAA-####."""
    tipo = "os" if tipo == "os" else "orcamento"
    cur = con.execute(
        "INSERT INTO contadores(tipo, ano, ultimo) VALUES (?, ?, 1) "
        "ON CONFLICT(tipo, ano) DO UPDATE SET ultimo = ultimo + 1 RETURNING ultimo",
        (tipo, int(ano)),
    )
    ultimo = cur.fetchone()[0]
    con.commit()
    prefixo = "OS-" if tipo == "os" else "ORC-"
    return f"{prefixo}{int(ano)}-{ultimo:04d}"


def line_liquido(qtd, bruto, desconto) -> float:
    """Valor líquido de uma linha: Qtd x Vlr Bruto - Desconto."""
    return round(_num(qtd) * _num(bruto) - _num(desconto), 2)


def valor_resolvido(subtotal, valor, tipo="valor") -> float:
    """Converte um ajuste (desconto ou acréscimo) em R$. Quando 'percent', aplica o % sobre o subtotal."""
    if (tipo or "valor") == "percent":
        return round(_num(subtotal) * _num(valor) / 100.0, 2)
    return round(_num(valor), 2)


# compat: nome antigo mantido
desconto_resolvido = valor_resolvido


def compute_totals(itens, desconto_geral=0, acrescimo=0, desconto_tipo="valor", acrescimo_tipo="valor") -> dict:
    """Subtotal (soma dos líquidos) e total (subtotal - desconto + acréscimo).
    Desconto e acréscimo podem ser em R$ ('valor') ou percentual ('percent') sobre o subtotal."""
    subtotal = round(
        sum(line_liquido(i.get("quantidade"), i.get("valor_unitario"), i.get("desconto")) for i in itens),
        2,
    )
    desc = valor_resolvido(subtotal, desconto_geral, desconto_tipo)
    acr = valor_resolvido(subtotal, acrescimo, acrescimo_tipo)
    total = round(subtotal - desc + acr, 2)
    return {"subtotal": subtotal, "total": total, "desconto_valor": desc, "acrescimo_valor": acr}


# ----------------------------------------------------------------- datas / durações (preferências)
UNIDADES_SEG = {"horas": 3600, "dias": 86400, "semanas": 604800, "meses": 2592000}
_UNIDADE_SINGULAR = {"horas": "hora", "dias": "dia", "semanas": "semana", "meses": "mês"}
_UNIDADE_PLURAL = {"horas": "horas", "dias": "dias", "semanas": "semanas", "meses": "meses"}


def parse_dt(s):
    """Lê uma data/datetime ISO tolerando 'YYYY-MM-DD' ou 'YYYY-MM-DDTHH:MM:SS'. Retorna datetime|None."""
    if not s:
        return None
    from datetime import datetime
    s = str(s).strip()
    for cand in (s, s[:19], s[:10]):
        try:
            return datetime.fromisoformat(cand)
        except ValueError:
            continue
    return None


def duracao_segundos(qtd, unidade) -> float:
    return _num(qtd) * UNIDADES_SEG.get(unidade, UNIDADES_SEG["dias"])


def duracao_texto(qtd, unidade) -> str:
    """Ex.: (15, 'dias') -> '15 dias'; (1, 'semana') -> '1 semana'."""
    q = _num(qtd)
    n = int(q) if q == int(q) else q
    if q == 1:
        return f"{n} {_UNIDADE_SINGULAR.get(unidade, 'dia')}"
    return f"{n} {_UNIDADE_PLURAL.get(unidade, 'dias')}"


def validade_texto(qtd, unidade) -> str:
    return f"Orçamento válido por {duracao_texto(qtd, unidade)}"


def convert_to_os(con, orcamento_id: int, stamp: str | None = None) -> dict:
    """Cria uma OS a partir de um Orçamento (copia itens/lataria/checklist) e marca o orçamento como Aprovado."""
    from . import repositories as repo  # import tardio evita ciclo

    orc = repo.documentos.get(con, orcamento_id)
    if orc is None:
        raise ValueError("Orçamento não encontrado")
    if orc["tipo"] != "orcamento":
        raise ValueError("Documento não é um orçamento")

    payload = {
        "tipo": "os",
        "status": "Aberta",
        "data_abertura": orc.get("data_abertura"),
        "cliente_id": orc.get("cliente_id"),
        "veiculo_id": orc.get("veiculo_id"),
        "km_entrada": orc.get("km_entrada"),
        "desconto_geral": orc.get("desconto_geral", 0),
        "desconto_tipo": orc.get("desconto_tipo", "valor"),
        "acrescimo": orc.get("acrescimo", 0),
        "acrescimo_tipo": orc.get("acrescimo_tipo", "valor"),
        "forma_pagamento": orc.get("forma_pagamento"),
        "prazo_execucao": orc.get("prazo_execucao"),
        "validade": orc.get("validade"),
        "observacoes": orc.get("observacoes"),
        "estado_geral": orc.get("estado_geral"),
        "nivel_combustivel": orc.get("nivel_combustivel"),
        "obs_entrada": orc.get("obs_entrada"),
        "item_chave_principal": orc.get("item_chave_principal", 0),
        "item_chave_reserva": orc.get("item_chave_reserva", 0),
        "item_documento": orc.get("item_documento", 0),
        "item_manual": orc.get("item_manual", 0),
        "usuario_id": orc.get("usuario_id"),  # a OS herda o responsável do orçamento
        "origem_orcamento_id": orcamento_id,
        "itens": [
            {k: it.get(k) for k in ("item_catalogo_id", "descricao", "tipo",
                                    "quantidade", "valor_unitario", "desconto")}
            for it in orc.get("itens", [])
        ],
        "lataria": [{"peca": p["peca"], "estado": p.get("estado", "")} for p in orc.get("lataria", [])],
    }
    nova = repo.documentos.create(con, payload, stamp=stamp)
    repo.documentos.set_status(con, orcamento_id, "Aprovado", stamp=stamp)
    return nova
