from pathlib import Path

from clickos import backup as bk, db


def test_backup_and_restore(tmp_path):
    dbp = tmp_path / "clickos.db"
    db.connect(dbp).close()
    dest = tmp_path / "backups"

    out = bk.backup(dbp, dest, "20260613-1200")
    assert Path(out).exists()
    assert out.endswith("clickos-20260613-1200.db")

    # corrompe o original e restaura
    dbp.write_bytes(b"x")
    bk.restore(out, dbp)
    con = db.connect(dbp)
    assert con.execute("SELECT COUNT(*) FROM empresa").fetchone()[0] == 1
