import pytest

from clickos import db, repositories as repo
from clickos.api import Api


def _con(tmp_path, nome="rbac.db"):
    return db.connect(tmp_path / nome)


def test_schema_v13_e_papeis_padrao(tmp_path):
    con = _con(tmp_path)
    assert con.execute("SELECT schema_version FROM meta").fetchone()[0] == 13
    nomes = {r["nome"] for r in repo.papeis.list(con)}
    assert {"Administrador", "Atendente", "Mecânico"} <= nomes
    # SUPORTE recebe papel no seed (mesmo ignorando RBAC) e a coluna existe
    sup = con.execute("SELECT papel_id FROM usuarios WHERE login='SUPORTE'").fetchone()
    assert sup["papel_id"] is not None


def test_migracao_de_v12_da_admin_aos_existentes(tmp_path):
    con = db.connect(tmp_path / "antigo.db")
    con.execute("UPDATE meta SET schema_version = 12")
    # simula um banco v12: zera o papel para checar a atribuição da migração
    con.execute("UPDATE usuarios SET papel_id = NULL")
    con.commit()
    con.close()
    con2 = db.connect(tmp_path / "antigo.db")  # reabrir dispara migração + seed
    assert con2.execute("SELECT schema_version FROM meta").fetchone()[0] == 13
    admin = con2.execute("SELECT id FROM papeis WHERE nome='Administrador'").fetchone()[0]
    todos = con2.execute("SELECT papel_id FROM usuarios").fetchall()
    assert all(u["papel_id"] == admin for u in todos)


def _papel_id(con, nome):
    return con.execute("SELECT id FROM papeis WHERE nome=?", (nome,)).fetchone()[0]


def test_permissoes_efetivas_por_papel(tmp_path):
    con = _con(tmp_path)
    mec = repo.usuarios.create(con, {"login": "JOAO", "senha": "1234", "papel_id": _papel_id(con, "Mecânico")})
    mods = set(repo.usuarios.permissoes(con, mec["id"]))
    assert mods == {"dashboard", "os"}  # papel Mecânico
    assert "faturar" not in mods and "configuracoes" not in mods


def test_override_libera_e_bloqueia(tmp_path):
    con = _con(tmp_path)
    u = repo.usuarios.create(con, {"login": "MARIA", "senha": "1234", "papel_id": _papel_id(con, "Mecânico")})
    # exceção que LIBERA faturar e BLOQUEIA dashboard
    repo.usuarios.set_overrides(con, u["id"], {"faturar": 1, "dashboard": 0})
    mods = set(repo.usuarios.permissoes(con, u["id"]))
    assert "faturar" in mods and "dashboard" not in mods and "os" in mods
    assert repo.usuarios.overrides(con, u["id"]) == {"faturar": 1, "dashboard": 0}
    # limpar overrides volta ao papel puro
    repo.usuarios.set_overrides(con, u["id"], {})
    assert set(repo.usuarios.permissoes(con, u["id"])) == {"dashboard", "os"}


def test_suporte_tem_todos_os_modulos(tmp_path):
    con = _con(tmp_path)
    assert set(repo.usuarios.permissoes(con, 0, is_suporte=True)) == set(db.MODULO_KEYS)


def test_usuario_novo_recebe_papel_padrao(tmp_path):
    con = _con(tmp_path)
    u = repo.usuarios.create(con, {"login": "PEDRO", "senha": "1234"})  # sem papel_id
    assert u["papel_nome"] == db.PAPEL_PADRAO_NOVO  # Atendente


