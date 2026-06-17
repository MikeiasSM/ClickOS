"""Servidor HTTP embarcado (stdlib) para captura de fotos pelo celular na rede local.

O desktop gera um token por O.S. (escopo de 1 documento, expiry); o celular abre
http://<ip-lan>:<porta>/m/<token> (sem login) e envia fotos pela câmera. Usa uma
conexão SQLite PRÓPRIA (separada da conexão do bridge pywebview).
"""
import base64
import json
import secrets
import socket
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from . import audit
from . import repositories as repo

# ---- estado de módulo (compartilhado entre a thread do bridge e a do servidor) ----
PORTA = None
IP = None
_SERVER = None
_TOKENS = {}                 # token -> {"doc_id": int, "exp": epoch, "uid": int|None}
_LOCK = threading.Lock()     # protege _TOKENS
_DB_LOCK = threading.Lock()  # serializa o acesso à conexão do servidor entre requisições
TTL = 12 * 3600
PORTAS = [8732, 8733, 8734, 8080, 0]  # 0 = porta efêmera do SO como último recurso


# ---- tokens ----
def criar_token(doc_id, usuario_id=None, ttl=TTL):
    tok = secrets.token_urlsafe(16)
    with _LOCK:
        _TOKENS[tok] = {"doc_id": int(doc_id), "exp": time.time() + ttl, "uid": usuario_id}
    return tok


def _resolver(tok):
    with _LOCK:
        e = _TOKENS.get(tok)
        if not e:
            return None
        if e["exp"] < time.time():
            _TOKENS.pop(tok, None)
            return None
        return dict(e)


def disponivel():
    return _SERVER is not None and PORTA is not None


def url_para(tok):
    return f"http://{IP}:{PORTA}/m/{tok}"


# ---- rede ----
def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))  # não envia pacote; só escolhe a interface de saída
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


# ---- página mobile (auto-contida, inline) ----
_PAGINA = r"""<!DOCTYPE html><html lang="pt-br"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>Fotos · __NUMERO__</title>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#0f172a;color:#e2e8f0}
header{padding:16px;background:#1e293b;position:sticky;top:0}
header h1{margin:0;font-size:17px}
header p{margin:3px 0 0;font-size:13px;color:#94a3b8}
.wrap{padding:16px;max-width:560px;margin:0 auto}
.cap{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:18px;border:0;border-radius:14px;
  background:#2563eb;color:#fff;font-size:18px;font-weight:700;cursor:pointer}
.cap:active{background:#1d4ed8}
.cap svg{width:26px;height:26px}
.status{text-align:center;color:#94a3b8;font-size:13px;margin:14px 0 4px;min-height:18px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
.grid img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;background:#1e293b}
.vazio{color:#64748b;text-align:center;font-size:13px;padding:24px 0}
</style></head><body>
<header><h1>Fotos da O.S.</h1><p>__NUMERO__ — tire as fotos pela câmera do celular</p></header>
<div class="wrap">
  <button class="cap" id="cap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Tirar foto</button>
  <input id="f" type="file" accept="image/*" capture="environment" style="display:none">
  <div class="status" id="st"></div>
  <div class="grid" id="g"></div>
  <div class="vazio" id="vz" style="display:none">Nenhuma foto ainda. Toque em “Tirar foto”.</div>
</div>
<script>
const TOKEN="__TOKEN__", base="/m/"+TOKEN;
const cap=document.getElementById("cap"), f=document.getElementById("f"),
      st=document.getElementById("st"), g=document.getElementById("g"), vz=document.getElementById("vz");
cap.onclick=()=>f.click();
async function carregar(){
  try{
    const r=await fetch(base+"/fotos"); const fotos=await r.json();
    g.innerHTML=fotos.map(x=>`<img src="${base}/thumb/${x.id}?t=${Date.now()}">`).join("");
    vz.style.display=fotos.length?"none":"";
  }catch(e){}
}
f.onchange=async()=>{
  const file=f.files&&f.files[0]; if(!file) return;
  st.textContent="Processando…";
  try{
    let w,h,draw;
    if(window.createImageBitmap){ const bmp=await createImageBitmap(file); w=bmp.width; h=bmp.height; draw=bmp; }
    else { draw=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=URL.createObjectURL(file);}); w=draw.naturalWidth; h=draw.naturalHeight; }
    const s=Math.min(1, 1600/Math.max(w,h));
    const cv=document.createElement("canvas"); cv.width=Math.round(w*s); cv.height=Math.round(h*s);
    cv.getContext("2d").drawImage(draw,0,0,cv.width,cv.height);
    const b64=cv.toDataURL("image/jpeg",0.8).split(",",2)[1];
    st.textContent="Enviando…";
    const resp=await fetch(base+"/foto",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({b64:b64,mime:"image/jpeg"})});
    st.textContent=resp.ok?"Foto enviada ✓":"Falha ao enviar";
  }catch(e){ st.textContent="Erro: "+(e.message||e); }
  f.value=""; carregar();
};
carregar();
</script></body></html>"""


