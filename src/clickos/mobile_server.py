"""Servidor HTTP embarcado (stdlib) para acesso pelo celular na rede local.

Dois canais, ambos na mesma conexão SQLite PRÓPRIA (separada da conexão do bridge pywebview):

1. Captura de fotos por O.S. SEM login: o desktop gera um token por O.S. (escopo de 1
   documento, expiry) e o celular abre http://<ip>:<porta>/m/<token>.
2. App essencial COM login: http://<ip>:<porta>/app/ — SPA enxuta (consulta de O.S.,
   fotos e mudança de status) com sessão por aparelho (cookie) e RBAC por requisição.
"""
import base64
import json
import secrets
import socket
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from . import audit
from . import db
from . import paths
from . import repositories as repo
from . import services

# ---- estado de módulo (compartilhado entre a thread do bridge e a do servidor) ----
PORTA = None
IP = None
_SERVER = None
_TOKENS = {}                 # token de foto -> {"doc_id": int, "exp": epoch, "uid": int|None}
_SESSOES = {}                # sid -> {"uid","login","is_suporte","modulos":set,"exp"}
_LOCK = threading.Lock()     # protege _TOKENS e _SESSOES
_DB_LOCK = threading.Lock()  # serializa o acesso à conexão do servidor entre requisições
TTL = 12 * 3600
SESSAO_TTL = 8 * 3600
PORTAS = [8732, 8733, 8734, 8080, 0]  # 0 = porta efêmera do SO como último recurso
_FALHAS = {}                  # (login, ip) -> {"n": tentativas, "ate": epoch de desbloqueio}
LOGIN_MAX_FALHAS = 5
LOGIN_BLOQUEIO = 300          # segundos de bloqueio após exceder as tentativas

_MIME = {".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
         ".css": "text/css; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8",
         ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml",
         ".ico": "image/x-icon"}
_FLUXO = {"Aberta": ["Em Execução"], "Em Execução": ["Concluída"],
          "Concluída": ["Faturada"], "Faturada": [], "Cancelada": []}


# ---- tokens de foto (sem login) ----
def criar_token(doc_id, usuario_id=None, ttl=TTL):
    tok = secrets.token_urlsafe(16)
    with _LOCK:
        _purgar_expirados()
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


# ---- sessões do app (com login) ----
def _purgar_expirados():
    """Remove sessões e tokens vencidos. Assume que _LOCK já está adquirido."""
    agora = time.time()
    for sid in [k for k, v in _SESSOES.items() if v["exp"] < agora]:
        _SESSOES.pop(sid, None)
    for tok in [k for k, v in _TOKENS.items() if v["exp"] < agora]:
        _TOKENS.pop(tok, None)


def _criar_sessao(user, modulos):
    sid = secrets.token_urlsafe(24)
    with _LOCK:
        _purgar_expirados()
        _SESSOES[sid] = {"uid": user["id"], "login": user["login"], "is_suporte": bool(user["is_suporte"]),
                         "modulos": set(modulos), "exp": time.time() + SESSAO_TTL}
    return sid


def _sessao_por_sid(sid):
    if not sid:
        return None
    with _LOCK:
        s = _SESSOES.get(sid)
        if not s:
            return None
        if s["exp"] < time.time():
            _SESSOES.pop(sid, None)
            return None
        return s


def _remover_sessao(sid):
    with _LOCK:
        _SESSOES.pop(sid, None)


def derrubar_sessoes_de(uid):
    """Invalida todas as sessões mobile de um usuário (ao trocar/resetar senha, desativar, mudar papel)."""
    with _LOCK:
        for sid in [k for k, v in _SESSOES.items() if v["uid"] == uid]:
            _SESSOES.pop(sid, None)


# ---- proteção a brute-force no login ----
def _login_bloqueado(chave):
    with _LOCK:
        e = _FALHAS.get(chave)
        if e and e["ate"] > time.time():
            return int(e["ate"] - time.time()) + 1
    return 0


