"""Ponto de entrada: inicializa o banco, cria a janela nativa (WebView2) e a API."""
import webview

from . import db, mobile_server, paths
from .api import Api


def _suppress_download_flyout():
    """Esconde o flyout/diálogo de download do WebView2 ao salvar PDF (Imprimir →
    Salvar como PDF). Sem isso, ao gerar o PDF aparece o popup "Downloads".
    Define args.Handled = True no evento DownloadStarting (o download prossegue
    normalmente, apenas sem a UI padrão)."""
    try:
        from webview.platforms.edgechromium import EdgeChrome

        def _no_flyout(self, sender, args):
            try:
                args.Handled = True
            except Exception:
                pass

        EdgeChrome.on_download_starting = _no_flyout
    except Exception:
        pass


def run():
    _suppress_download_flyout()
    con = db.connect(paths.db_path())
    api = Api(con)
    # servidor HTTP para captura de fotos pelo celular na rede local (conexão própria, daemon thread).
    # Degrada graciosamente: se não subir, só o "Capturar pelo celular" fica indisponível.
    try:
        mobile_server.iniciar(con_factory=lambda: db.connect(paths.db_path()))
    except Exception:
        pass
    index = str(paths.asset("web", "index.html"))
    webview.create_window(
        "ClickOS — Ordens de Serviço",
        url=index,
        js_api=api,
        width=1280,
        height=820,
        min_size=(1024, 680),
        maximized=True,  # abre maximizado por padrão
    )
    # NÃO atribuir a janela em api.* — o pywebview quebra ao expor a API se
    # recursar na janela. Os diálogos usam webview.windows[0] sob demanda.
    # Downloads são permitidos (necessário para salvar o PDF da impressão).
    webview.settings["ALLOW_DOWNLOADS"] = True
    webview.start()


if __name__ == "__main__":
    run()
