from clickos import db


def test_connect_creates_schema(tmp_path):
    con = db.connect(tmp_path / "t.db")
    names = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {"empresa", "clientes", "veiculos", "itens_catalogo", "documentos",
            "documento_itens", "documento_lataria", "contadores", "meta"} <= names


def test_seed_empresa_alves(tmp_path):
    con = db.connect(tmp_path / "t.db")
    row = con.execute("SELECT cnpj, razao_social FROM empresa WHERE id=1").fetchone()
    assert row["cnpj"] == "51.858.310/0001-82"
    assert "ALVES" in row["razao_social"]


def test_seed_catalogo(tmp_path):
    con = db.connect(tmp_path / "t.db")
    assert con.execute("SELECT COUNT(*) FROM itens_catalogo").fetchone()[0] >= 6


def test_migration_idempotent(tmp_path):
    p = tmp_path / "t.db"
    db.connect(p).close()
    con = db.connect(p)
    assert con.execute("SELECT COUNT(*) FROM empresa").fetchone()[0] == 1
    assert con.execute("SELECT COUNT(*) FROM meta").fetchone()[0] == 1