def _login_falha(chave):
    with _LOCK:
        e = _FALHAS.get(chave) or {"n": 0, "ate": 0}
        e["n"] += 1
        if e["n"] >= LOGIN_MAX_FALHAS:
            e["ate"] = time.time() + LOGIN_BLOQUEIO
            e["n"] = 0
        _FALHAS[chave] = e


def _login_ok(chave):
    with _LOCK:
        _FALHAS.pop(chave, None)


def _ler_cookies(raw):
    out = {}
    for parte in (raw or "").split(";"):
        if "=" in parte:
            k, v = parte.split("=", 1)
            out[k.strip()] = v.strip()
    return out


def disponivel():
    return _SERVER is not None and PORTA is not None


def url_para(tok):
    return f"http://{IP}:{PORTA}/m/{tok}"


def app_url():
    return f"http://{IP}:{PORTA}/app/"


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


# ---- payloads do app ----
def _os_resumo(d):
    return {"id": d["id"], "numero": d["numero"], "status": d["status"],
            "cliente": d.get("cliente_nome"), "placa": d.get("veiculo_placa"),
            "total": d.get("total"), "data_abertura": d.get("data_abertura")}


def _os_detalhe(d, fotos, sess):
    pode_fat = sess["is_suporte"] or "faturar" in sess["modulos"]
    prox = [st for st in _FLUXO.get(d["status"], []) if st != "Faturada" or pode_fat]
    return {"id": d["id"], "numero": d["numero"], "status": d["status"],
            "cliente": d.get("cliente_nome"), "veiculo_marca": d.get("veiculo_marca"),
            "veiculo_modelo": d.get("veiculo_modelo"), "placa": d.get("veiculo_placa"),
            "km_entrada": d.get("km_entrada"), "responsavel": d.get("usuario_nome"),
            "total": d.get("total"),
            "itens": [{"descricao": i.get("descricao"), "quantidade": i.get("quantidade"),
                       "valor_liquido": i.get("valor_liquido")} for i in d.get("itens", [])],
            "fotos": [{"id": f["id"]} for f in fotos],
            "proximos_status": prox, "pode_faturar": pode_fat,
            "pagamento": {"forma": d.get("forma_pagamento"), "valor_pago": d.get("valor_pago"),
                          "parcelas": d.get("parcelas"), "obs": d.get("obs_pagamento"),
                          "faturado_em": d.get("faturado_em")}}


