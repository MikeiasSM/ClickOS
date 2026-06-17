import base64
import http.cookiejar
import io
import json
import urllib.error
import urllib.request

import pytest
from PIL import Image

from clickos import db, mobile_server, repositories as repo, services
from clickos.api import Api


def _jpeg():
    buf = io.BytesIO()
    Image.new("RGB", (800, 600), (10, 80, 160)).save(buf, "JPEG")
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
def srv(tmp_path):
    caminho = tmp_path / "app.db"
    _parar_servidor()  # encerra qualquer servidor vazado de outro teste (evita colisão de porta)
    mobile_server._SESSOES.clear()
    mobile_server._TOKENS.clear()
    mobile_server._FALHAS.clear()
    porta, _ip = mobile_server.iniciar(con_factory=lambda: db.connect(caminho))
    assert porta, "servidor não subiu"
    con = db.connect(caminho)
    cli = repo.clientes.create(con, {"nome": "Cliente A"})
    osd = repo.documentos.create(con, {"tipo": "os", "data_abertura": "2026-06-17", "cliente_id": cli["id"],
                                       "km_entrada": "1", "itens": [{"descricao": "Serviço", "quantidade": 1, "valor_unitario": 100}]})
    mec = con.execute("SELECT id FROM papeis WHERE nome='Mecânico'").fetchone()[0]
    repo.usuarios.create(con, {"login": "MEC", "senha": "1234", "papel_id": mec})
    yield {"porta": porta, "con": con, "os_id": osd["id"]}
    _parar_servidor()


