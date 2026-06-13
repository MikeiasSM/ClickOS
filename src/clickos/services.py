"""Regras de negócio puras: numeração, cálculo de totais e conversão Orçamento->OS."""


class EmVinculo(Exception):
    """Levantada ao tentar excluir um registro que possui documentos vinculados."""


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


def compute_totals(itens, desconto_geral=0, acrescimo=0) -> dict:
    """Subtotal (soma dos líquidos) e total (subtotal - desconto geral + acréscimo)."""
    subtotal = round(
        sum(line_liquido(i.get("quantidade"), i.get("valor_unitario"), i.get("desconto")) for i in itens),
        2,
    )
    total = round(subtotal - _num(desconto_geral) + _num(acrescimo), 2)
    return {"subtotal": subtotal, "total": total}


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
        "acrescimo": orc.get("acrescimo", 0),
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