# ---- página de captura de fotos por token (sem login) ----
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

    def _send(self, code, body=b"", mime="text/plain; charset=utf-8", no_store=False, extra=None):
        self.send_response(code)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        if no_store:
            self.send_header("Cache-Control", "no-store")
        for k, v in (extra or []):
            self.send_header(k, v)
        self.end_headers()
        if body:
            self.wfile.write(body)

    def _json(self, obj, code=200, extra=None):
        self._send(code, json.dumps(obj, ensure_ascii=False).encode("utf-8"),
                   "application/json; charset=utf-8", extra=extra)

    def _partes(self):
        path = self.path.split("?", 1)[0]
        return [p for p in path.split("/") if p != ""]

    def _corpo_json(self, limite=25 * 1024 * 1024):
        length = int(self.headers.get("Content-Length", 0) or 0)
        if length <= 0 or length > limite:
            return None
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            return None

    # ----- sessão -----
    def _cookie_sid(self):
        return _ler_cookies(self.headers.get("Cookie", "")).get("sid")

    def _sessao(self):
        return _sessao_por_sid(self._cookie_sid())

    def _exige(self, modulo=None):
        s = self._sessao()
        if s is None:
            self._json({"erro": "Sessão expirada. Entre novamente."}, 401)
            return None
        if modulo and not s["is_suporte"] and modulo not in s["modulos"]:
            self._json({"erro": "Você não tem permissão para esta ação."}, 403)
            return None
        return s

    # ----- estáticos do app mobile -----
    def _estatico(self, rel):
        rel = rel or ["index.html"]
        if any((p in ("", "..") or "\\" in p) for p in rel):
            return self._send(404, b"nao encontrado")
        caminho = paths.asset("web_mobile", *rel)
        try:
            if not caminho.is_file():
                return self._send(404, b"nao encontrado")
            dados = caminho.read_bytes()
        except OSError:
            return self._send(404, b"nao encontrado")
        self._send(200, dados, _MIME.get(caminho.suffix.lower(), "application/octet-stream"))

    # ----- roteamento -----
    def do_GET(self):
        try:
            ps = self._partes()
            if not ps:
                return self._send(302, b"", extra=[("Location", "/app/")])
            if ps[0] == "app":
                return self._estatico(ps[1:])
            if ps[0] == "api":
                return self._api_get(ps[1:])
            if ps[0] == "m":
                return self._foto_get(ps)
            return self._send(404, b"nao encontrado")
        except Exception:
            self._send(500, b"Erro interno.")  # não vaza detalhes internos (SQL/paths/PIL)

    def do_POST(self):
        try:
            ps = self._partes()
            if ps[:1] == ["api"]:
                return self._api_post(ps[1:])
            if len(ps) >= 3 and ps[0] == "m" and ps[2] == "foto":
                return self._foto_post(ps)
            return self._send(404, b"nao encontrado")
        except Exception:
            self._send(500, b"Erro interno.")

    # ----- API JSON (com sessão + RBAC) -----
    def _api_get(self, rota):
        if rota == ["me"]:
            s = self._sessao()
            if s is None:
                return self._json({"erro": "Sessão expirada."}, 401)
            mods = list(db.MODULO_KEYS) if s["is_suporte"] else sorted(s["modulos"])
            return self._json({"login": s["login"], "is_suporte": s["is_suporte"], "modulos": mods,
                               "formas_pagamento": db.FORMAS_PAGAMENTO})
        if rota == ["os"]:
            s = self._exige("os")
            if s is None:
                return
            q = parse_qs(urlparse(self.path).query)
            status = (q.get("status") or [None])[0]
            termo = (q.get("q") or [None])[0]
            with _DB_LOCK:
                docs = repo.documentos.list(self.con, tipo="os", status=status or None, q=termo or None)
            return self._json([_os_resumo(d) for d in docs])
        if len(rota) == 2 and rota[0] == "os" and rota[1].isdigit():
            s = self._exige("os")
            if s is None:
                return
            oid = int(rota[1])
            with _DB_LOCK:
                d = repo.documentos.get(self.con, oid)
                fotos = repo.fotos.list_meta(self.con, oid) if d else []
            if not d or d.get("tipo") != "os":
                return self._json({"erro": "O.S. não encontrada."}, 404)
            return self._json(_os_detalhe(d, fotos, s))
        if len(rota) == 3 and rota[0] == "os" and rota[1].isdigit() and rota[2] == "fotos":
            s = self._exige("os")
            if s is None:
                return
            oid = int(rota[1])
            with _DB_LOCK:
                d = repo.documentos.get(self.con, oid)
                metas = repo.fotos.list_meta(self.con, oid) if (d and d.get("tipo") == "os") else None
            if metas is None:
                return self._json({"erro": "O.S. não encontrada."}, 404)
            return self._json(metas)
        if len(rota) == 3 and rota[0] == "foto" and rota[1].isdigit() and rota[2] in ("thumb", "full"):
            s = self._exige("os")
            if s is None:
                return
            fid = int(rota[1])
            with _DB_LOCK:
                if repo.fotos.doc_de(self.con, fid) is None:
                    return self._send(404, b"nao encontrado")
                if rota[2] == "thumb":
                    data, mime = repo.fotos.thumb(self.con, fid), "image/jpeg"
                else:
                    data, mime = repo.fotos.full(self.con, fid)
            if not data:
                return self._send(404, b"nao encontrado")
            return self._send(200, bytes(data), mime, no_store=True)
        return self._json({"erro": "nao encontrado"}, 404)

    def _api_post(self, rota):
        if rota == ["login"]:
            body = self._corpo_json(limite=64 * 1024) or {}
            chave = ((body.get("login") or "").strip().upper(), self.client_address[0])
            espera = _login_bloqueado(chave)
            if espera:
                return self._json({"erro": f"Muitas tentativas. Aguarde {espera}s e tente novamente."}, 429)
            with _DB_LOCK:
                user = repo.usuarios.autenticar(self.con, body.get("login"), body.get("senha"))
                modulos = repo.usuarios.permissoes(self.con, user["id"], user["is_suporte"]) if user else []
            if not user:
                _login_falha(chave)
                try:
                    with _DB_LOCK:
                        audit.registrar(self.con, {"id": None, "login": chave[0] or None}, "login_falha",
                                        "usuario", None, f"Login malsucedido pelo celular: {chave[0] or '(vazio)'}")
                except Exception:
                    pass
                return self._json({"erro": "Login ou senha inválidos."}, 401)
            _login_ok(chave)
            if user.get("must_change"):  # senha provisória: trocar no computador antes de usar o celular
                return self._json({"erro": "Sua senha é provisória. Troque-a no computador antes de acessar pelo celular."}, 403)
            sid = _criar_sessao(user, modulos)
            try:
                with _DB_LOCK:
                    audit.registrar(self.con, {"id": user["id"], "login": user["login"]},
                                    "login", "usuario", user["id"], f"Login pelo celular: {user['login']}")
            except Exception:
                pass
            cookie = f"sid={sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age={SESSAO_TTL}"
            mods = list(db.MODULO_KEYS) if user["is_suporte"] else modulos
            return self._json({"login": user["login"], "nome": user.get("nome"),
                               "modulos": mods, "is_suporte": user["is_suporte"],
                               "formas_pagamento": db.FORMAS_PAGAMENTO},
                              extra=[("Set-Cookie", cookie)])
        if rota == ["logout"]:
            sid = self._cookie_sid()
            if sid:
                _remover_sessao(sid)
            return self._json({"ok": True}, extra=[("Set-Cookie", "sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0")])
        if len(rota) == 3 and rota[0] == "os" and rota[1].isdigit() and rota[2] == "status":
            s = self._exige("os")
            if s is None:
                return
            body = self._corpo_json(limite=64 * 1024) or {}
            novo, oid = body.get("status"), int(rota[1])
            pode_fat = s["is_suporte"] or "faturar" in s["modulos"]
            if novo not in db.STATUS_OS:  # só status válidos de O.S.
                return self._json({"erro": "Status inválido."}, 400)
            if novo == "Faturada" and not pode_fat:
                return self._json({"erro": "Você não tem permissão para faturar."}, 403)
            try:
                with _DB_LOCK:
                    antes = self.con.execute("SELECT status FROM documentos WHERE id=? AND tipo='os'", (oid,)).fetchone()
                    if antes is None:
                        return self._json({"erro": "O.S. não encontrada."}, 404)
                    permitidos = [st for st in _FLUXO.get(antes["status"], []) if st != "Faturada" or pode_fat]
                    if novo not in permitidos:  # respeita o fluxo apresentado no app
                        return self._json({"erro": "Esta mudança de status não é permitida pelo app."}, 400)
                    repo.documentos.set_status(self.con, oid, novo)
                    try:
                        audit.registrar(self.con, {"id": s["uid"], "login": s["login"]}, "status", "documento", oid,
                                        f"O.S.: {antes['status']} → {novo} (celular)", {"de": antes["status"], "para": novo})
                    except Exception:
                        pass
            except ValueError as ve:
                return self._json({"erro": str(ve)}, 400)
            return self._json({"ok": True})
        if len(rota) == 3 and rota[0] == "os" and rota[1].isdigit() and rota[2] == "faturar":
            s = self._exige("faturar")
            if s is None:
                return
            body = self._corpo_json(limite=64 * 1024) or {}
            oid = int(rota[1])
            try:
                with _DB_LOCK:
                    d = self.con.execute("SELECT status FROM documentos WHERE id=? AND tipo='os'", (oid,)).fetchone()
                    if d is None:
                        return self._json({"erro": "O.S. não encontrada."}, 404)
                    if "Faturada" not in _FLUXO.get(d["status"], []):
                        return self._json({"erro": "A O.S. precisa estar Concluída para faturar."}, 400)
                    repo.documentos.faturar(self.con, oid, body)
                    try:
                        audit.registrar(self.con, {"id": s["uid"], "login": s["login"]}, "status", "documento", oid,
                                        f"O.S. faturada pelo celular ({body.get('forma_pagamento', '')})",
                                        {"de": d["status"], "para": "Faturada", "forma_pagamento": body.get("forma_pagamento")})
                    except Exception:
                        pass
            except ValueError as ve:
                return self._json({"erro": str(ve)}, 400)
            return self._json({"ok": True})
        if len(rota) == 3 and rota[0] == "os" and rota[1].isdigit() and rota[2] == "foto":
            s = self._exige("os")
            if s is None:
                return
            body = self._corpo_json()
            if body is None:
                return self._json({"erro": "corpo inválido"}, 400)
            oid = int(rota[1])
            with _DB_LOCK:
                existe = self.con.execute("SELECT 1 FROM documentos WHERE id=? AND tipo='os'", (oid,)).fetchone()
            if not existe:
                return self._json({"erro": "O.S. não encontrada."}, 404)
            try:
                raw = base64.b64decode((body.get("b64") or "").split(",", 1)[-1])
                full, thumb = services.processar_foto(raw)  # fora do _DB_LOCK
            except Exception:  # base64 inválido, não-imagem (UnidentifiedImageError) ou bomba
                return self._json({"erro": "Imagem inválida."}, 400)
            with _DB_LOCK:
                fid = repo.fotos.add_processado(self.con, oid, full, thumb, origem="celular", usuario_id=s["uid"])
                try:
                    audit.registrar(self.con, {"id": s["uid"], "login": s["login"]}, "criar", "foto", fid,
                                    "Foto anexada pelo celular (app)", {"documento_id": oid, "origem": "celular"})
                except Exception:
                    pass
            return self._json({"id": fid})
        return self._json({"erro": "nao encontrado"}, 404)

    # ----- captura de fotos por token (sem login) -----
    def _foto_get(self, ps):
        if len(ps) < 2:
            return self._send(404, b"nao encontrado")
        tok = ps[1]
        e = _resolver(tok)
        if e is None:
            return self._send(403, "Link expirado ou inválido.".encode("utf-8"))
        sub = ps[2] if len(ps) > 2 else ""
        if sub == "":
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

    def _foto_post(self, ps):
        e = _resolver(ps[1])
        if e is None:
            return self._send(403, "Link expirado ou inválido.".encode("utf-8"))
        body = self._corpo_json()
        if body is None:
            return self._send(400, b"corpo invalido")
        try:
            raw = base64.b64decode((body.get("b64") or "").split(",", 1)[-1])
            full, thumb = services.processar_foto(raw)  # CPU-bound: fora do _DB_LOCK
        except Exception:  # base64 inválido, não-imagem ou bomba de descompressão
            return self._json({"erro": "Imagem inválida."}, 400)
        with _DB_LOCK:
            fid = repo.fotos.add_processado(self.con, e["doc_id"], full, thumb,
                                            origem="celular", usuario_id=e.get("uid"))
            try:
                audit.registrar(self.con, {"id": e.get("uid"), "login": None}, "criar", "foto", fid,
                                "Foto anexada pelo celular", {"documento_id": e["doc_id"], "origem": "celular"})
            except Exception:
                pass
        return self._json({"id": fid})


def _esc(s):
    return (str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


class _Servidor(ThreadingHTTPServer):
    # allow_reuse_address=False: NÃO permite duplo-bind na mesma porta (no Windows o SO_REUSEADDR
    # deixaria duas instâncias do ClickOS escutarem a 8732 e embaralharem as requisições). Assim, uma
    # 2ª instância simplesmente cai na próxima porta da lista.
    allow_reuse_address = False
    daemon_threads = True


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
            httpd = _Servidor((host, p), _Handler)
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