def _cliente(porta):
    """Cliente HTTP com cookie jar (carrega a sessão entre requisições)."""
    cj = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    base = f"http://127.0.0.1:{porta}"

    def req(method, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        r = urllib.request.Request(base + path, data=data, method=method,
                                   headers=({"Content-Type": "application/json"} if data else {}))
        try:
            resp = op.open(r, timeout=5)
            raw = resp.read().decode("utf-8", "replace")
            ct = resp.headers.get("Content-Type", "")
            return resp.status, (json.loads(raw) if raw and "json" in ct else raw)
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", "replace")
            try:
                return e.code, json.loads(raw)
            except ValueError:
                return e.code, raw
    return req


def test_login_me_lista_detalhe(srv):
    req = _cliente(srv["porta"])
    assert req("GET", "/api/os")[0] == 401  # sem sessão
    st, d = req("POST", "/api/login", {"login": "MEC", "senha": "1234"})
    assert st == 200 and "os" in d["modulos"] and "faturar" not in d["modulos"]
    st, me = req("GET", "/api/me")
    assert st == 200 and set(me["modulos"]) == {"dashboard", "os"}
    st, lst = req("GET", "/api/os")
    assert st == 200 and len(lst) == 1 and lst[0]["numero"].startswith("OS-")
    st, det = req("GET", f"/api/os/{srv['os_id']}")
    assert st == 200 and det["proximos_status"] == ["Em Execução"] and det["cliente"] == "Cliente A"


def test_status_e_faturar_rbac(srv):
    req = _cliente(srv["porta"])
    req("POST", "/api/login", {"login": "MEC", "senha": "1234"})
    oid = srv["os_id"]
    assert req("POST", f"/api/os/{oid}/status", {"status": "Em Execução"})[0] == 200
    assert req("POST", f"/api/os/{oid}/status", {"status": "Concluída"})[0] == 200
    assert req("POST", f"/api/os/{oid}/status", {"status": "Faturada"})[0] == 403  # mecânico não fatura


def test_suporte_fatura(srv):
    req = _cliente(srv["porta"])
    req("POST", "/api/login", {"login": "SUPORTE", "senha": "1234567890"})
    oid = srv["os_id"]
    req("POST", f"/api/os/{oid}/status", {"status": "Em Execução"})
    req("POST", f"/api/os/{oid}/status", {"status": "Concluída"})
    assert req("POST", f"/api/os/{oid}/status", {"status": "Faturada"})[0] == 200


def test_foto_pelo_app(srv):
    req = _cliente(srv["porta"])
    req("POST", "/api/login", {"login": "MEC", "senha": "1234"})
    oid = srv["os_id"]
    b64 = base64.b64encode(_jpeg()).decode()
    st, d = req("POST", f"/api/os/{oid}/foto", {"b64": b64, "mime": "image/jpeg"})
    assert st == 200 and d["id"]
    st, fs = req("GET", f"/api/os/{oid}/fotos")
    assert st == 200 and len(fs) == 1 and fs[0]["origem"] == "celular"
    assert req("GET", f"/api/foto/{fs[0]['id']}/thumb")[0] == 200  # imagem acessível com sessão
    # sem sessão (cliente novo, sem cookie) a imagem é negada
    req2 = _cliente(srv["porta"])
    assert req2("GET", f"/api/foto/{fs[0]['id']}/thumb")[0] == 401


def test_estaticos_servidos(srv):
    req = _cliente(srv["porta"])
    st, html = req("GET", "/app/")
    assert st == 200 and "ClickOS" in html and "/app/app.js" in html
    assert req("GET", "/app/manifest.webmanifest")[0] == 200
    assert req("GET", "/app/app.js")[0] == 200


def test_usuario_sem_os_bloqueado(srv):
    con = srv["con"]
    p = repo.papeis.create(con, {"nome": "SoDash", "modulos": ["dashboard"]})
    repo.usuarios.create(con, {"login": "DASH", "senha": "1234", "papel_id": p["id"]})
    req = _cliente(srv["porta"])
    req("POST", "/api/login", {"login": "DASH", "senha": "1234"})
    assert req("GET", "/api/os")[0] == 403


# ----------------------------------------------------------------- correções da revisão (mobile)
def test_login_rate_limit(srv):
    req = _cliente(srv["porta"])
    for i in range(5):
        assert req("POST", "/api/login", {"login": "MEC", "senha": f"errada{i}"})[0] == 401
    assert req("POST", "/api/login", {"login": "MEC", "senha": "x"})[0] == 429        # bloqueado
    assert req("POST", "/api/login", {"login": "MEC", "senha": "1234"})[0] == 429     # vale até p/ a senha certa


def test_senha_provisoria_bloqueia_mobile(srv):
    con = srv["con"]
    sup = con.execute("SELECT id FROM usuarios WHERE login='SUPORTE'").fetchone()[0]
    mec = con.execute("SELECT id FROM usuarios WHERE login='MEC'").fetchone()[0]
    repo.usuarios.reset_senha(con, mec, sup, "1234567890")  # must_change=1, senha provisória
    req = _cliente(srv["porta"])
    assert req("POST", "/api/login", {"login": "MEC", "senha": services.SENHA_RESET})[0] == 403


def test_upload_nao_imagem_400(srv):
    req = _cliente(srv["porta"])
    req("POST", "/api/login", {"login": "SUPORTE", "senha": "1234567890"})
    b64 = base64.b64encode(b"isto nao e uma imagem").decode()
    st, d = req("POST", f"/api/os/{srv['os_id']}/foto", {"b64": b64, "mime": "image/jpeg"})
    assert st == 400 and d["erro"] == "Imagem inválida."


def test_fotos_exige_tipo_os(srv):
    con = srv["con"]
    cid = con.execute("SELECT cliente_id FROM documentos WHERE id=?", (srv["os_id"],)).fetchone()[0]
    orc = repo.documentos.create(con, {"tipo": "orcamento", "data_abertura": "2026-06-17", "cliente_id": cid,
                                       "itens": [{"descricao": "x", "quantidade": 1, "valor_unitario": 10}]})
    req = _cliente(srv["porta"])
    req("POST", "/api/login", {"login": "SUPORTE", "senha": "1234567890"})
    assert req("GET", f"/api/os/{orc['id']}/fotos")[0] == 404


def test_status_respeita_fluxo(srv):
    req = _cliente(srv["porta"])
    req("POST", "/api/login", {"login": "SUPORTE", "senha": "1234567890"})
    oid = srv["os_id"]  # Aberta
    assert req("POST", f"/api/os/{oid}/status", {"status": "Faturada"})[0] == 400  # pulo proibido
    assert req("POST", f"/api/os/{oid}/status", {"status": "Em Execução"})[0] == 200  # avanço válido


def test_faturar_com_pagamento(srv):
    req = _cliente(srv["porta"])
    req("POST", "/api/login", {"login": "SUPORTE", "senha": "1234567890"})
    oid = srv["os_id"]
    req("POST", f"/api/os/{oid}/status", {"status": "Em Execução"})
    req("POST", f"/api/os/{oid}/status", {"status": "Concluída"})
    assert req("POST", f"/api/os/{oid}/faturar", {})[0] == 400  # sem forma de pagamento
    st, _ = req("POST", f"/api/os/{oid}/faturar",
                {"forma_pagamento": "PIX", "valor_pago": "200", "parcelas": "1", "obs_pagamento": "à vista"})
    assert st == 200
    st, d = req("GET", f"/api/os/{oid}")
    assert d["status"] == "Faturada"
    assert d["pagamento"]["forma"] == "PIX" and d["pagamento"]["valor_pago"] == 200
    # depois de faturada não há mais transições (trava)
    assert d["proximos_status"] == []


def test_mecanico_nao_fatura_pelo_endpoint(srv):
    con = srv["con"]
    cli = con.execute("SELECT cliente_id FROM documentos WHERE id=?", (srv["os_id"],)).fetchone()[0]
    osd = repo.documentos.create(con, {"tipo": "os", "data_abertura": "2026-06-17", "cliente_id": cli,
                                       "km_entrada": "1", "itens": [{"descricao": "S", "quantidade": 1, "valor_unitario": 50}]})
    repo.documentos.set_status(con, osd["id"], "Em Execução")
    repo.documentos.set_status(con, osd["id"], "Concluída")
    req = _cliente(srv["porta"])
    req("POST", "/api/login", {"login": "MEC", "senha": "1234"})
    assert req("POST", f"/api/os/{osd['id']}/faturar", {"forma_pagamento": "PIX"})[0] == 403


def test_reset_senha_derruba_sessao_mobile(srv):
    con = srv["con"]
    req = _cliente(srv["porta"])
    assert req("POST", "/api/login", {"login": "MEC", "senha": "1234"})[0] == 200
    assert req("GET", "/api/me")[0] == 200
    api = Api(con); api.login({"login": "SUPORTE", "senha": "1234567890"})
    mec = con.execute("SELECT id FROM usuarios WHERE login='MEC'").fetchone()[0]
    assert api.reset_senha({"alvo_id": mec, "senha": "1234567890"})["ok"]
    assert req("GET", "/api/me")[0] == 401  # sessão mobile foi invalidada
