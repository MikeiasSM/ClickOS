from clickos import api, db


def _api(tmp_path):
    return api.Api(db.connect(tmp_path / "t.db"))


def test_bootstrap_and_flow(tmp_path):
    a = _api(tmp_path)
    boot = a.bootstrap()
    assert boot["ok"] and "empresa" in boot["data"]  # app agnóstico: empresa começa vazia
    assert boot["data"]["empresa"]["setup_concluido"] == 0
    assert "logo" not in boot["data"]["empresa"]  # bytes não vão para o JS

    cli = a.save_cliente({"nome": "João da Silva", "telefone": "(77) 90000-0000"})
    assert cli["ok"]
    vei = a.save_veiculo({"placa": "ABC1D23", "cliente_id": cli["data"]["id"],
                          "marca": "GM", "modelo": "Onix"})
    assert vei["ok"]
    saved = a.save_documento({"tipo": "orcamento", "data_abertura": "2026-06-13",
                              "cliente_id": cli["data"]["id"], "veiculo_id": vei["data"]["id"],
                              "itens": [{"descricao": "S", "quantidade": 3,
                                         "valor_unitario": 100, "desconto": 50}]})
    assert saved["ok"] and saved["data"]["total"] == 250.0

    d = a.dashboard()
    assert d["ok"] and d["data"]["total"] == 1
    lst = a.list_documentos({"q": "ABC1D23"})
    assert lst["ok"] and len(lst["data"]) == 1

    pr = a.print_documento(saved["data"]["id"])
    assert pr["ok"] and "ORÇAMENTO" in pr["data"]["html"]

    conv = a.converter_os(saved["data"]["id"])
    assert conv["ok"] and conv["data"]["numero"].startswith("OS-")


def test_api_error_is_friendly(tmp_path):
    a = _api(tmp_path)
    r = a.save_veiculo({"marca": "x"})  # sem placa
    assert r["ok"] is False
    assert "Placa" in r["erro"]
