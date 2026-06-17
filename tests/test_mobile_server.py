import base64
import io
import json
import threading
import urllib.error
import urllib.request

import pytest
from PIL import Image

from clickos import db, mobile_server, repositories as repo


def _jpeg():
    buf = io.BytesIO()
    Image.new("RGB", (1200, 900), (20, 120, 40)).save(buf, "JPEG")
    return buf.getvalue()


def _parar_servidor():
    s = mobile_server._SERVER
    if s is not None:
        try:
            s.shutdown()
            s.server_close()
        except Exception:
            pass
    mobile_server._SERVER = None
    mobile_server.PORTA = None


@pytest.fixture
def servidor(tmp_path):
    caminho = tmp_path / "srv.db"
    _parar_servidor()  # encerra servidor vazado de outro teste (evita colisão de porta no Windows)
    mobile_server._SESSOES.clear()
    mobile_server._TOKENS.clear()
    porta, ip = mobile_server.iniciar(con_factory=lambda: db.connect(caminho))
    assert porta, "servidor não subiu"
    con = db.connect(caminho)
    c = repo.clientes.create(con, {"nome": "João"})
    osd = repo.documentos.create(con, {"tipo": "os", "data_abertura": "2026-06-15",
                                       "cliente_id": c["id"], "km_entrada": "1", "itens": []})
    yield {"porta": porta, "con": con, "doc_id": osd["id"], "numero": osd["numero"]}
    _parar_servidor()


def _get(url):
    return urllib.request.urlopen(url, timeout=5)


def test_pagina_e_upload(servidor):
    porta, doc_id = servidor["porta"], servidor["doc_id"]
    tok = mobile_server.criar_token(doc_id, usuario_id=1)
    base = f"http://127.0.0.1:{porta}/m/{tok}"

    pg = _get(base).read().decode()
    assert "capture=" in pg and servidor["numero"] in pg

    req = urllib.request.Request(base + "/foto",
                                 data=json.dumps({"b64": base64.b64encode(_jpeg()).decode(), "mime": "image/jpeg"}).encode(),
                                 headers={"Content-Type": "application/json"})
    fid = json.loads(urllib.request.urlopen(req, timeout=5).read().decode())["id"]
    assert fid

    metas = json.loads(_get(base + "/fotos").read().decode())
    assert len(metas) == 1 and metas[0]["origem"] == "celular"

    img = _get(base + f"/img/{fid}")
    assert img.status == 200 and img.headers.get("Content-Type") == "image/jpeg"
    # gravou no banco do servidor
    assert repo.fotos.doc_de(servidor["con"], fid) == doc_id


def test_uploads_concorrentes(servidor):
    # 4 celulares enviando ao mesmo tempo: o processamento Pillow ocorre fora do _DB_LOCK,
    # mas todas as gravações devem persistir sem corromper (thread-safety do insert sob lock).
    porta, doc_id = servidor["porta"], servidor["doc_id"]
    tok = mobile_server.criar_token(doc_id, usuario_id=1)
    base = f"http://127.0.0.1:{porta}/m/{tok}"
    corpo = json.dumps({"b64": base64.b64encode(_jpeg()).decode(), "mime": "image/jpeg"}).encode()
    erros = []

    def enviar():
        try:
            req = urllib.request.Request(base + "/foto", data=corpo, headers={"Content-Type": "application/json"})
            assert json.loads(urllib.request.urlopen(req, timeout=10).read().decode())["id"]
        except Exception as ex:  # noqa: BLE001
            erros.append(ex)

    ts = [threading.Thread(target=enviar) for _ in range(4)]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
    assert not erros, erros
    assert len(repo.fotos.list_meta(servidor["con"], doc_id)) == 4


def test_token_invalido_e_expirado(servidor):
    porta = servidor["porta"]
    with pytest.raises(urllib.error.HTTPError) as e:
        _get(f"http://127.0.0.1:{porta}/m/naoexiste")
    assert e.value.code == 403

    tok = mobile_server.criar_token(servidor["doc_id"], ttl=-1)  # já expirado
    with pytest.raises(urllib.error.HTTPError) as e2:
        _get(f"http://127.0.0.1:{porta}/m/{tok}")
    assert e2.value.code == 403
