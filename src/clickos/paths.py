"""Localização de dados (gravável) e de assets empacotados (PyInstaller)."""
import os
import sys
from pathlib import Path

APP_NAME = "ClickOS"


def data_dir() -> Path:
    """Pasta gravável dos dados.
    - Empacotado (exe): a MESMA pasta do executável — o app é portátil, o banco fica ao lado dele.
    - Desenvolvimento: %APPDATA%\\ClickOS."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    base = os.environ.get("APPDATA") or str(Path.home())
    d = Path(base) / APP_NAME
    d.mkdir(parents=True, exist_ok=True)
    return d


def backups_dir() -> Path:
    d = data_dir() / "backups"
    d.mkdir(parents=True, exist_ok=True)
    return d


def db_path() -> Path:
    return data_dir() / "clickos.db"


def _bundle_dir() -> Path:
    """Raiz dos recursos: _MEIPASS quando empacotado; senão a pasta do pacote."""
    meipass = getattr(sys, "_MEIPASS", None)
    if meipass:
        return Path(meipass)
    return Path(__file__).resolve().parent


def asset(*parts) -> Path:
    """Resolve um recurso (web/templates/assets) em dev e empacotado."""
    base = _bundle_dir()
    direct = base.joinpath(*parts)
    if direct.exists():
        return direct
    # no bundle os dados ficam sob 'clickos/<...>'
    return base.joinpath("clickos", *parts)
