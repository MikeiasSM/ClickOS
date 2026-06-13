import pytest

from clickos import db, repositories as repo, services


def _cliente(con, nome="João da Silva"):
    return repo.clientes.create(con, {"nome": nome, "telefone": "(77) 90000-0000",
                                      "cidade": "Luís Eduardo Magalhães", "uf": "BA"})


def _veiculo(con, cliente_id, placa="ABC1D23"):
    return repo.veiculos.create(con, {"placa": placa, "cliente_id": cliente_id,
                                      "marca": "Chevrolet", "modelo": "Onix"})


def test_create_cliente_gera_codigo(tmp_path):
    con = db.connect(tmp_path / "t.db")
    c1 = _cliente(con)
    c2 = _cliente(con, "Maria")
    assert c1["codigo_interno"] == "CLI-0001"
    assert c2["codigo_interno"] == "CLI-0002"


def test_veiculo_exige_placa(tmp_path):
    con = db.connect(tmp_path / "t.db")
    c = _cliente(con)
    with pytest.raises(ValueError):
        repo.veiculos.create(con, {"cliente_id": c["id"], "marca": "GM"})


def test_documento_persiste_itens_e_lataria(tmp_path):
    con = db.connect(tmp_path / "t.db")
    c = _cliente(con)
    v = _veiculo(con, c["id"])
    doc = repo.documentos.create(con, {
        "tipo": "orcamento", "data_abertura": "2026-06-13",
        "cliente_id": c["id"], "veiculo_id": v["id"], "km_entrada": "85000",
        "desconto_geral": 0, "acrescimo": 0,
        "itens": [{"descricao": "Pintura completa do capô", "tipo": "servico",
                   "quantidade": 3, "valor_unitario": 100, "desconto": 50}],
        "lataria": [{"peca": "Capô", "estado": "Avaria"}],
    })
    full = repo.documentos.get(con, doc["id"])
    assert full["numero"] == "ORC-2026-0001"
    assert full["total"] == 250.0
    assert full["cliente_nome"] == "João da Silva"
    assert len(full["itens"]) == 1
    assert len(full["lataria"]) == 11  # completa as 11 peças
    capô = next(p for p in full["lataria"] if p["peca"] == "Capô")
    assert capô["estado"] == "Avaria"


def test_search_documento_por_placa(tmp_path):
    con = db.connect(tmp_path / "t.db")
    c = _cliente(con)
    v = _veiculo(con, c["id"], "XYZ9K88")
    repo.documentos.create(con, {"tipo": "os", "data_abertura": "2026-06-13",
                                 "cliente_id": c["id"], "veiculo_id": v["id"], "itens": []})
    achados = repo.documentos.list(con, q="XYZ9K88")
    assert len(achados) == 1
    assert achados[0]["veiculo_placa"] == "XYZ9K88"


def test_bloqueia_excluir_cliente_vinculado(tmp_path):
    con = db.connect(tmp_path / "t.db")
    c = _cliente(con)
    v = _veiculo(con, c["id"])
    repo.documentos.create(con, {"tipo": "os", "cliente_id": c["id"], "veiculo_id": v["id"], "itens": []})
    with pytest.raises(services.EmVinculo):
        repo.clientes.delete(con, c["id"])


def test_converter_orcamento_em_os(tmp_path):
    con = db.connect(tmp_path / "t.db")
    c = _cliente(con)
    v = _veiculo(con, c["id"])
    orc = repo.documentos.create(con, {
        "tipo": "orcamento", "data_abertura": "2026-06-13", "cliente_id": c["id"], "veiculo_id": v["id"],
        "itens": [{"descricao": "Serviço", "quantidade": 1, "valor_unitario": 200, "desconto": 0}],
        "lataria": [{"peca": "Teto", "estado": "OK"}]})
    os_doc = services.convert_to_os(con, orc["id"])
    assert os_doc["tipo"] == "os"
    assert os_doc["numero"] == "OS-2026-0001"
    assert os_doc["origem_orcamento_id"] == orc["id"]
    assert os_doc["total"] == 200.0
    assert repo.documentos.get(con, orc["id"])["status"] == "Aprovado"
    teto = next(p for p in os_doc["lataria"] if p["peca"] == "Teto")
    assert teto["estado"] == "OK"
