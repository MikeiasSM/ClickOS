import io

from PIL import Image

from clickos import db, repositories as repo


def _png(w=2000, h=1500, cor=(180, 30, 30)):
    buf = io.BytesIO()
    Image.new("RGB", (w, h), cor).save(buf, "PNG")
    return buf.getvalue()


def _os(con):
    c = repo.clientes.create(con, {"nome": "João"})
    return repo.documentos.create(con, {
        "tipo": "os", "data_abertura": "2026-06-15", "cliente_id": c["id"], "km_entrada": "1", "itens": []})


def test_schema_v12_e_tabela(tmp_path):
    con = db.connect(tmp_path / "novo.db")
    assert con.execute("SELECT schema_version FROM meta").fetchone()[0] == 12
    assert con.execute("SELECT name FROM sqlite_master WHERE name='documento_fotos'").fetchone()
    assert con.execute("PRAGMA journal_mode").fetchone()[0].lower() == "wal"


def test_migracao_de_v11(tmp_path):
    con = db.connect(tmp_path / "antigo.db")
    con.execute("UPDATE meta SET schema_version = 11")
    con.commit()
    con.close()
    con2 = db.connect(tmp_path / "antigo.db")  # reabrir dispara a migração
    assert con2.execute("SELECT schema_version FROM meta").fetchone()[0] == 12


def test_add_redimensiona_e_gera_thumb(tmp_path):
    con = db.connect(tmp_path / "t.db")
    osd = _os(con)
    fid = repo.fotos.add(con, osd["id"], _png(), origem="celular", usuario_id=7)
    full, mime = repo.fotos.full(con, fid)
    thumb = repo.fotos.thumb(con, fid)
    assert mime == "image/jpeg"
    assert full[:3] == b"\xff\xd8\xff" and thumb[:3] == b"\xff\xd8\xff"  # ambos JPEG
    assert max(Image.open(io.BytesIO(full)).size) <= 1600
    assert max(Image.open(io.BytesIO(thumb)).size) <= 320
    metas = repo.fotos.list_meta(con, osd["id"])
    assert len(metas) == 1 and metas[0]["origem"] == "celular"
    assert repo.fotos.doc_de(con, fid) == osd["id"]


def test_delete_e_cascade(tmp_path):
    con = db.connect(tmp_path / "t.db")
    osd = _os(con)
    fid = repo.fotos.add(con, osd["id"], _png())
    repo.fotos.delete(con, fid)
    assert repo.fotos.list_meta(con, osd["id"]) == []
    # ON DELETE CASCADE: apagar o documento remove as fotos
    f2 = repo.fotos.add(con, osd["id"], _png())
    assert f2
    repo.documentos.delete(con, osd["id"])
    assert con.execute("SELECT COUNT(*) FROM documento_fotos WHERE documento_id=?", (osd["id"],)).fetchone()[0] == 0