# ---- handler ----
class _Handler(BaseHTTPRequestHandler):
    con = None  # conexão do servidor (injetada em iniciar)

    def log_message(self, *a):  # silencia o log no stderr
        pass

    def _send(self, code, body=b"", mime="text/plain; charset=utf-8", no_store=False):
        self.send_response(code)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        if no_store:
            self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if body:
            self.wfile.write(body)

    def _json(self, obj, code=200):
        self._send(code, json.dumps(obj).encode("utf-8"), "application/json; charset=utf-8")

    def _partes(self):
        path = self.path.split("?", 1)[0]
        return [p for p in path.split("/") if p != ""]

    def do_GET(self):
        try:
            ps = self._partes()
            if not ps or ps[0] != "m" or len(ps) < 2:
                return self._send(404, b"nao encontrado")
            tok = ps[1]
            e = _resolver(tok)
            if e is None:
                return self._send(403, "Link expirado ou inválido.".encode("utf-8"))
            sub = ps[2] if len(ps) > 2 else ""
            if sub == "":  # página mobile
                numero = "—"
                with _DB_LOCK:
                    r = self.con.execute("SELECT numero FROM documentos WHERE id=?", (e["doc_id"],)).fetchone()
                if r:
                    numero = r["numero"]
                html = _PAGINA.replace("__TOKEN__", tok).replace("__NUMERO__", _esc(numero))
                return self._send(200, html.encode("utf-8"), "text/html; charset=utf-8")
            if sub == "fotos":
                with _DB_LOCK:
                    metas = repo.fotos.list_meta(self.con, e["doc_id"])
                return self._json(metas)
            if sub in ("thumb", "img") and len(ps) > 3 and ps[3].isdigit():
                fid = int(ps[3])
                with _DB_LOCK:
                    if repo.fotos.doc_de(self.con, fid) != e["doc_id"]:
                        return self._send(404, b"nao encontrado")
                    if sub == "thumb":
                        data, mime = repo.fotos.thumb(self.con, fid), "image/jpeg"
                    else:
                        data, mime = repo.fotos.full(self.con, fid)
                if not data:
                    return self._send(404, b"nao encontrado")
                return self._send(200, bytes(data), mime, no_store=True)
            return self._send(404, b"nao encontrado")
        except Exception as ex:
            self._send(500, str(ex).encode("utf-8"))

    def do_POST(self):
        try:
            ps = self._partes()
            if len(ps) < 3 or ps[0] != "m" or ps[2] != "foto":
                return self._send(404, b"nao encontrado")
            e = _resolver(ps[1])
            if e is None:
                return self._send(403, "Link expirado ou inválido.".encode("utf-8"))
            length = int(self.headers.get("Content-Length", 0) or 0)
            if length <= 0 or length > 25 * 1024 * 1024:
                return self._send(400, b"corpo invalido")
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            b64 = (data.get("b64") or "").split(",", 1)[-1]
            raw = base64.b64decode(b64)
            with _DB_LOCK:
                fid = repo.fotos.add(self.con, e["doc_id"], raw, origem="celular", usuario_id=e.get("uid"))
                try:
                    audit.registrar(self.con, {"id": e.get("uid"), "login": None}, "criar", "foto", fid,
                                    "Foto anexada pelo celular", {"documento_id": e["doc_id"], "origem": "celular"})
                except Exception:
                    pass
            return self._json({"id": fid})
        except Exception as ex:
            self._send(500, str(ex).encode("utf-8"))


def _esc(s):
    return (str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


# ---- bootstrap ----
def iniciar(con_factory, host="0.0.0.0"):
    """Sobe o servidor numa daemon thread. Retorna (porta, ip) ou (None, None) se falhar."""
    global PORTA, IP, _SERVER
    if _SERVER is not None:
        return PORTA, IP
    _Handler.con = con_factory()  # conexão própria do servidor
    httpd = None
    for p in PORTAS:
        try:
            httpd = ThreadingHTTPServer((host, p), _Handler)
            break
        except OSError:
            continue
    if httpd is None:
        return None, None
    _SERVER = httpd
    PORTA = httpd.server_address[1]
    IP = lan_ip()
    threading.Thread(target=httpd.serve_forever, name="clickos-mobile", daemon=True).start()
    return PORTA, IP
