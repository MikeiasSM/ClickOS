"use strict";
/* App essencial do ClickOS para o celular (consulta de O.S., fotos e status).
   Conversa com o servidor embutido via /api/* usando cookie de sessão (mesmo host). */
const app = document.getElementById("app");
const $ = (s, r) => (r || document).querySelector(s);
let ME = null;

const IC = {
  wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2.7-.6-.6-2.7z"/></svg>',
  search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>',
  chev: '<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  logout: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
  camera: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
};
const ST = { "Aberta": ["b-aberta", "Aberta"], "Em Execução": ["b-exec", "Em Execução"], "Concluída": ["b-concl", "Concluída"], "Faturada": ["b-fat", "Faturada"], "Cancelada": ["b-canc", "Cancelada"] };

function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function brl(v) { return (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function badge(s) { const m = ST[s] || ["b-fat", s]; return `<span class="badge ${m[0]}">${esc(m[1])}</span>`; }
function qs(o) { const p = Object.keys(o).filter(k => o[k]).map(k => k + "=" + encodeURIComponent(o[k])); return p.length ? "?" + p.join("&") : ""; }
function toast(msg, kind) { const t = document.getElementById("toast"); const d = document.createElement("div"); d.className = "tmsg " + (kind || ""); d.textContent = msg; t.appendChild(d); setTimeout(() => d.remove(), 2600); }

async function api(method, path, body) {
  const opt = { method, headers: {}, credentials: "same-origin" };
  if (body !== undefined) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
  const r = await fetch(path, opt);
  let data = null; try { data = await r.json(); } catch (e) { /* sem corpo */ }
  if (!r.ok) { const e = new Error((data && data.erro) || ("Erro " + r.status)); e.status = r.status; throw e; }
  return data;
}

function topo(title, home) {
  return `<div class="top">${home
    ? `<h1>${esc(title)}</h1><button class="ib" id="logout" aria-label="Sair">${IC.logout}</button>`
    : `<button class="ib" id="back" aria-label="Voltar">${IC.back}</button><h1>${esc(title)}</h1>`}</div>`;
}
function bindTop() {
  const lo = $("#logout"); if (lo) lo.onclick = async () => { try { await api("POST", "/api/logout"); } catch (e) {} ME = null; viewLogin(); };
  const bk = $("#back"); if (bk) bk.onclick = () => viewLista();
}

/* ----------------------------------------------------------------- login */
function viewLogin() {
  app.innerHTML = `<div class="login">
    <div class="logo">${IC.wrench}</div>
    <h2>ClickOS</h2><p class="muted">Entre para acessar as ordens de serviço</p>
    <div class="field"><label>Usuário</label><input id="u" autocapitalize="characters" autocomplete="username" placeholder="LOGIN"></div>
    <div class="field"><label>Senha</label><input id="p" type="password" autocomplete="current-password" placeholder="Senha"></div>
    <button class="btn" id="go">Entrar</button>
    <div class="err" id="err"></div></div>`;
  const u = $("#u"), p = $("#p"), err = $("#err"), go = $("#go");
  u.addEventListener("input", () => { const c = u.selectionStart; u.value = u.value.toUpperCase(); u.setSelectionRange(c, c); });
  const entrar = async () => {
    err.textContent = ""; go.disabled = true; go.innerHTML = '<span class="spin"></span>';
    try { await api("POST", "/api/login", { login: u.value.trim(), senha: p.value }); await boot(); }
    catch (e) { err.textContent = e.status === 401 ? "Login ou senha inválidos." : e.message; go.disabled = false; go.textContent = "Entrar"; }
  };
  go.onclick = entrar;
  p.addEventListener("keydown", e => { if (e.key === "Enter") entrar(); });
}

/* ----------------------------------------------------------------- lista de O.S. */
async function viewLista() {
  if (!(ME && (ME.is_suporte || (ME.modulos || []).includes("os")))) {
    app.innerHTML = topo("ClickOS", true) + `<div class="center"><p class="muted">Seu acesso não inclui as Ordens de Serviço neste aplicativo. Fale com o administrador.</p><button class="btn ghost" id="sair">Sair</button></div>`;
    bindTop(); const s = $("#sair"); if (s) s.onclick = async () => { try { await api("POST", "/api/logout"); } catch (e) {} ME = null; viewLogin(); };
    return;
  }
  app.innerHTML = topo("Ordens de Serviço", true) + `<div class="content">
    <div class="search">${IC.search}<input id="q" placeholder="Buscar O.S., cliente, placa…" autocapitalize="characters"></div>
    <div class="chips" id="chips"></div>
    <div id="lista"><div class="center"><span class="spin"></span></div></div></div>`;
  bindTop();
  const filtros = ["Todas", "Aberta", "Em Execução", "Concluída", "Faturada"];
  let statusSel = "";
  const chips = $("#chips");
  chips.innerHTML = filtros.map((c, i) => `<button class="chip ${i === 0 ? "on" : ""}" data-s="${c === "Todas" ? "" : c}">${c}</button>`).join("");
  chips.querySelectorAll(".chip").forEach(b => b.onclick = () => {
    chips.querySelectorAll(".chip").forEach(x => x.classList.remove("on")); b.classList.add("on");
    statusSel = b.dataset.s; carregar();
  });
  let t;
  $("#q").addEventListener("input", () => { clearTimeout(t); t = setTimeout(carregar, 300); });
  async function carregar() {
    const lista = $("#lista"); lista.innerHTML = `<div class="center"><span class="spin"></span></div>`;
    try {
      const os = await api("GET", "/api/os" + qs({ status: statusSel, q: $("#q").value.trim() }));
      if (!os.length) { lista.innerHTML = `<div class="center"><p class="muted">Nenhuma O.S. encontrada.</p></div>`; return; }
      lista.innerHTML = os.map(o => `<div class="card os-card" data-id="${o.id}">
        <div class="grow"><div class="os-num">${esc(o.numero)}</div>
          <div class="os-sub">${esc(o.cliente || "—")}${o.placa ? " · " + esc(o.placa) : ""}</div></div>
        ${badge(o.status)}${IC.chev}</div>`).join("");
      lista.querySelectorAll(".os-card").forEach(c => c.onclick = () => viewDetalhe(c.dataset.id));
    } catch (e) {
      if (e.status === 401) { ME = null; return viewLogin(); }
      lista.innerHTML = `<div class="center"><p class="muted">${esc(e.message)}</p></div>`;
    }
  }
  carregar();
}

/* ----------------------------------------------------------------- detalhe da O.S. */
async function viewDetalhe(id) {
  app.innerHTML = topo("Carregando…", false) + `<div class="content"><div class="center"><span class="spin"></span></div></div>`;
  bindTop();
  let d;
  try { d = await api("GET", "/api/os/" + id); }
  catch (e) { if (e.status === 401) { ME = null; return viewLogin(); } return viewLista(); }
  const veic = [d.veiculo_marca, d.veiculo_modelo].filter(Boolean).join(" ") || "—";
  const itens = (d.itens || []).map(i => `<div class="it"><span class="grow">${esc(i.descricao || "")}${i.quantidade > 1 ? ` <span class="muted">×${i.quantidade}</span>` : ""}</span><span>${brl(i.valor_liquido)}</span></div>`).join("");
  const acts = (d.proximos_status || []).map(s => `<button class="btn" data-st="${esc(s)}">${rotuloAcao(s)}</button>`).join("");
  app.innerHTML = topo(d.numero, false) + `<div class="content">
    <div class="det-head row"><div class="grow"><div class="num">${esc(d.numero)}</div></div>${badge(d.status)}</div>
    <div class="card">
      <div class="kv"><span class="k">Cliente</span><span class="v">${esc(d.cliente || "—")}</span></div>
      <div class="kv"><span class="k">Veículo</span><span class="v">${esc(veic)}</span></div>
      <div class="kv"><span class="k">Placa</span><span class="v">${esc(d.placa || "—")}</span></div>
      <div class="kv"><span class="k">KM de entrada</span><span class="v">${esc(d.km_entrada || "—")}</span></div>
      <div class="kv"><span class="k">Responsável</span><span class="v">${esc(d.responsavel || "—")}</span></div>
    </div>
    ${itens ? `<div class="sec-t">Serviços e produtos</div><div class="card">${itens}<div class="tot"><span>Total</span><span>${brl(d.total)}</span></div></div>` : ""}
    ${pagHtml(d)}
    <div class="sec-t">Fotos</div>
    <button class="btn sec" id="foto">${IC.camera}<span>Tirar foto</span></button>
    <div class="fotos" id="fotos" style="margin-top:10px"></div>
    ${acts ? `<div class="acts">${acts}</div>` : ""}
  </div>`;
  bindTop();
  $("#foto").onclick = () => tirarFoto(id, carregarFotos);
  app.querySelectorAll("[data-st]").forEach(b => b.onclick = () =>
    b.dataset.st === "Faturada" ? abrirFaturamento(id, d.total) : mudarStatus(id, b.dataset.st));
  async function carregarFotos() {
    try {
      const fs = await api("GET", "/api/os/" + id + "/fotos");
      const g = $("#fotos");
      g.innerHTML = fs.map(f => `<img data-id="${f.id}" src="/api/foto/${f.id}/thumb">`).join("") || `<div class="muted small" style="grid-column:1/-1">Nenhuma foto ainda.</div>`;
      g.querySelectorAll("img").forEach(im => im.onclick = () => lightbox(im.dataset.id));
    } catch (e) {}
  }
  carregarFotos();
}
function rotuloAcao(s) {
  return { "Em Execução": "Iniciar execução", "Concluída": "Concluir serviço", "Faturada": "Faturar O.S.", "Aberta": "Reabrir" }[s] || ("Marcar como " + s);
}
async function mudarStatus(id, status) {
  toast("Atualizando…");
  try { await api("POST", "/api/os/" + id + "/status", { status }); toast("Status atualizado ✓", "ok"); viewDetalhe(id); }
  catch (e) { if (e.status === 401) { ME = null; return viewLogin(); } toast(e.message || "Não foi possível atualizar", "err"); }
}
function pagHtml(d) {
  const p = d.pagamento || {};
  if (d.status !== "Faturada" || !p.forma) return "";
  const troco = (p.valor_pago != null) ? Math.max(0, (p.valor_pago || 0) - (d.total || 0)) : null;
  return `<div class="sec-t">Pagamento</div><div class="card">
    <div class="kv"><span class="k">Forma</span><span class="v">${esc(p.forma)}</span></div>
    ${p.parcelas ? `<div class="kv"><span class="k">Parcelas</span><span class="v">${p.parcelas}x</span></div>` : ""}
    ${p.valor_pago != null ? `<div class="kv"><span class="k">Valor pago</span><span class="v">${brl(p.valor_pago)}</span></div>
      <div class="kv"><span class="k">Troco</span><span class="v">${brl(troco)}</span></div>` : ""}
    ${p.obs ? `<div class="kv"><span class="k">Observação</span><span class="v">${esc(p.obs)}</span></div>` : ""}</div>`;
}
function abrirFaturamento(id, total) {
  const formas = (ME && ME.formas_pagamento) || [];
  const sheet = document.createElement("div");
  sheet.className = "sheet-bg";
  sheet.innerHTML = `<div class="sheet"><div class="sheet-h"><b>Faturar O.S.</b><button class="ib" id="fx">✕</button></div>
    <div class="sheet-b">
      <div class="muted small" style="margin-bottom:10px">Total da O.S.: <b style="color:var(--ink)">${brl(total)}</b></div>
      <label class="fl">Forma de pagamento *</label>
      <select id="f_forma" class="inp"><option value="">Selecione…</option>${formas.map(f => `<option>${esc(f)}</option>`).join("")}</select>
      <label class="fl">Valor pago</label>
      <input id="f_pago" class="inp" inputmode="decimal" placeholder="0,00">
      <div class="muted small" id="f_troco" style="min-height:16px"></div>
      <label class="fl">Parcelas</label>
      <input id="f_parc" class="inp" inputmode="numeric" placeholder="1">
      <label class="fl">Observação do pagamento</label>
      <textarea id="f_obs" class="inp" rows="2" placeholder="Ex.: 50% de entrada, 50% na entrega"></textarea>
      <button class="btn" id="f_ok" style="margin-top:16px">Confirmar faturamento</button>
    </div></div>`;
  document.body.appendChild(sheet);
  const fechar = () => sheet.remove();
  sheet.querySelector("#fx").onclick = fechar;
  sheet.addEventListener("click", e => { if (e.target === sheet) fechar(); });
  const pago = sheet.querySelector("#f_pago"), troco = sheet.querySelector("#f_troco");
  pago.addEventListener("input", () => {
    const v = parseFloat((pago.value || "").replace(",", ".")) || 0;
    troco.textContent = v > 0 ? "Troco: " + brl(Math.max(0, v - (total || 0))) : "";
  });
  sheet.querySelector("#f_ok").onclick = async () => {
    const forma = sheet.querySelector("#f_forma").value;
    if (!forma) { toast("Selecione a forma de pagamento", "err"); return; }
    const payload = { forma_pagamento: forma, valor_pago: pago.value,
      parcelas: sheet.querySelector("#f_parc").value, obs_pagamento: sheet.querySelector("#f_obs").value };
    toast("Faturando…");
    try { await api("POST", "/api/os/" + id + "/faturar", payload); toast("O.S. faturada ✓", "ok"); fechar(); viewDetalhe(id); }
    catch (e) { if (e.status === 401) { ME = null; return viewLogin(); } toast(e.message || "Não foi possível faturar", "err"); }
  };
}
function lightbox(fid) {
  const lb = document.createElement("div"); lb.className = "lb";
  lb.innerHTML = `<img src="/api/foto/${fid}/full">`;
  lb.onclick = () => lb.remove(); document.body.appendChild(lb);
}

/* ----------------------------------------------------------------- captura de foto */
function tirarFoto(osId, onDone) {
  const fin = document.getElementById("filein");
  fin.value = "";
  fin.onchange = async () => {
    const file = fin.files && fin.files[0]; if (!file) return;
    toast("Processando foto…");
    try {
      const b64 = await reduzir(file);
      toast("Enviando…");
      await api("POST", "/api/os/" + osId + "/foto", { b64, mime: "image/jpeg" });
      toast("Foto enviada ✓", "ok"); if (onDone) onDone();
    } catch (e) { toast(e.message || "Falha ao enviar", "err"); }
  };
  fin.click();
}
async function reduzir(file) {
  let w, h, draw;
  if (window.createImageBitmap) { const bmp = await createImageBitmap(file); w = bmp.width; h = bmp.height; draw = bmp; }
  else { draw = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }); w = draw.naturalWidth; h = draw.naturalHeight; }
  const s = Math.min(1, 1600 / Math.max(w, h));
  const cv = document.createElement("canvas"); cv.width = Math.round(w * s); cv.height = Math.round(h * s);
  cv.getContext("2d").drawImage(draw, 0, 0, cv.width, cv.height);
  return cv.toDataURL("image/jpeg", 0.8).split(",", 2)[1];
}

/* ----------------------------------------------------------------- boot */
async function boot() {
  try { ME = await api("GET", "/api/me"); } catch (e) { ME = null; }
  if (ME) viewLista(); else viewLogin();
}
boot();
