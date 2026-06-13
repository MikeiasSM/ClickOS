"""Backup e restauração do banco SQLite (cópia de arquivo)."""
import shutil
from pathlib import Path


def backup(db_path, dest_dir, stamp: str) -> str:
    """Copia o banco para dest_dir/clickos-<stamp>.db. Retorna o caminho criado."""
    dest = Path(dest_dir)
    dest.mkdir(parents=True, exist_ok=True)
    target = dest / f"clickos-{stamp}.db"
    shutil.copy2(str(db_path), str(target))
    return str(target)


def restore(src, db_path) -> str:
    """Substitui o banco atual pelo arquivo de backup informado."""
    shutil.copy2(str(src), str(db_path))
    return str(db_path)
