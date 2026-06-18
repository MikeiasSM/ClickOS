"""Geração de PDF FIEL à impressão do desktop, usando o motor do WebView2 (Chromium).

O PDF do ClickOS sempre nasce do mesmo HTML/CSS que o navegador imprime; aqui ele é
renderizado numa janela WebView2 oculta e impresso via CoreWebView2.PrintToPdfAsync —
ou seja, idêntico ao que o usuário vê ao imprimir no desktop. Deve ser chamado FORA da
thread de UI (ex.: thread do bridge pywebview ou do servidor mobile) para não travar.
"""
import os
import tempfile
import threading

import webview


def disponivel():
    """Há um WebView2 ativo (janela principal) para renderizar o PDF?"""
    return bool(webview.windows)


def _edge_da_janela(win):
    from webview.platforms.winforms import BrowserView
    bv = BrowserView.instances.get(win.uid)
    return bv.browser if bv else None


_LOCK = threading.Lock()  # serializa a geração (uma janela oculta por vez)


def gerar_pdf(html, timeout=30):
    """Renderiza `html` numa janela WebView2 oculta e devolve os bytes do PDF."""
    if not disponivel():
        raise RuntimeError("Geração de PDF indisponível (sem janela do app).")
    from System import Action, Boolean, Func, Object
    from System.Threading.Tasks import Task

    with _LOCK:
        carregou = threading.Event()
        win = webview.create_window("ClickOS PDF", html=html, hidden=True, width=900, height=1240)
        win.events.loaded += lambda *a: carregou.set()
        if not carregou.wait(timeout):
            _destruir(win)
            raise RuntimeError("Tempo esgotado ao preparar o documento.")
        edge = _edge_da_janela(win)
        if edge is None:
            _destruir(win)
            raise RuntimeError("Motor de PDF indisponível.")

        fd, caminho = tempfile.mkstemp(suffix=".pdf")
        os.close(fd)
        concluido = threading.Event()
        estado = {"ok": False, "erro": None}

        def _imprimir():
            try:
                core = edge.webview.CoreWebView2

                def _fim(t):
                    try:
                        estado["ok"] = bool(t.Result)
                    except Exception as ex:  # noqa: BLE001
                        estado["erro"] = str(ex)
                    concluido.set()

                core.PrintToPdfAsync(caminho, None).ContinueWith(Action[Task[Boolean]](_fim))
            except Exception as ex:  # noqa: BLE001
                estado["erro"] = str(ex)
                concluido.set()
            return None

        edge.webview.Invoke(Func[Object](_imprimir))
        if not concluido.wait(timeout):
            estado["erro"] = estado["erro"] or "tempo esgotado na impressão"
        _destruir(win)

        if not estado["ok"]:
            _remover(caminho)
            raise RuntimeError("Não foi possível gerar o PDF" + (f": {estado['erro']}" if estado["erro"] else "."))
        with open(caminho, "rb") as fh:
            dados = fh.read()
        _remover(caminho)
        return dados


def _destruir(win):
    try:
        win.destroy()
    except Exception:
        pass


def _remover(caminho):
    try:
        os.remove(caminho)
    except OSError:
        pass
