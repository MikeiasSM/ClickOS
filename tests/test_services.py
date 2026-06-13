from clickos import db, services


def test_next_number_orcamento_and_os(tmp_path):
    con = db.connect(tmp_path / "t.db")
    assert services.next_number(con, "orcamento", 2026) == "ORC-2026-0001"
    assert services.next_number(con, "orcamento", 2026) == "ORC-2026-0002"
    assert services.next_number(con, "os", 2026) == "OS-2026-0001"


def test_sequence_resets_per_year(tmp_path):
    con = db.connect(tmp_path / "t.db")
    services.next_number(con, "os", 2026)
    assert services.next_number(con, "os", 2027) == "OS-2027-0001"


def test_line_liquido():
    assert services.line_liquido(3, 100, 50) == 250.0
    assert services.line_liquido("3", "100", "0") == 300.0
    assert services.line_liquido(None, None, None) == 0.0


def test_compute_totals():
    itens = [
        {"quantidade": 3, "valor_unitario": 100, "desconto": 50},
        {"quantidade": 1, "valor_unitario": 45.5, "desconto": 0},
    ]
    t = services.compute_totals(itens, desconto_geral=10, acrescimo=5)
    assert t["subtotal"] == 295.5
    assert t["total"] == 290.5
