"""Trilha de auditoria (append-only).

Apenas INSERÇÃO: a tabela `audit_log` tem gatilhos no banco que abortam qualquer UPDATE/DELETE,
então nem este módulo nem SQL direto conseguem alterar/apagar registros já gravados.
"""
import json
from datetime import datetime

# Campos ruidosos/derivados/sensíveis que não entram no diff nem no snapshot.
_IGNORAR = {
    "criado_em", "atualizado_em", "itens", "lataria", "avatar", "avatar_uri", "logo", "has_logo",
    "senha_hash", "salt", "senha", "nova_senha", "avatar_b64",
    "desconto_valor", "situacao", "expirado", "atrasado",
    "cliente_nome", "veiculo_placa", "veiculo_marca", "veiculo_modelo", "usuario_nome",
}


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _limpa(d: dict) -> dict:
    """Remove chaves ruidosas/sensíveis de um dicionário (para snapshot)."""
    if not isinstance(d, dict):
        return {}
    return {k: v for k, v in d.items() if k not in _IGNORAR}


def diff(antes, depois) -> dict:
    """{campo: [antigo, novo]} apenas dos campos que mudaram (ignora ruído/derivados/sensíveis)."""
    antes = antes or {}
    depois = depois or {}
    out = {}
    for k in set(antes) | set(depois):
        if k in _IGNORAR:
            continue
        a, b = antes.get(k), depois.get(k)
        if a != b:
            out[k] = [a, b]
    return out


def snapshot(d) -> dict:
    return _limpa(d)


def registrar(con, usuario, acao, entidade=None, entidade_id=None, descricao="", detalhes=None):
    """Grava um evento de auditoria. `usuario` é o dict de sessão {id, login} (ou None p/ sistema)."""
    uid = usuario.get("id") if isinstance(usuario, dict) else None
    login = usuario.get("login") if isinstance(usuario, dict) else None
    blob = None
    if detalhes is not None:
        try:
            blob = json.dumps(detalhes, ensure_ascii=False, default=str)
        except (TypeError, ValueError):
            blob = json.dumps({"_erro": "detalhes não serializáveis"}, ensure_ascii=False)
    con.execute(
        "INSERT INTO audit_log(criado_em, usuario_id, usuario_login, acao, entidade, entidade_id, descricao, detalhes) "
        "VALUES (?,?,?,?,?,?,?,?)",
        (_now(), uid, login, acao, entidade, entidade_id, (descricao or "")[:600], blob),
    )
    con.commit()