def test_papel_custom_crud_e_protecoes(tmp_path):
    con = _con(tmp_path)
    p = repo.papeis.create(con, {"nome": "Caixa", "descricao": "Só faturamento",
                                 "modulos": ["dashboard", "faturar", "xxx-invalido"]})
    assert set(p["modulos"]) == {"dashboard", "faturar"}  # módulo inválido é ignorado
    p = repo.papeis.update(con, p["id"], {"modulos": ["os"]})
    assert p["modulos"] == ["os"]
    # papel do sistema não pode ser excluído
    with pytest.raises(Exception):
        repo.papeis.delete(con, _papel_id(con, "Administrador"))
    # papel em uso não pode ser excluído
    repo.usuarios.create(con, {"login": "ANA", "senha": "1234", "papel_id": p["id"]})
    with pytest.raises(Exception):
        repo.papeis.delete(con, p["id"])
    # sem usuários, exclui
    con.execute("DELETE FROM usuarios WHERE login='ANA'"); con.commit()
    repo.papeis.delete(con, p["id"])
    assert repo.papeis.get(con, p["id"]) is None


# ----------------------------------------------------------------- enforcement na API
def _login(api, login, senha):
    r = api.login({"login": login, "senha": senha})
    assert r["ok"], r
    return r["data"]


def test_api_login_devolve_modulos(tmp_path):
    con = _con(tmp_path)
    repo.usuarios.create(con, {"login": "JOAO", "senha": "1234", "papel_id": _papel_id(con, "Mecânico")})
    api = Api(con)
    data = _login(api, "JOAO", "1234")
    assert set(data["modulos"]) == {"dashboard", "os"}


def test_api_mecanico_bloqueado_em_pessoas_e_config(tmp_path):
    con = _con(tmp_path)
    repo.usuarios.create(con, {"login": "JOAO", "senha": "1234", "papel_id": _papel_id(con, "Mecânico")})
    api = Api(con)
    _login(api, "JOAO", "1234")
    r = api.save_cliente({"nome": "Cliente X"})
    assert r["ok"] is False and r.get("negado")
    r2 = api.save_preferencias({"qualquer": "1"})
    assert r2["ok"] is False and r2.get("negado")
    r3 = api.list_usuarios()
    assert r3["ok"] is False and r3.get("negado")


def test_api_atendente_cria_pessoa_mas_nao_fatura(tmp_path):
    con = _con(tmp_path)
    repo.usuarios.create(con, {"login": "MARIA", "senha": "1234", "papel_id": _papel_id(con, "Atendente")})
    api = Api(con)
    _login(api, "MARIA", "1234")
    assert api.save_cliente({"nome": "Cliente Y"})["ok"]  # Atendente tem 'pessoas'
    # cria O.S. com serviço e fatura (Atendente TEM faturar -> ok)
    cli = repo.clientes.create(con, {"nome": "Dono"})
    osd = repo.documentos.create(con, {"tipo": "os", "data_abertura": "2026-06-17",
                                       "cliente_id": cli["id"], "km_entrada": "1",
                                       "itens": [{"descricao": "Serviço", "quantidade": 1, "valor_unitario": 100}]})
    assert api.set_status({"id": osd["id"], "status": "Faturada"})["ok"]


def test_api_suporte_ignora_rbac(tmp_path):
    con = _con(tmp_path)
    api = Api(con)
    _login(api, "SUPORTE", "1234567890")
    assert api.save_cliente({"nome": "Cliente Z"})["ok"]
    assert api.list_usuarios()["ok"]


def test_api_override_bloqueia_faturar_para_atendente(tmp_path):
    con = _con(tmp_path)
    u = repo.usuarios.create(con, {"login": "CARLOS", "senha": "1234", "papel_id": _papel_id(con, "Atendente")})
    repo.usuarios.set_overrides(con, u["id"], {"faturar": 0})  # exceção bloqueia faturar
    api = Api(con)
    _login(api, "CARLOS", "1234")
    cli = repo.clientes.create(con, {"nome": "Dono"})
    osd = repo.documentos.create(con, {"tipo": "os", "data_abertura": "2026-06-17",
                                       "cliente_id": cli["id"], "km_entrada": "1", "itens": []})
    r = api.set_status({"id": osd["id"], "status": "Faturada"})
    assert r["ok"] is False and r.get("negado")
    # mas mudar para 'Em Execução' (módulo os) continua permitido
    assert api.set_status({"id": osd["id"], "status": "Em Execução"})["ok"]
