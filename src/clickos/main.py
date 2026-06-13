"""Ponto de entrada: inicializa o banco, cria a janela nativa (WebView2) e a API."""
import webview

from . import db, paths
from .api import Api


def run():
    con = db.connect(paths.db_path())
    api = Api(con)
    index = str(paths.asset("web", "index.html"))
    window = webview.create_window(
        "ClickOS — Gestão de Ordens",
        url=index,
        js_api=api,
        width=1280,
        height=820,
        min_size=(1024, 680),
    )
    api.window = window  # necessário para os diálogos nativos (logo/backup/restore)
    webview.start()


if __name__ == "__main__":
    run()
