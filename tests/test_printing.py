from clickos import db, printing, repositories as repo


def test_render_documento_contains_key_fields(tmp_path):
    con = db.connect(tmp_path / "t.db")
    c = repo.clientes.create(con, {"nome": "João da Silva", "telefone": "x"})
    v = repo.veiculos.create(con, {"placa": "ABC1D23", "cliente_id": c["id"],
                                   "marca": "Chevrolet", "modelo": "Onix"})
    doc = repo.documentos.create(con, {
        "tipo": "orcamento", "data_abertura": "2026-06-13", "cliente_id": c["id"],
        "veiculo_id": v["id"], "km_entrada": "85000",
        "itens": [{"descricao": "Pintura", "quantidade": 1, "valor_unitario": 100, "desconto": 0}],
        "lataria": [{"peca": "Capô", "estado": "Avaria"}]})
    full = repo.documentos.get(con, doc["id"])
    empresa = dict(con.execute("SELECT * FROM empresa WHERE id=1").fetchone())
    html = printing.render_documento(full, empresa, repo.clientes.get(con, c["id"]),
                                     repo.veiculos.get(con, v["id"]), gerado_em="13/06/2026 às 16:00")
    assert full["numero"] in html
    assert "João da Silva" in html
    assert "ASSINATURA" in html.upper()
    assert "Vlr Líquido" in html
    assert "@page" in html
    assert "ORÇAMENTO" in html
    assert "data:image/png;base64," in html  # logo embutido
