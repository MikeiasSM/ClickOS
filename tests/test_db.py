from clickos import db


def test_connect_creates_schema(tmp_path):
    con = db.connect(tmp_path / "t.db")
    names = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {"empresa", "clientes", "veiculos", "itens_catalogo", "documentos",
            "documento_itens", "documento_lataria", "contadores", "meta"} <= names


def test_seed_empresa_vazia(tmp_path):
    # o app é agnóstico/anêmico: a empresa nasce vazia (id=1), sem dados de exemplo, e o
    # assistente de primeira execução ainda não foi concluído.
    con = db.connect(tmp_path / "t.db")
    row = con.execute("SELECT razao_social, cnpj, logo, setup_concluido FROM empresa WHERE id=1").fetchone()
    assert row is not None
    assert row["razao_social"] is None and row["cnpj"] is None and row["logo"] is None
    assert row["setup_concluido"] == 0


def test_seed_catalogo(tmp_path):
    con = db.connect(tmp_path / "t.db")
    assert con.execute("SELECT COUNT(*) FROM itens_catalogo").fetchone()[0] >= 6


def test_migration_idempotent(tmp_path):
    p = tmp_path / "t.db"
    db.connect(p).close()
    con = db.connect(p)
    assert con.execute("SELECT COUNT(*) FROM empresa").fetchone()[0] == 1
    assert con.execute("SELECT COUNT(*) FROM meta").fetchone()[0] == 1
