import base64
import io
import json
import urllib.error
import urllib.request

import pytest
from PIL import Image

from clickos import db, mobile_server, repositories as repo


def _jpeg():
    buf = io.BytesIO()
    Image.new("RGB", (1200, 900), (20, 120, 40)).save(buf, "JPEG")
    return buf.getvalue()


@pytest.fixture
def servidor(tmp_path):
    caminho = tmp_path / "srv.db"
    # reseta o estado de módulo (singleton) entre testes
    mobile_server._SERVER = None
    mobile_server.PORTA = None
    porta, ip = mobile_server.iniciar(con_factory=lambda: db.connect(caminho))
    assert porta, "servidor não subiu"
    con = db.connect(caminho)
    c = repo.clientes.create(con, {"nome": "João"})
    osd = repo.documentos.create(con, {"tipo": "os", "data_abertura": "2026-06-15",
                                       "cliente_id": c["id"], "km_entrada": "1", "itens": []})
    return {"porta": porta, "con": con, "doc_id": osd["id"], "numero": osd["numero"]}


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


def test_token_invalido_e_expirado(servidor):
    porta = servidor["porta"]
    with pytest.raises(urllib.error.HTTPError) as e:
        _get(f"http://127.0.0.1:{porta}/m/naoexiste")
    assert e.value.code == 403

    tok = mobile_server.criar_token(servidor["doc_id"], ttl=-1)  # já expirado
    with pytest.raises(urllib.error.HTTPError) as e2:
        _get(f"http://127.0.0.1:{porta}/m/{tok}")
    assert e2.value.code == 403
