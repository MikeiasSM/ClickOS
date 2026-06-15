"use strict";
/* ClickOS — front-end (vanilla JS) conversando com a Api Python via pywebview */

const main = () => document.getElementById("main");
let B = { status_orcamento: [], status_os: [], kanban_os_status: [], prioridades: ["Normal"],
  formas_pagamento: [], niveis_combustivel: [], estado_geral: [], pecas: [] };
let SUG = { marcas: [], cores: [], combustiveis: [], cidades: [] };
let CITIES = [];  // base IBGE [[cidade, uf], ...] carregada uma vez
let CURRENT_USER = null;  // usuário autenticado na sessão

/* ----------------------------------------------------------------- ícones (Feather/Lucide, MIT) */
const ICONS = {
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  columns: '<rect x="3" y="3" width="6" height="18" rx="1"/><rect x="11" y="3" width="6" height="12" rx="1"/><rect x="19" y="3" width="2" height="18" rx="1"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  car: '<path d="M5 13l1.4-4.2A2 2 0 0 1 8.3 7.4h7.4a2 2 0 0 1 1.9 1.4L19 13"/><path d="M3 13h18v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><circle cx="7.5" cy="16.5" r="1.2"/><circle cx="16.5" cy="16.5" r="1.2"/>',
  box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22" x2="12" y2="12"/>',
  building: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><line x1="3" y1="11" x2="21" y2="11"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  repeat: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  trending: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  dollar: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  chevron: '<polyline points="6 9 12 15 18 9"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  doc: '<path d="M9 12h6"/><path d="M9 16h6"/><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  tag: '<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  key: '<path d="M21 2l-2 2"/><path d="M14.5 6.5 18 10"/><circle cx="7.5" cy="15.5" r="5.5"/><path d="m11.5 11.5 8-8 2 2"/>',
  palette: '<circle cx="13.5" cy="6.5" r=".6" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".6" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".6" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".6" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996C18.49 15.39 22 11.9 22 7.5 22 4.42 17.5 2 12 2z"/>',
  droplet: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
};
function ic(name, size) {
  const s = size || 18;
  return `<svg class="icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;
}
function injectIcons(root) { (root || document).querySelectorAll(".ic[data-icon]").forEach(s => { s.innerHTML = ic(s.dataset.icon); }); }

/* ----------------------------------------------------------------- helpers base */
function h(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function val(sel, root) { const e = (root || document).querySelector(sel); return e ? e.value.trim() : ""; }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function num(v) { if (typeof v === "number") return v; let s = String(v == null ? "" : v).replace(/[R$\s]/g, ""); if (s.indexOf(",") > -1) s = s.replace(/\./g, "").replace(",", "."); const n = parseFloat(s); return isNaN(n) ? 0 : n; }
function money(v) { return "R$ " + Number(num(v)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtMoney(v) { return Number(num(v)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtQtd(v) { return Number(num(v)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function today() { return ymd(new Date()); }  // data LOCAL (coerente com monthRange e com o date-picker)
function nowLocal() { const d = new Date(); return ymd(d) + "T" + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
/* valor para <input type="datetime-local"> tolerando data-só ('YYYY-MM-DD') e timestamp ('YYYY-MM-DDTHH:MM') */
function dtLocalVal(s) { s = String(s || ""); if (s.length >= 16 && (s[10] === "T" || s[10] === " ")) return s.slice(0, 10) + "T" + s.slice(11, 16); if (s.length >= 10 && s[4] === "-") return s.slice(0, 10) + "T00:00"; return ""; }
function fmtDateTime(s) { s = String(s || ""); return s.length >= 16 && (s[10] === "T" || s[10] === " ") ? fmtDate(s.slice(0, 10)) + " " + s.slice(11, 16) : fmtDate(s); }
function loginFromNome(s) { return String(s || "").normalize("NFD").replace(/[^\x00-\x7F]/g, "").toUpperCase(); }
function fmtDate(s) { s = String(s || ""); return (s.length >= 10 && s[4] === "-") ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : s; }
function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function monthRange() { const d = new Date(); return { ini: ymd(new Date(d.getFullYear(), d.getMonth(), 1)), fim: ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }; }
/* texto "Orçamento válido por X dias" a partir das preferências */
function validadeTexto(prefs) {
  prefs = prefs || B.preferencias || {};
  const q = num(prefs.orc_validade_qtd) || 0;
  const L = { horas: ["hora", "horas"], dias: ["dia", "dias"], semanas: ["semana", "semanas"], meses: ["mês", "meses"] }[prefs.orc_validade_unidade] || ["dia", "dias"];
  return "Orçamento válido por " + q + " " + (q === 1 ? L[0] : L[1]);
}
/* HTML da linha de desconto geral com alternância R$ / % */
function descLineHtml(doc) {
  const isPct = doc.desconto_tipo === "percent";
  return `<div class="tot-line"><span class="muted">Desconto geral</span>
    <span class="desc-wrap"><span class="muted small desc-eq" id="desc_eq"></span>
      <span class="seg desc-seg"><button type="button" data-t="valor" class="${isPct ? "" : "on"}">R$</button><button type="button" data-t="percent" class="${isPct ? "on" : ""}">%</button></span>
      <input id="f_desc" class="money-in" style="width:120px;text-align:right" value="${doc.desconto_geral || 0}"></span></div>`;
}
/* Liga a alternância R$/% e o input #f_desc ao recalc. Devolve um getter do tipo atual. */
function bindDescLine(recalc, tipoInicial) {
  let tipo = tipoInicial === "percent" ? "percent" : "valor";
  const seg = main().querySelector(".desc-seg"), fd = main().querySelector("#f_desc");
  bindMoney(fd); fd.oninput = recalc;
  seg.querySelectorAll("button").forEach(b => b.onclick = () => {
    tipo = b.dataset.t; seg.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); recalc();
  });
  return () => tipo;
}
/* desconto resolvido em R$ (aplica % sobre o subtotal quando for o caso) */
function descResolvido(sub, tipo) { const dv = num(val("#f_desc")); return tipo === "percent" ? sub * dv / 100 : dv; }
function btn(label, icon, onclick, cls) { const b = h(`<button class="btn btn-sm ${cls || ""}">${icon ? ic(icon, 15) : ""}${label ? `<span>${esc(label)}</span>` : ""}</button>`); b.onclick = onclick; return b; }

/* máscaras */
function mCEP(v) { return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"); }
function mFone(v) { v = v.replace(/\D/g, "").slice(0, 11); if (v.length <= 10) return v.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (m, a, b, c) => (a ? "(" + a + ") " : "") + b + (c ? "-" + c : "")).trim(); return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3"); }
function mDoc(v) { v = v.replace(/\D/g, ""); if (v.length <= 11) return v.slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); return v.slice(0, 14).replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2"); }
function bindMask(el, fn) { if (!el) return; el.addEventListener("input", () => { el.value = fn(el.value); }); el.value = fn(el.value); }
function bindUpper(el) { if (!el) return; el.addEventListener("input", () => el.value = el.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")); }
function bindInt(el) { if (!el) return; el.addEventListener("input", () => el.value = el.value.replace(/\D/g, "")); }
function bindMoney(el) { if (!el) return; el.setAttribute("inputmode", "decimal"); el.addEventListener("blur", () => { if (el.value.trim() !== "") el.value = fmtMoney(el.value); }); if (el.value) el.value = fmtMoney(el.value); }
function bindQtd(el) { if (!el) return; el.setAttribute("inputmode", "decimal"); el.addEventListener("blur", () => { if (el.value.trim() !== "") el.value = fmtQtd(el.value); }); if (el.value) el.value = fmtQtd(el.value); }

async function cepLookup(cep, set) {
  const d = String(cep || "").replace(/\D/g, ""); if (d.length !== 8) return;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`); const j = await r.json();
    if (j && !j.erro) {
      if (j.logradouro && set.endereco) set.endereco.value = j.logradouro;
      if (j.bairro && set.bairro) set.bairro.value = j.bairro;
      if (j.localidade && set.cidade) set.cidade.value = j.localidade;
      if (j.uf && set.uf) set.uf.value = j.uf;
    }
  } catch (e) { /* offline: integração opcional */ }
}

async function api(method, ...args) {
  const r = await window.pywebview.api[method](...args);
  if (r && r.ok === false) { toast(r.erro || "Erro", "err"); throw new Error(r.erro || "erro"); }
  return r ? r.data : r;
}
function toast(msg, kind) { const t = h(`<div class="toast ${kind || "info"}">${esc(msg)}</div>`); document.getElementById("toast-root").appendChild(t); setTimeout(() => t.remove(), 3400); }
function openModal(node) {
  const bg = h(`<div class="modal-bg"></div>`); bg.appendChild(node);
  bg.addEventListener("mousedown", e => { if (e.target === bg) bg.remove(); });
  document.getElementById("modal-root").appendChild(bg); injectIcons(node); return bg;
}
function confirma(msg, opts) {
  opts = opts || {};
  return new Promise(res => {
    const m = h(`<div class="modal" style="width:420px"><h3>${esc(opts.title || "Confirmar")}</h3>
      <p class="muted" style="margin:0 0 18px">${esc(msg)}</p>
      <div class="between"><button class="btn" id="n">Cancelar</button>
        <button class="btn ${opts.danger ? "btn-danger" : "btn-primary"}" id="y">${esc(opts.ok || "Confirmar")}</button></div></div>`);
    const bg = h(`<div class="modal-bg"></div>`); bg.appendChild(m);
    bg.addEventListener("mousedown", e => { if (e.target === bg) { bg.remove(); res(false); } });
    document.getElementById("modal-root").appendChild(bg);
    m.querySelector("#n").onclick = () => { bg.remove(); res(false); };
    m.querySelector("#y").onclick = () => { bg.remove(); res(true); };
  });
}
function render(html) { main().innerHTML = html; injectIcons(main()); }

/* markdown mínimo (offline, sem libs): cabeçalhos, negrito/itálico, código, listas, links, regra, quebras */
function mdToHtml(md) {
  // sentinelas em área de uso privado Unicode (\uE0xx): improváveis no texto do usuário,
  // evitando colisão com tokens digitados; esc() é aplicado ANTES (sem risco de XSS).
  let s = esc(md || "");
  const blocos = [];
  s = s.replace(/```([\s\S]*?)```/g, (m, c) => { blocos.push(`<pre>${c.replace(/^\n/, "")}</pre>`); return `\n${blocos.length - 1}\n`; });
  const linhas = s.split(/\r?\n/);
  let out = "", lista = null;  // 'ul' | 'ol' | null
  const fechaLista = () => { if (lista) { out += `</${lista}>`; lista = null; } };
  const inline = t => {
    const codes = [];
    t = t.replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return `${codes.length - 1}`; });  // protege code spans
    t = t
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return t.replace(/(\d+)/g, (m, i) => `<code>${codes[+i]}</code>`);
  };
  for (let ln of linhas) {
    const m0 = ln.match(/^(\d+)$/);
    if (m0) { fechaLista(); out += blocos[+m0[1]] || ""; continue; }
    if (/^\s*$/.test(ln)) { fechaLista(); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(ln)) { fechaLista(); out += "<hr>"; continue; }
    let m = ln.match(/^(#{1,6})\s+(.*)$/);
    if (m) { fechaLista(); const n = m[1].length; out += `<h${n}>${inline(m[2])}</h${n}>`; continue; }
    m = ln.match(/^\s*[-*]\s+(.*)$/);
    if (m) { if (lista !== "ul") { fechaLista(); out += "<ul>"; lista = "ul"; } out += `<li>${inline(m[1])}</li>`; continue; }
    m = ln.match(/^\s*\d+\.\s+(.*)$/);
    if (m) { if (lista !== "ol") { fechaLista(); out += "<ol>"; lista = "ol"; } out += `<li>${inline(m[1])}</li>`; continue; }
    fechaLista(); out += `<p>${inline(ln)}</p>`;
  }
  fechaLista();
  return out;
}

/* ----------------------------------------------------------------- componentes v3 */
function emptyState(icon, title, sub, ctaLabel, ctaFn) {
  const e = h(`<div class="empty-state"><div class="es-ico">${ic(icon, 30)}</div><h4>${esc(title)}</h4><p>${esc(sub || "")}</p></div>`);
  if (ctaLabel && ctaFn) e.appendChild(btn(ctaLabel, "plus", ctaFn, "btn-primary"));
  return e;
}
function vmode(screen, def) { try { return localStorage.getItem("vm_" + screen) || def; } catch (e) { return def; } }
function setvmode(screen, v) { try { localStorage.setItem("vm_" + screen, v); } catch (e) {} }
function viewToggle(screen, current, options, onChange) {
  const t = h(`<div class="viewtoggle"></div>`);
  options.forEach(o => { const b = h(`<button class="${o.v === current ? "on" : ""}" title="${esc(o.title || "")}">${ic(o.icon, 16)}</button>`); b.onclick = () => { setvmode(screen, o.v); onChange(o.v); }; t.appendChild(b); });
  return t;
}

/* Posiciona o popover do combobox. Dentro de um modal (que tem overflow), usa position:fixed
   ancorado na viewport para ESCAPAR do recorte do modal; fora de modal mantém o absolute. */
function placePop(input, pop) {
  const r = input.getBoundingClientRect();
  const sc = input.closest(".modal");
  if (sc) {
    pop.classList.add("fixed");
    const ph = pop.offsetHeight || 260;
    const abaixo = window.innerHeight - r.bottom;
    const up = abaixo < Math.min(ph + 8, 268) && r.top > abaixo;
    pop.classList.toggle("up", up);
    pop.style.left = r.left + "px";
    pop.style.width = r.width + "px";
    pop.style.top = up ? Math.max(8, r.top - ph - 4) + "px" : (r.bottom + 4) + "px";
  } else {
    pop.classList.remove("fixed");
    pop.style.left = pop.style.top = pop.style.width = "";
    pop.classList.toggle("up", (window.innerHeight - r.bottom) < 260 && r.top > 280);
  }
}
/* navegação por teclado (setas/enter/esc) compartilhada pelos comboboxes */
function keyHandler(input, pop, open, close, getAi, setAi) {
  return e => {
    const opts = [...pop.querySelectorAll(".combo-opt, .combo-add")];
    const hl = () => { opts.forEach((o, i) => o.classList.toggle("active", i === getAi())); const a = opts[getAi()]; if (a) a.scrollIntoView({ block: "nearest" }); };
    if (e.key === "ArrowDown") { e.preventDefault(); if (!pop.classList.contains("open")) { open(); return; } setAi(Math.min(getAi() + 1, opts.length - 1)); hl(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAi(Math.max(getAi() - 1, 0)); hl(); }
    else if (e.key === "Enter") { const o = opts[getAi()]; if (pop.classList.contains("open") && o) { e.preventDefault(); o.click(); } }
    else if (e.key === "Escape") { close(); }
  };
}

/* combobox para SELECIONAR de uma lista (retorna id) com busca, teclado e cadastro inline */
function comboSelect(items, value, opt) {
  let sel = value || null, ai = -1;
  const getLabel = opt.getLabel || (x => x.nome);
  const wrap = h(`<div class="combo"><div class="combo-input"><input placeholder="${esc(opt.placeholder || "Selecione...")}">${ic("search", 14)}</div><div class="combo-pop"></div></div>`);
  const input = wrap.querySelector("input"), pop = wrap.querySelector(".combo-pop");
  const setText = () => { const it = items.find(x => x.id == sel); input.value = it ? getLabel(it) : ""; };
  function renderOpts(filter) {
    ai = -1;
    const f = (filter || "").toLowerCase();
    const matches = items.filter(x => getLabel(x).toLowerCase().includes(f)).slice(0, 80);
    let html = matches.map(x => `<div class="combo-opt" data-id="${x.id}"><span>${esc(getLabel(x))}</span>${opt.getSub ? `<span class="sub">${esc(opt.getSub(x) || "")}</span>` : ""}</div>`).join("");
    if (!matches.length) html = '<div class="combo-none">Nenhum encontrado</div>';
    if (opt.onCreate && (filter || "").trim()) html += `<div class="combo-add">${ic("plus", 15)}<span>Cadastrar "${esc(filter.trim())}"</span></div>`;
    pop.innerHTML = html;
    pop.querySelectorAll(".combo-opt[data-id]").forEach(o => o.onclick = () => { sel = o.dataset.id; close(); opt.onSelect && opt.onSelect(sel); });
    const add = pop.querySelector(".combo-add"); if (add) add.onclick = () => { const t = input.value.trim(); pop.classList.remove("open"); opt.onCreate(t); };
  }
  function open() { input.value = ""; renderOpts(""); pop.classList.add("open"); placePop(input, pop); input.focus(); }
  function close() { pop.classList.remove("open"); setText(); }
  wrap.querySelector(".combo-input").onclick = () => { if (!pop.classList.contains("open")) open(); };
  input.oninput = () => { pop.classList.add("open"); renderOpts(input.value); placePop(input, pop); };
  input.onkeydown = keyHandler(input, pop, open, close, () => ai, v => ai = v);
  document.addEventListener("mousedown", e => { if (!wrap.contains(e.target)) close(); });
  setText();
  wrap._value = () => sel; wrap._setItems = it => { items = it; setText(); }; wrap._setValue = v => { sel = v; setText(); };
  return wrap;
}

/* combobox de TEXTO LIVRE com sugestões (retorna o texto) + teclado + cadastro opcional (onCreate) */
function comboText(items, value, opt) {
  let ai = -1;
  const getLabel = opt.getLabel || (x => x);
  const wrap = h(`<div class="combo"><div class="combo-input"><input placeholder="${esc(opt.placeholder || "")}">${ic("search", 14)}</div><div class="combo-pop"></div></div>`);
  const input = wrap.querySelector("input"), pop = wrap.querySelector(".combo-pop");
  input.value = value || "";
  const exact = () => items.some(x => getLabel(x).toLowerCase() === input.value.trim().toLowerCase());
  // item removível (cadastro inline): opt.deletaveis pode ser um Set ou um predicado(valor)->bool
  const podeDeletar = x => {
    if (!opt.onDelete) return false;
    if (!opt.deletaveis) return true;
    const v = getLabel(x);
    return typeof opt.deletaveis === "function" ? opt.deletaveis(v) : opt.deletaveis.has(v);
  };
  function renderOpts() {
    ai = -1;
    const f = input.value.trim().toLowerCase();
    const matches = items.filter(x => getLabel(x).toLowerCase().includes(f)).slice(0, 60);
    let html = matches.map((x, i) => `<div class="combo-opt${podeDeletar(x) ? " has-del" : ""}" data-i="${i}"><span>${esc(getLabel(x))}</span>${opt.getSub ? `<span class="sub">${esc(opt.getSub(x) || "")}</span>` : ""}${podeDeletar(x) ? `<button class="combo-del" data-i="${i}" title="Remover das sugestões">${ic("trash", 13)}</button>` : ""}</div>`).join("");
    if (!matches.length && !opt.onCreate) html = '<div class="combo-none">Sem sugestões — usado como texto</div>';
    if (opt.onCreate && input.value.trim() && !exact()) html += `<div class="combo-add">${ic("plus", 15)}<span>${esc(opt.createLabel ? opt.createLabel(input.value.trim()) : 'Cadastrar "' + input.value.trim() + '"')}</span></div>`;
    pop.innerHTML = html;
    pop.querySelectorAll(".combo-opt").forEach(o => o.onclick = () => { const x = matches[+o.dataset.i]; input.value = getLabel(x); close(); opt.onPick && opt.onPick(x); });
    pop.querySelectorAll(".combo-del").forEach(b => b.onclick = async e => {
      e.stopPropagation();
      const val = getLabel(matches[+b.dataset.i]);
      if ((await opt.onDelete(val)) === false) return;
      items = items.filter(it => getLabel(it) !== val);
      renderOpts();
    });
    const add = pop.querySelector(".combo-add"); if (add) add.onclick = () => { pop.classList.remove("open"); opt.onCreate(input.value.trim()); };
  }
  function open() { renderOpts(); pop.classList.add("open"); placePop(input, pop); }
  function close() { pop.classList.remove("open"); }
  wrap.querySelector(".combo-input").onclick = () => open();
  input.onfocus = open;
  input.oninput = () => { open(); opt.onInput && opt.onInput(input.value); };
  input.onkeydown = keyHandler(input, pop, open, close, () => ai, v => ai = v);
  document.addEventListener("mousedown", e => { if (!wrap.contains(e.target)) close(); });
  wrap._value = () => input.value.trim(); wrap._input = input; wrap._setItems = it => items = it;
  return wrap;
}

/* dropdown customizado para listas fixas (substitui o <select> nativo).
   options: array de strings OU {value,label}. _value() retorna o valor selecionado. */
function selectCombo(options, value, onChange, opts) {
  opts = opts || {};
  const items = options.map(o => (typeof o === "string" ? { id: o, nome: o } : { id: o.value, nome: o.label }));
  return comboSelect(items, value == null ? null : value, {
    placeholder: opts.placeholder || "Selecione...", getLabel: x => x.nome,
    onSelect: id => onChange && onChange(id),
  });
}

/* popup de cadastro de cidade com seleção de UF (entre as existentes — nunca novo estado) */
function cadastrarCidade(nome, onDone) {
  const m = h(`<div class="modal" style="width:440px"><button class="close">×</button><h3>Cadastrar cidade</h3>
    <div class="grid2"><div class="field"><label>Cidade *</label><input id="cn" value="${esc(nome)}"></div>
      <div class="field"><label>Estado (UF) *</label><div id="c_uf"></div></div></div>
    <div class="muted small">A UF deve ser uma das existentes — não é possível criar um novo estado.</div>
    <div class="between mt"><button class="btn" id="cc">Cancelar</button><button class="btn btn-primary" id="sv">Adicionar</button></div></div>`);
  const bg = openModal(m);
  const ufCombo = selectCombo(B.ufs || [], (B.ufs || [])[0] || "", null);
  m.querySelector("#c_uf").appendChild(ufCombo);
  m.querySelector(".close").onclick = () => bg.remove(); m.querySelector("#cc").onclick = () => bg.remove();
  m.querySelector("#sv").onclick = async () => {
    const nm = val("#cn", m), uf = ufCombo._value();
    if (!nm) { toast("Informe a cidade", "err"); return; }
    await api("add_cidade", { nome: nm, uf }); bg.remove(); if (onDone) onDone(nm, uf);
  };
}

/* ----------------------------------------------------------------- router */
function setActive(view) { document.querySelectorAll(".menu a").forEach(a => a.classList.toggle("active", a.dataset.view === view)); const cb = document.getElementById("btn-config"); if (cb) cb.classList.toggle("active", view === "config"); }
const VIEWS = { dashboard: viewDashboard, orcamentos: viewOrcamentos, documentos: viewDocumentos, clientes: viewClientes, veiculos: viewVeiculos, produtos: viewProdutos };
async function setView(view) { setActive(view); try { await VIEWS[view](); } catch (e) { render(`<div class="empty">Erro ao carregar: ${esc(e.message)}</div>`); } }

/* ----------------------------------------------------------------- dashboard */
function kpi(label, v, icon, color, bg, sub) {
  return `<div class="card kpi"><div style="min-width:0"><div class="k-label">${label}</div><div class="k-val">${v}</div>${sub ? `<div class="k-sub">${esc(sub)}</div>` : ""}</div>
    <div class="k-ico" style="background:${bg};color:${color}">${ic(icon, 22)}</div></div>`;
}
function saudacao() { const hr = new Date().getHours(); return hr < 12 ? "Bom dia" : hr < 18 ? "Boa tarde" : "Boa noite"; }
function hojeExtenso() { try { const s = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); return s.charAt(0).toUpperCase() + s.slice(1); } catch (e) { return ""; } }
function moneyK(v) { v = num(v); return v >= 1000 ? "R$ " + (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "k" : money(v); }
function barChart(data) {
  // Gráfico em HTML/CSS com ALTURA FIXA (não escala com a largura da tela): as colunas
  // preenchem a largura e as barras crescem dentro da altura do container.
  const max = Math.max(1, ...data.map(d => d.valor));
  const vazio = data.every(d => !d.valor);
  const wrap = h(`<div class="barchart"></div>`);
  data.forEach(d => {
    const hpct = vazio ? 0 : Math.max(2, Math.round((d.valor / max) * 100));
    const col = h(`<div class="bc-col">
      <div class="bc-plot"><div class="bc-val">${d.valor ? moneyK(d.valor) : ""}</div><div class="bc-bar" style="height:${hpct}%"></div></div>
      <div class="bc-label">${esc(d.label)}</div></div>`);
    wrap.appendChild(col);
  });
  if (vazio) wrap.appendChild(h('<div class="bc-empty muted small">Ainda sem faturamento registrado</div>'));
  return wrap;
}
function donut(segments, opts) {
  opts = opts || {};
  const total = segments.reduce((a, s) => a + s.value, 0);
  const size = opts.size || 190, sw = opts.stroke || 18, r = (size - sw) / 2, c = size / 2, C = 2 * Math.PI * r;
  const nz = segments.filter(s => s.value > 0).length;
  const gapVis = 1.5;                      // gap visível (~1-2px)
  let off = 0, arcs = "";
  segments.forEach(s => {
    const len = total ? (s.value / total) * C : 0;
    if (len > 0.5) {
      // pontas arredondadas (linecap=round avança sw/2); reduz o arco para deixar gap pequeno entre fatias
      const g = nz > 1 ? Math.min(sw + gapVis, len * 0.55) : 0;
      const drawn = Math.max(0.5, len - g);
      arcs += `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${drawn.toFixed(2)} ${(C - drawn).toFixed(2)}" stroke-dashoffset="${(-(off + g / 2)).toFixed(2)}"></circle>`;
    }
    off += len;
  });
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <g transform="rotate(-90 ${c} ${c})"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="${sw}"></circle>${arcs}</g>
    <text x="${c}" y="${c - 2}" text-anchor="middle" font-size="32" font-weight="800" fill="#111827">${total}</text>
    <text x="${c}" y="${c + 19}" text-anchor="middle" font-size="13" fill="#64748b">OS</text></svg>`;
}
function statusClass(s) {
  if (s === "Expirado") return "b-late";
  if (["Aberta", "Aberto"].includes(s)) return "b-aberta";
  if (["Em Execução"].includes(s)) return "b-os";
  if (["Concluída", "Faturada", "Aprovado"].includes(s)) return "b-green";
  return "b-gray";
}
/* badge "Atrasada" exibido em O.S. cuja previsão de entrega já passou (preferência) */
function lateBadge(d) { return d && d.atrasado ? ' <span class="badge b-late">Atrasada</span>' : ""; }
async function viewDashboard() {
  const d = await api("dashboard");
  const u = CURRENT_USER || {};
  const primeiroNome = (String(u.nome || u.login || "").trim().split(/\s+/)[0]) || "";
  render(`
    <div class="between dash-head">
      <div><h1 class="page-title">${saudacao()}${primeiroNome ? ", " + esc(primeiroNome) : ""}! 👋</h1><p class="page-sub">${hojeExtenso()}</p></div>
      <div class="row"><button class="btn" id="nc">${ic("user", 16)}<span>Nova Pessoa</span></button><button class="btn" id="no">${ic("doc", 16)}<span>Novo Orçamento</span></button><button class="btn btn-primary" id="nd">${ic("plus", 16)}<span>Nova O.S.</span></button></div>
    </div>
    <div class="cards kpis">
      ${kpi("Faturamento do mês", money(d.faturamento_mes), "dollar", "#16a34a", "#dcfce7", "Total em OS: " + money(d.faturamento_total))}
      ${kpi("OS em aberto", d.abertas, "trending", "#d97706", "#fef9c3", d.os_count + " OS no total")}
      ${kpi("Orçamentos abertos", d.orcamentos_abertos, "file", "#2563eb", "#dbeafe", d.orcamentos + " orçamentos")}
      ${kpi("Pessoas", d.clientes, "users", "#7c3aed", "#f3e8ff", d.veiculos + " veículos")}
    </div>
    <div class="dash-grid mt">
      <div class="card"><div class="between"><h3 style="margin:0">Faturamento (últimos 6 meses)</h3><span class="muted small">Ticket médio: ${money(d.ticket_medio)}</span></div><div id="chart" style="margin-top:12px"></div></div>
      <div class="card"><h3 style="margin:0 0 16px">Pipeline de OS</h3><div class="donut-wrap"><div id="donut"></div><div class="donut-legend" id="legend"></div></div></div>
    </div>
    <div class="card mt"><div class="between"><h3 style="margin:0">Documentos recentes</h3><button class="btn btn-sm" id="vt">Ver todos</button></div><div id="recent" style="margin-top:8px"></div></div>`);
  main().querySelector("#chart").appendChild(barChart(d.fat_meses || []));
  const cores = { "Aberta": "#f59e0b", "Em Execução": "#2563eb", "Concluída": "#16a34a" };
  const segs = Object.entries(d.pipeline || {}).map(([k, v]) => ({ label: k, value: v, color: cores[k] || "#94a3b8" }));
  main().querySelector("#donut").innerHTML = donut(segs, { size: 190, stroke: 18 });
  const legend = main().querySelector("#legend");
  segs.forEach(s => legend.appendChild(h(`<div class="leg-row"><span class="leg-dot" style="background:${s.color}"></span><span class="leg-label">${esc(s.label)}</span><b>${s.value}</b></div>`)));
  const rec = main().querySelector("#recent");
  if (!d.recentes.length) rec.appendChild(emptyState("file", "Nenhum documento ainda", "Comece criando um orçamento ou ordem de serviço.", "Nova O.S.", () => openOS(null)));
  else renderDocsList(rec, d.recentes, viewDashboard);
  main().querySelector("#vt").onclick = () => setView("documentos");
  main().querySelector("#nd").onclick = () => openOS(null);
  main().querySelector("#no").onclick = () => formOrcamento(null);
  main().querySelector("#nc").onclick = () => formCliente(null);
}

/* barra de filtros: busca + período (datepickers início/fim, padrão = mês corrente) */
function filtroBarHtml(r) {
  return `<div class="filtros">
    <div class="search">${ic("search", 16)}<input id="q" placeholder="Buscar por número, pessoa ou placa..."></div>
    <div class="fdates"><label>De</label><input type="date" id="d_ini" value="${r.ini}"><label>até</label><input type="date" id="d_fim" value="${r.fim}"><button class="btn btn-sm" id="d_clear">Limpar</button></div>
  </div>`;
}
function bindFiltros(reload) {
  const di = main().querySelector("#d_ini"), df = main().querySelector("#d_fim");
  main().querySelector("#q").addEventListener("input", reload);
  di.addEventListener("change", reload); df.addEventListener("change", reload);
  main().querySelector("#d_clear").onclick = () => { di.value = ""; df.value = ""; reload(); };
}
function filtroValores() {
  return { q: val("#q"), data_ini: val("#d_ini"), data_fim: val("#d_fim") };
}
/* listagem como grid: Código | Pessoa | Veículo | Emissão | [Previsão] | Valor | Status | Ações */
function renderDocsGrid(board, docs, onReload, isOS) {
  const head = isOS
    ? `<th>Código</th><th>Pessoa</th><th>Veículo</th><th>Emissão</th><th>Previsão</th><th class="r">Valor</th><th>Status</th><th></th>`
    : `<th>Código</th><th>Pessoa</th><th>Veículo</th><th>Emissão</th><th class="r">Valor</th><th>Status</th><th></th>`;
  const table = h(`<table class="grid-table"><thead><tr>${head}</tr></thead><tbody></tbody></table>`);
  const tb = table.querySelector("tbody");
  docs.forEach(d => {
    const prio = d.prioridade || "Normal";
    const veic = ((d.veiculo_placa || "") + (d.veiculo_marca ? " · " + d.veiculo_marca : "")).trim() || "—";
    const stTxt = d.situacao || d.status;
    const stCell = `<span class="badge ${statusClass(stTxt)}">${esc(stTxt)}</span>${isOS ? lateBadge(d) : ""}${prio !== "Normal" ? ` <span class="prio ${prio}">${prio}</span>` : ""}`;
    const prevCell = isOS ? `<td class="${d.atrasado ? "td-late" : ""}" style="white-space:nowrap">${d.previsao ? fmtDateTime(d.previsao) : "—"}</td>` : "";
    const tr = h(`<tr${d.atrasado ? ' class="row-late"' : ""}>
      <td class="mono">${esc(d.numero)}</td>
      <td>${esc(d.cliente_nome || "—")}</td>
      <td>${esc(veic)}</td>
      <td style="white-space:nowrap">${fmtDateTime(d.data_abertura)}</td>
      ${prevCell}
      <td class="r money">${money(d.total)}</td>
      <td>${stCell}</td>
      <td class="r"><div class="acts"></div></td></tr>`);
    const a = tr.querySelector(".acts");
    a.appendChild(btn("", "eye", () => printPreview(d.id)));
    a.appendChild(btn("", "edit", () => isOS ? openDocForm(d.id) : formOrcamento(d.id)));
    if (isOS) a.appendChild(btn("", "printer", () => printDocumento(d.id)));
    else if (!["Aprovado", "Recusado", "Cancelado"].includes(d.status)) a.appendChild(btn("", "repeat", () => efetivarOrcamento(d)));
    a.appendChild(btn("", "trash", () => delDoc(d.id, onReload), "btn-danger"));
    tb.appendChild(tr);
  });
  const card = h(`<div class="card grid-card"></div>`); card.appendChild(table);
  board.appendChild(card); injectIcons(board);
}

/* ----------------------------------------------------------------- orçamentos (CRUD próprio) */
async function viewOrcamentos() {
  render(`<div class="between"><div><h1 class="page-title">Orçamentos</h1><p class="page-sub">Propostas comerciais</p></div>
    <button class="btn btn-primary" id="novo">${ic("plus", 16)}<span>Novo Orçamento</span></button></div>
    <div class="card">${filtroBarHtml(monthRange())}</div>
    <div id="lista" class="mt"></div>`);
  main().querySelector("#novo").onclick = () => formOrcamento(null);
  async function reload() {
    const docs = await api("list_documentos", Object.assign({ tipo: "orcamento" }, filtroValores()));
    const lst = main().querySelector("#lista"); lst.innerHTML = "";
    if (!docs.length) { lst.appendChild(emptyState("file", "Nenhum orçamento no período", "Ajuste o período ou crie um novo orçamento.", "Novo Orçamento", () => formOrcamento(null))); return; }
    renderDocsGrid(lst, docs, viewOrcamentos, false);
  }
  bindFiltros(reload);
  reload();
}

/* ----------------------------------------------------------------- O.S. (kanban + lista) */
async function viewDocumentos() {
  const mode = vmode("docs", "kanban");
  render(`<div class="between"><div><h1 class="page-title">Ordens de Serviço</h1><p class="page-sub">Quadro de acompanhamento</p></div>
    <div class="row"><span id="vt"></span><button class="btn" id="fat">${ic("dollar", 16)}<span>Lançar faturada</span></button><button class="btn btn-primary" id="novo">${ic("plus", 16)}<span>Nova O.S.</span></button></div></div>
    <div class="card">${filtroBarHtml(monthRange())}</div>
    <div id="board" class="mt"></div>`);
  main().querySelector("#vt").appendChild(viewToggle("docs", mode,
    [{ v: "kanban", icon: "columns", title: "Quadro" }, { v: "list", icon: "list", title: "Lista" }], () => viewDocumentos()));
  main().querySelector("#novo").onclick = () => openOS(null);
  main().querySelector("#fat").onclick = () => openOS(null, { faturada: true });
  async function reload() {
    const docs = await api("list_documentos", Object.assign({ tipo: "os" }, filtroValores()));
    const board = main().querySelector("#board"); board.innerHTML = "";
    if (!docs.length) { board.appendChild(emptyState("file", "Nenhuma O.S. no período", "Ajuste o período ou abra uma nova ordem de serviço.", "Nova O.S.", () => openOS(null))); return; }
    if (mode === "list") renderDocsGrid(board, docs, viewDocumentos, true); else renderKanban(board, docs);
  }
  bindFiltros(reload);
  reload();
}
function renderDocsList(board, docs, onReload) {
  const list = h(`<div class="list-rows"></div>`);
  docs.forEach(d => {
    const prio = d.prioridade || "Normal";
    const r = h(`<div class="list-row"><div class="grow">
      <div style="font-weight:700">${esc(d.numero)} ${d.tipo === "os" ? '<span class="badge b-os">OS</span>' : '<span class="badge b-orc">Orçamento</span>'} <span class="badge ${statusClass(d.status)}">${esc(d.status)}</span> ${prio !== "Normal" ? `<span class="prio ${prio}">${prio}</span>` : ""}</div>
      <div class="small muted">${esc(d.cliente_nome || "-")} · ${esc(d.veiculo_placa || "-")} · ${fmtDate(d.data_abertura)}</div></div>
      <span class="money">${money(d.total)}</span><div class="acts"></div></div>`);
    const a = r.querySelector(".acts");
    a.appendChild(btn("", "eye", () => printPreview(d.id)));
    a.appendChild(btn("", "edit", () => openDocForm(d.id)));
    a.appendChild(btn("", "printer", () => printDocumento(d.id)));
    a.appendChild(btn("", "trash", () => delDoc(d.id, onReload), "btn-danger"));
    list.appendChild(r);
  });
  board.appendChild(list); injectIcons(board);
}
const OS_COLUNAS = [["Aberta", "Aberta"], ["Em Execução", "Em Execução"], ["Concluída", "Aguard. Faturamento"], ["Faturada", "Faturada"], ["Cancelada", "Cancelada"]];
function renderKanban(board, docs) {
  const wrap = h(`<div class="kanban"></div>`);
  OS_COLUNAS.forEach(([status, title]) => {
    const items = docs.filter(d => d.status === status);
    const c = h(`<div class="kcol" data-col="${esc(status)}"><div class="kcol-head"><span>${esc(title)}</span><span class="cnt">${items.length}</span></div></div>`);
    items.forEach(d => c.appendChild(kcard(d)));
    c.addEventListener("dragover", e => { e.preventDefault(); c.classList.add("drop"); });
    c.addEventListener("dragleave", () => c.classList.remove("drop"));
    c.addEventListener("drop", e => { e.preventDefault(); c.classList.remove("drop"); onDropCard(status); });
    wrap.appendChild(c);
  });
  board.appendChild(wrap); injectIcons(board);
}
function kcard(d) {
  const prio = d.prioridade || "Normal";
  const card = h(`<div class="kcard pl-${esc(prio)}${d.atrasado ? " kcard-late" : ""}" draggable="true" data-id="${d.id}">
    <div class="knum">${esc(d.veiculo_placa || "Sem veículo")} <span class="badge b-os">OS</span>${lateBadge(d)}</div>
    <div class="kmeta">${esc(((d.veiculo_marca || "") + " " + (d.veiculo_modelo || "")).trim() || "—")}<br>${esc(d.numero)} · ${esc(d.cliente_nome || "-")} · ${fmtDate(d.data_abertura)}${d.previsao ? " · prev. " + fmtDate(d.previsao) : ""}</div>
    <div class="kfoot"><span class="money">${money(d.total)}</span><span class="kmini">
      ${prio !== "Normal" ? `<span class="prio ${prio}">${prio}</span>` : ""}
      <button data-a="ver" title="Ver">${ic("eye", 14)}</button><button data-a="edit" title="Abrir">${ic("edit", 14)}</button><button data-a="del" title="Excluir">${ic("trash", 14)}</button></span></div>`);
  card.addEventListener("dragstart", () => { card.classList.add("dragging"); window.__drag = { id: d.id, status: d.status }; });
  card.addEventListener("dragend", () => card.classList.remove("dragging"));
  card.querySelector("[data-a=ver]").onclick = e => { e.stopPropagation(); printPreview(d.id); };
  card.querySelector("[data-a=edit]").onclick = e => { e.stopPropagation(); openOS(d.id); };
  card.querySelector("[data-a=del]").onclick = e => { e.stopPropagation(); delDoc(d.id); };
  return card;
}
async function onDropCard(colKey) {
  const drag = window.__drag; if (!drag) return; window.__drag = null;
  if (drag.status === colKey) return;
  try { await api("set_status", { id: drag.id, status: colKey }); toast("Status: " + colKey, "ok"); } catch (e) { /* erro já avisado */ }
  viewDocumentos();
}
async function delDoc(id, reload) { if (!await confirma("Excluir este documento? Esta ação não pode ser desfeita.", { danger: true, ok: "Excluir" })) return; await api("delete_documento", id); toast("Documento excluído", "ok"); (reload || viewDocumentos)(); }

/* ----------------------------------------------------------------- editor de itens (form + grid) */
function blankItem() { return { item_catalogo_id: null, descricao: "", tipo: "servico", quantidade: 1, valor_unitario: 0, desconto: 0 }; }
/* Componente: um formulário em cima (combo + qtd + vlr + desconto + Adicionar) e um grid de leitura
   abaixo. Gerencia o array `itens` e chama onChange() para recalcular os totais. Sem bug de resize
   (o grid é fixo/somente leitura; a edição acontece no formulário). */
function itensEditor(itens, cat, onChange) {
  const wrap = h(`<div class="itens-editor">
    <div class="item-form">
      <div class="if-field if-prod"><label>Produto / Serviço</label><div class="if-combo"></div></div>
      <div class="if-field"><label>Qtd</label><input class="if-qtd" value="1" inputmode="decimal"></div>
      <div class="if-field"><label>Vlr Unitário</label><input class="if-vu money-in" placeholder="0,00"></div>
      <div class="if-field"><label>Desconto</label><input class="if-de money-in" placeholder="0,00"></div>
      <button class="btn btn-primary if-add">${ic("plus", 15)}<span>Adicionar</span></button>
    </div>
    <table class="itens-grid"><thead><tr><th>#</th><th>Produto / Serviço</th><th class="r">Qtd</th><th class="r">Vlr Unit.</th><th class="r">Desc.</th><th class="r">Líquido</th><th></th></tr></thead><tbody class="ig-body"></tbody></table>
    <div class="ig-empty muted small">Nenhum item adicionado ainda.</div>
  </div>`);
  const comboBox = wrap.querySelector(".if-combo");
  const qtd = wrap.querySelector(".if-qtd"), vu = wrap.querySelector(".if-vu"), de = wrap.querySelector(".if-de");
  const body = wrap.querySelector(".ig-body"), empty = wrap.querySelector(".ig-empty");
  bindQtd(qtd); bindMoney(vu); bindMoney(de);
  let pick = null;  // item de catálogo escolhido (se houver)
  let combo;
  const buildCombo = () => {
    combo = comboText(cat, "", {
      placeholder: "Digite ou selecione o produto/serviço", getLabel: c => c.nome, getSub: c => c.tipo,
      onInput: () => { pick = null; },
      onPick: c => { pick = c; vu.value = fmtMoney(c.preco); },
    });
    comboBox.innerHTML = ""; comboBox.appendChild(combo);
  };
  buildCombo();
  const limpa = () => { buildCombo(); qtd.value = "1"; vu.value = ""; de.value = ""; pick = null; combo._input.focus(); };
  function adicionar() {
    const desc = combo._value();
    if (!desc) { toast("Informe o produto/serviço", "err"); return; }
    itens.push({ item_catalogo_id: pick ? pick.id : null, descricao: desc, tipo: pick ? pick.tipo : "servico",
      quantidade: num(qtd.value) || 1, valor_unitario: num(vu.value), desconto: num(de.value) });
    limpa(); renderGrid(); onChange();
  }
  wrap.querySelector(".if-add").onclick = adicionar;
  de.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); adicionar(); } });
  function loadForEdit(idx) {
    const it = itens[idx]; itens.splice(idx, 1); renderGrid(); onChange();
    buildCombo(); combo._input.value = it.descricao || ""; pick = it.item_catalogo_id ? cat.find(c => c.id === it.item_catalogo_id) || null : null;
    qtd.value = fmtQtd(it.quantidade); vu.value = fmtMoney(it.valor_unitario); de.value = fmtMoney(it.desconto); combo._input.focus();
  }
  function renderGrid() {
    body.innerHTML = ""; empty.style.display = itens.length ? "none" : "";
    itens.forEach((it, idx) => {
      const liq = num(it.quantidade) * num(it.valor_unitario) - num(it.desconto);
      const tr = h(`<tr><td class="c">${idx + 1}</td>
        <td class="ig-desc">${esc(it.descricao || "")} ${it.tipo === "produto" ? '<span class="badge b-green">Produto</span>' : '<span class="badge b-orc">Serviço</span>'}</td>
        <td class="r">${fmtQtd(it.quantidade)}</td><td class="r">${money(it.valor_unitario)}</td><td class="r">${money(it.desconto)}</td>
        <td class="r"><b>${money(liq)}</b></td>
        <td class="r"><button class="ig-edit" title="Editar">${ic("edit", 14)}</button><button class="ig-del" title="Remover">${ic("trash", 14)}</button></td></tr>`);
      tr.querySelector(".ig-edit").onclick = () => loadForEdit(idx);
      tr.querySelector(".ig-del").onclick = () => { itens.splice(idx, 1); renderGrid(); onChange(); };
      body.appendChild(tr);
    });
    injectIcons(body);
  }
  renderGrid();
  return { el: wrap, render: renderGrid };
}

/* ----------------------------------------------------------------- documento form */
function statusOptions(tipo, current) { return (tipo === "os" ? B.status_os : B.status_orcamento).map(s => `<option ${s === current ? "selected" : ""}>${s}</option>`).join(""); }
/* seletor Pessoa + Veículo (veículo amarrado à pessoa) — reutilizado nos forms de documento */
function pickerPessoaVeiculo(cliBox, veiBox, clientes, veiculos, cliId, veiId) {
  let cliCombo, veiCombo;
  const filtra = cid => {
    const lista = cid ? veiculos.filter(v => String(v.cliente_id) === String(cid)) : veiculos.slice();
    veiCombo._setItems(lista);
    const cur = veiCombo._value();
    if (cur && cid && !lista.some(v => String(v.id) === String(cur))) veiCombo._setValue(null);
  };
  cliCombo = comboSelect(clientes, cliId || null, {
    placeholder: "Buscar/selecionar pessoa...", getLabel: c => c.nome, getSub: c => c.cpf_cnpj || c.telefone || "",
    onSelect: cid => filtra(cid),
    onCreate: txt => formCliente(null, { prefill: { nome: txt }, onSaved: c => { clientes.push(c); cliCombo._setItems(clientes); cliCombo._setValue(c.id); filtra(c.id); } }),
  });
  cliBox.appendChild(cliCombo);
  veiCombo = comboSelect(cliId ? veiculos.filter(v => String(v.cliente_id) === String(cliId)) : veiculos.slice(), veiId || null, {
    placeholder: "Buscar/selecionar veículo...", getLabel: v => v.placa, getSub: v => `${v.marca || ""} ${v.modelo || ""}`.trim(),
    onSelect: vid => { const v = veiculos.find(x => String(x.id) === String(vid)); if (v && v.cliente_id) cliCombo._setValue(v.cliente_id); },
    onCreate: txt => formVeiculo(null, clientes, { prefill: { placa: txt.toUpperCase(), cliente_id: cliCombo._value() || null }, onSaved: v => { veiculos.push(v); if (v.cliente_id) cliCombo._setValue(v.cliente_id); filtra(cliCombo._value()); veiCombo._setValue(v.id); } }),
  });
  veiBox.appendChild(veiCombo);
  return { cliCombo, veiCombo };
}

/* picker de orçamento (efetivar/importar). onPick recebe o documento completo do orçamento. */
async function escolherOrcamento(onPick) {
  const orcs = (await api("list_documentos", { tipo: "orcamento" })).filter(o => !["Recusado", "Cancelado"].includes(o.status));
  const m = h(`<div class="modal" style="width:560px"><button class="close">×</button><h3>Importar orçamento</h3>
    <p class="muted" style="margin:0 0 12px">Selecione um orçamento para usar como referência.</p>
    <div id="ol" style="max-height:52vh;overflow:auto"></div></div>`);
  const bg = openModal(m); m.querySelector(".close").onclick = () => bg.remove();
  const ol = m.querySelector("#ol");
  if (!orcs.length) { ol.appendChild(h(`<div class="empty">Nenhum orçamento disponível.</div>`)); return; }
  const list = h(`<div class="list-rows"></div>`);
  orcs.forEach(o => {
    const r = h(`<div class="list-row" style="cursor:pointer"><div class="grow"><div style="font-weight:700">${esc(o.numero)} <span class="badge ${statusClass(o.status)}">${esc(o.status)}</span></div>
      <div class="small muted">${esc(o.cliente_nome || "-")} · ${esc(o.veiculo_placa || "-")} · ${fmtDate(o.data_abertura)}</div></div><span class="money">${money(o.total)}</span></div>`);
    r.onclick = async () => { const full = await api("get_documento", o.id); bg.remove(); onPick(full); };
    list.appendChild(r);
  });
  ol.appendChild(list); injectIcons(ol);
}

/* compat: dispatcher antigo. Abre o form conforme o tipo do documento. */
function openDocForm(id) {
  if (!id) return openOS(null);
  api("get_documento", id).then(d => { if (d && d.tipo === "orcamento") formOrcamento(id); else openOS(id); });
}

/* mapeia itens do orçamento -> linhas de itens */
function itensDoOrcamento(orc) {
  return (orc.itens || []).map(it => ({ item_catalogo_id: it.item_catalogo_id, descricao: it.descricao, tipo: it.tipo,
    quantidade: it.quantidade, valor_unitario: it.valor_unitario, desconto: it.desconto }));
}

/* ----------------------------------------------------------------- ORÇAMENTO (CRUD próprio) */
async function formOrcamento(id, opts) {
  opts = opts || {};
  setActive("orcamentos");
  let [clientes, veiculos, cat] = await Promise.all([api("list_clientes"), api("list_veiculos"), api("list_itens")]);
  const doc = id ? await api("get_documento", id) : Object.assign({
    tipo: "orcamento", status: "Aberto", prioridade: "Normal", data_abertura: nowLocal(),
    cliente_id: "", veiculo_id: "", desconto_geral: 0, desconto_tipo: "valor", acrescimo: 0, itens: [],
    forma_pagamento: "", validade: "", observacoes: (B.empresa && B.empresa.termos_padrao) || "",
    usuario_id: (CURRENT_USER && CURRENT_USER.id) || null,
  }, opts.prefill || {});
  const itens = (doc.itens || []).map(i => ({ ...i }));
  // novo orçamento: validade derivada da preferência atual; edição: preserva a validade já gravada
  const valTxt = (id && doc.validade) ? doc.validade : validadeTexto();
  render(`
    <div class="between"><div class="row"><button class="btn btn-sm" id="back">${ic("back", 16)}</button>
      <div><h1 class="page-title" style="font-size:24px">${id ? "Editar" : "Novo"} Orçamento ${doc.expirado ? '<span class="badge b-late" style="font-size:12px;vertical-align:middle">Expirado</span>' : ""}</h1><p class="page-sub" style="margin:0">Proposta comercial</p></div></div>
      ${doc.os_vinculada_id ? `<button class="btn" id="ver_os" style="align-self:center">${ic("repeat", 16)}<span>Ver O.S. ${esc(doc.os_vinculada_numero || "")}</span></button>` : ""}</div>
    <div class="card mt"><h3 class="sec-title">Dados</h3>
      <div class="grid3"><div class="field"><label>Data de Abertura</label><input type="datetime-local" id="f_data" value="${esc(dtLocalVal(doc.data_abertura) || nowLocal())}"></div>
        <div class="field"><label>Status</label><div id="c_status"></div></div>
        <div class="field"><label>Prioridade</label><div id="c_prio"></div></div></div>
      <div class="grid2"><div class="field"><label>Pessoa</label><div id="c_cli"></div></div>
        <div class="field"><label>Veículo</label><div id="c_vei"></div></div></div></div>
    <div class="card mt"><h3 class="sec-title">Itens</h3><div id="itens-box"></div>
      <hr class="sep">
      <div class="tot-line"><span class="muted">Subtotal</span><b id="t_sub">R$ 0,00</b></div>
      ${descLineHtml(doc)}
      <div class="tot-line"><span class="muted">Acréscimo</span><input id="f_acr" class="money-in" style="width:150px;text-align:right" value="${doc.acrescimo || 0}"></div>
      <div class="tot-line"><span class="big">TOTAL</span><span class="big" id="t_total">R$ 0,00</span></div></div>
    <div class="card mt"><h3 class="sec-title">Condições</h3>
      <div class="grid2"><div class="field"><label>Forma de Pagamento</label><div id="c_pag"></div></div>
        <div class="field"><label>Validade</label><input id="f_val" readonly value="${esc(valTxt)}"><span class="hint muted small">Definida em Configurações → Preferências</span></div></div>
      <div class="field"><label>Observações</label><textarea id="f_obs">${esc(doc.observacoes || "")}</textarea></div></div>
    <div class="between mt" style="margin-bottom:30px"><button class="btn" id="cancel">Cancelar</button>
      <div class="row">${id && !["Aprovado", "Recusado", "Cancelado"].includes(doc.status) ? `<button class="btn" id="efetivar">${ic("repeat", 16)}<span>Efetivar (criar O.S.)</span></button>` : ""}
      <button class="btn btn-primary" id="salvar">${ic("save", 16)}<span>Salvar Orçamento</span></button></div></div>`);
  const statusCombo = selectCombo(B.status_orcamento, doc.status || "Aberto", null); main().querySelector("#c_status").appendChild(statusCombo);
  const prioCombo = selectCombo(B.prioridades, doc.prioridade || "Normal", null); main().querySelector("#c_prio").appendChild(prioCombo);
  const pagCombo = selectCombo(["—"].concat(B.formas_pagamento), doc.forma_pagamento || "—", null); main().querySelector("#c_pag").appendChild(pagCombo);
  const { cliCombo, veiCombo } = pickerPessoaVeiculo(main().querySelector("#c_cli"), main().querySelector("#c_vei"), clientes, veiculos, doc.cliente_id, doc.veiculo_id);
  let getDescTipo = () => (doc.desconto_tipo === "percent" ? "percent" : "valor");
  const recalc = () => {
    const sub = itens.reduce((a, it) => a + (num(it.quantidade) * num(it.valor_unitario) - num(it.desconto)), 0);
    main().querySelector("#t_sub").textContent = money(sub);
    const desc = descResolvido(sub, getDescTipo());
    const eq = main().querySelector("#desc_eq"); if (eq) eq.textContent = getDescTipo() === "percent" ? "= " + money(desc) : "";
    main().querySelector("#t_total").textContent = money(sub - desc + num(val("#f_acr")));
  };
  const ed = itensEditor(itens, cat, recalc); main().querySelector("#itens-box").appendChild(ed.el);
  getDescTipo = bindDescLine(recalc, doc.desconto_tipo);
  const fa = main().querySelector("#f_acr"); bindMoney(fa); fa.oninput = recalc; recalc();
  const payloadDe = () => ({ id: doc.id, tipo: "orcamento", status: statusCombo._value(), prioridade: prioCombo._value(), data_abertura: val("#f_data"),
    usuario_id: doc.usuario_id || (CURRENT_USER && CURRENT_USER.id) || null,
    cliente_id: cliCombo._value() || null, veiculo_id: veiCombo._value() || null,
    desconto_geral: num(val("#f_desc")), desconto_tipo: getDescTipo(), acrescimo: num(val("#f_acr")),
    forma_pagamento: pagCombo._value() === "—" ? "" : pagCombo._value(), validade: valTxt, observacoes: val("#f_obs"),
    itens: itens.map(it => ({ item_catalogo_id: it.item_catalogo_id, descricao: it.descricao, tipo: it.tipo, quantidade: num(it.quantidade), valor_unitario: num(it.valor_unitario), desconto: num(it.desconto) })), lataria: [] });
  main().querySelector("#back").onclick = () => setView("orcamentos");
  main().querySelector("#cancel").onclick = () => setView("orcamentos");
  const verOs = main().querySelector("#ver_os");
  if (verOs) verOs.onclick = () => openOS(doc.os_vinculada_id);
  const exigePessoa = () => { if (!cliCombo._value()) { toast("Selecione a pessoa do orçamento.", "err"); return false; } return true; };
  main().querySelector("#salvar").onclick = async () => {
    if (!exigePessoa()) return;
    const saved = await api("save_documento", payloadDe()); toast("Orçamento salvo: " + saved.numero, "ok");
    if (opts.onSaved) opts.onSaved(saved); else setView("orcamentos");
  };
  // efetivar do form: salva as edições pendentes primeiro, depois efetiva o orçamento salvo
  const ef = main().querySelector("#efetivar");
  if (ef) ef.onclick = async () => { if (!exigePessoa()) return; const saved = await api("save_documento", payloadDe()); efetivarOrcamento(saved); };
}

/* efetivar um orçamento -> cria a O.S. (Aberta) com os itens carregados para a entrada.
   O orçamento só é marcado 'Aprovado' quando a O.S. é efetivamente salva (ver openOS.salvar). */
async function efetivarOrcamento(orc) {
  if (!await confirma(`Efetivar o orçamento ${esc(orc.numero)} e criar uma Ordem de Serviço?`, { ok: "Efetivar" })) return;
  const full = orc.itens ? orc : await api("get_documento", orc.id);
  openOS(null, { prefill: {
    cliente_id: full.cliente_id, veiculo_id: full.veiculo_id, origem_orcamento_id: full.id,
    desconto_geral: full.desconto_geral, desconto_tipo: full.desconto_tipo, acrescimo: full.acrescimo, forma_pagamento: full.forma_pagamento,
    observacoes: full.observacoes, itens: itensDoOrcamento(full),
  }, fromOrcamento: full.numero });
}

/* ----------------------------------------------------------------- O.S. (fluxo guiado por estado) */
async function openOS(id, opts) {
  opts = opts || {};
  setActive("documentos");
  let [clientes, veiculos, cat] = await Promise.all([api("list_clientes"), api("list_veiculos"), api("list_itens")]);
  const doc = id ? await api("get_documento", id) : Object.assign({
    tipo: "os", status: opts.faturada ? "Faturada" : "Aberta", prioridade: "Normal", data_abertura: nowLocal(), previsao: "", ordem_compra: "",
    cliente_id: "", veiculo_id: "", km_entrada: "", desconto_geral: 0, desconto_tipo: "valor", acrescimo: 0, itens: [], lataria: [],
    forma_pagamento: "", observacoes: "", estado_geral: "", nivel_combustivel: "", obs_entrada: "", ocorrencia: "",
    parecer_mecanico: "", mecanico: "", faturado_em: "", origem_orcamento_id: null,
    item_chave_principal: 0, item_chave_reserva: 0, item_documento: 0, item_manual: 0,
    usuario_id: (CURRENT_USER && CURRENT_USER.id) || null,
  }, opts.prefill || {});
  const st = doc.status;
  const ocExige = String((B.preferencias || {}).os_exige_oc) === "1";  // exige Nº O.C. no faturamento
  const itens = (doc.itens || []).map(i => ({ ...i }));
  const latMap = {}; (doc.lataria || []).forEach(p => latMap[p.peca] = p.estado);
  let nivelSel = doc.nivel_combustivel || "";
  const isAberta = st === "Aberta", isExec = st === "Em Execução", isConcl = st === "Concluída",
        isFat = st === "Faturada", isCancel = st === "Cancelada";
  const verItens = !isAberta;                 // serviços a partir de Em Execução
  const verParecer = isConcl || isFat;
  const verFatur = isConcl || isFat;
  const colapsado = !isAberta;                // checklist/observações iniciam minimizados após a abertura
  const travada = isFat && !!id;              // O.S. faturada existente: somente leitura
  const respNome = doc.usuario_nome || (CURRENT_USER && (CURRENT_USER.nome || CURRENT_USER.login)) || "—";
  const titulo = id ? "Ordem de Serviço" : (opts.faturada ? "Nova O.S. (faturada)" : "Nova Ordem de Serviço");
  const passos = [["Aberta", "Entrada"], ["Em Execução", "Execução"], ["Concluída", "Aguard. Faturamento"], ["Faturada", "Faturada"]];
  const idxAtual = passos.findIndex(p => p[0] === st);

  render(`
    <div class="between"><div class="row"><button class="btn btn-sm" id="back">${ic("back", 16)}</button>
      <div><h1 class="page-title" style="font-size:24px">${titulo}${id ? " " + esc(doc.numero) : ""}</h1>
        <p class="page-sub" style="margin:0">${esc(doc.cliente_nome || "Nova")} ${doc.veiculo_placa ? "· " + esc(doc.veiculo_placa) : ""}${opts.fromOrcamento ? " · do orçamento " + esc(opts.fromOrcamento) : ""}</p></div></div>
      <span style="align-self:center;display:inline-flex;gap:10px;align-items:center">${doc.origem_orcamento_id ? `<button class="btn btn-sm" id="ver_orc">${ic("doc", 15)}<span>Ver orçamento ${esc(doc.origem_numero || "")}</span></button>` : ""}<span class="badge ${statusClass(st)}" style="font-size:13px;padding:6px 12px">${esc(st)}</span>${lateBadge(doc)}</span></div>

    <div class="wiz-steps mt" id="osstep">${passos.map((p, i) => `<span class="wiz-pill ${i === idxAtual ? "on" : i < idxAtual ? "done" : ""}">${i + 1}. ${esc(p[1])}</span>`).join("")} ${isCancel ? '<span class="wiz-pill" style="background:#fee2e2;color:#991b1b">Cancelada</span>' : ""}</div>

    <div class="card mt"><div class="between"><h3 class="sec-title" style="margin:0">Dados da Entrada</h3>
      ${(!id && !opts.faturada) || (id && verItens && !isFat) ? `<button class="btn btn-sm" id="importar">${ic("repeat", 15)}<span>Importar orçamento</span></button>` : ""}</div>
      <div class="grid3 mt"><div class="field"><label>Data de Abertura</label><input type="datetime-local" id="f_data" value="${esc(dtLocalVal(doc.data_abertura) || nowLocal())}"></div>
        <div class="field"><label>Prioridade</label><div id="c_prio"></div></div>
        <div class="field"><label>Responsável</label><input value="${esc(respNome)}" readonly></div></div>
      <div class="grid2"><div class="field"><label>Pessoa</label><div id="c_cli"></div></div>
        <div class="field"><label>Veículo</label><div id="c_vei"></div></div></div>
      <div class="grid3"><div class="field"><label>KM Entrada</label><input id="f_km" value="${esc(doc.km_entrada || "")}" placeholder="Ex: 45000"></div>
        <div class="field"><label>Previsão de Entrega</label><input type="datetime-local" id="f_prev" value="${esc(dtLocalVal(doc.previsao))}"><span class="hint muted small">Opcional — sinaliza atraso</span></div>
        <div class="field"><label>Nº Ordem de Compra${ocExige ? " *" : ""}</label><input id="f_oc" value="${esc(doc.ordem_compra || "")}" placeholder="${ocExige ? "Exigida no faturamento" : "Opcional"}"></div></div></div>

    <div class="card mt acc${colapsado ? " collapsed" : ""}" data-acc><div class="acc-head"><h3 class="sec-title" style="margin:0">Checklist de Entrada</h3>${ic("chevron", 18)}</div>
      <div class="acc-body"><div class="muted small" style="margin:8px 0">Marque o estado de cada item da lataria.</div>
      <div class="checklist-grid" id="lataria"></div>
      <div class="grid2 mt"><div class="field"><label>Estado Geral</label><div id="c_estado"></div></div>
        <div class="field"><label>Nível de Combustível</label><div class="chips" id="nivel"></div></div></div>
      <div class="field"><label>Itens Entregues</label><div class="checks">
        <label><input type="checkbox" id="c_chave" ${doc.item_chave_principal ? "checked" : ""}> Chave Principal</label>
        <label><input type="checkbox" id="c_reserva" ${doc.item_chave_reserva ? "checked" : ""}> Chave Reserva</label>
        <label><input type="checkbox" id="c_doc" ${doc.item_documento ? "checked" : ""}> Documento</label>
        <label><input type="checkbox" id="c_manual" ${doc.item_manual ? "checked" : ""}> Manual</label></div></div></div></div>

    <div class="card mt acc${colapsado ? " collapsed" : ""}" data-acc><div class="acc-head"><h3 class="sec-title" style="margin:0">Ocorrência e Observações</h3>${ic("chevron", 18)}</div>
      <div class="acc-body"><div class="field" style="margin-top:8px"><label>Ocorrência (relato do cliente)</label><textarea id="f_ocor" placeholder="Ex: barulho na suspensão ao passar em lombadas...">${esc(doc.ocorrencia || "")}</textarea></div>
      <div class="field"><label>Observações de Entrada</label><textarea id="f_obsent">${esc(doc.obs_entrada || "")}</textarea></div></div></div>

    <div class="card mt" id="card-itens" style="${verItens ? "" : "display:none"}"><h3 class="sec-title">Serviços e Produtos</h3><div id="itens-box"></div>
      <hr class="sep">
      <div class="tot-line"><span class="muted">Subtotal</span><b id="t_sub">R$ 0,00</b></div>
      ${descLineHtml(doc)}
      <div class="tot-line"><span class="muted">Acréscimo</span><input id="f_acr" class="money-in" style="width:150px;text-align:right" value="${doc.acrescimo || 0}"></div>
      <div class="tot-line"><span class="big">TOTAL</span><span class="big" id="t_total">R$ 0,00</span></div></div>

    <div class="card mt" id="card-parecer" style="${verParecer ? "" : "display:none"}"><h3 class="sec-title">Parecer Técnico</h3>
      <div class="field"><label>Mecânico responsável</label><input id="f_mec" value="${esc(doc.mecanico || "")}" placeholder="Nome do mecânico (opcional)"></div>
      <div class="field"><label>Parecer do mecânico</label><textarea id="f_parecer" placeholder="O que foi diagnosticado/executado (opcional)...">${esc(doc.parecer_mecanico || "")}</textarea></div></div>

    <div class="card mt" id="card-fatur" style="${verFatur ? "" : "display:none"}"><h3 class="sec-title">Faturamento</h3>
      <div class="grid3"><div class="field"><label>Forma de Pagamento</label><div id="c_pag"></div></div>
        <div class="field"><label>Data de Faturamento</label><input type="datetime-local" id="f_fatdata" value="${esc(dtLocalVal(doc.faturado_em) || dtLocalVal(doc.data_abertura) || nowLocal())}"></div></div>
      <div class="field"><label>Observações</label><textarea id="f_obs">${esc(doc.observacoes || "")}</textarea></div></div>

    <div class="between mt" style="margin-bottom:30px"><button class="btn" id="cancelar">${ic("back", 15)}<span>Voltar</span></button>
      <div class="row" id="acoes"></div></div>`);

  const prioCombo = selectCombo(B.prioridades, doc.prioridade || "Normal", null); main().querySelector("#c_prio").appendChild(prioCombo);
  const estadoCombo = selectCombo(["—"].concat(B.estado_geral), doc.estado_geral || "—", null); main().querySelector("#c_estado").appendChild(estadoCombo);
  const pagCombo = selectCombo(["—"].concat(B.formas_pagamento), doc.forma_pagamento || "—", null); main().querySelector("#c_pag").appendChild(pagCombo);
  const { cliCombo, veiCombo } = pickerPessoaVeiculo(main().querySelector("#c_cli"), main().querySelector("#c_vei"), clientes, veiculos, doc.cliente_id, doc.veiculo_id);

  // checklist repaginado
  const latBox = main().querySelector("#lataria");
  B.pecas.forEach(peca => {
    const cur = latMap[peca] || "";
    const row = h(`<div class="cl-item"><span class="cl-nm">${esc(peca)}</span>
      <span class="seg"><button class="ok ${cur === "OK" ? "on" : ""}">OK</button><button class="av ${cur === "Avaria" ? "on" : ""}">Avaria</button></span></div>`);
    const ok = row.querySelector(".ok"), av = row.querySelector(".av");
    ok.onclick = () => { latMap[peca] = latMap[peca] === "OK" ? "" : "OK"; ok.classList.toggle("on", latMap[peca] === "OK"); av.classList.remove("on"); row.classList.remove("avaria"); if (latMap[peca] === "OK") row.classList.add("okk"); else row.classList.remove("okk"); };
    av.onclick = () => { latMap[peca] = latMap[peca] === "Avaria" ? "" : "Avaria"; av.classList.toggle("on", latMap[peca] === "Avaria"); ok.classList.remove("on"); row.classList.remove("okk"); row.classList.toggle("avaria", latMap[peca] === "Avaria"); };
    if (cur === "Avaria") row.classList.add("avaria"); else if (cur === "OK") row.classList.add("okk");
    latBox.appendChild(row);
  });
  const nivBox = main().querySelector("#nivel");
  B.niveis_combustivel.forEach(n => {
    const c = h(`<span class="chip ${n === nivelSel ? "on" : ""}">${n}</span>`);
    c.onclick = () => { nivelSel = nivelSel === n ? "" : n; nivBox.querySelectorAll(".chip").forEach(x => x.classList.toggle("on", x.textContent === nivelSel)); };
    nivBox.appendChild(c);
  });

  // itens (serviços)
  let getDescTipo = () => (doc.desconto_tipo === "percent" ? "percent" : "valor");
  const recalc = () => {
    const sub = itens.reduce((a, it) => a + (num(it.quantidade) * num(it.valor_unitario) - num(it.desconto)), 0);
    const ts = main().querySelector("#t_sub"); if (!ts) return;
    ts.textContent = money(sub);
    const desc = descResolvido(sub, getDescTipo());
    const eq = main().querySelector("#desc_eq"); if (eq) eq.textContent = getDescTipo() === "percent" ? "= " + money(desc) : "";
    main().querySelector("#t_total").textContent = money(sub - desc + num(val("#f_acr")));
  };
  const ed = itensEditor(itens, cat, recalc); main().querySelector("#itens-box").appendChild(ed.el);
  getDescTipo = bindDescLine(recalc, doc.desconto_tipo);
  const fa = main().querySelector("#f_acr"); bindMoney(fa); fa.oninput = recalc; recalc();

  // payload do estado atual do formulário (com status escolhido)
  const payloadDe = (status) => ({
    id: doc.id, tipo: "os", status, prioridade: prioCombo._value(), data_abertura: val("#f_data"),
    usuario_id: doc.usuario_id || (CURRENT_USER && CURRENT_USER.id) || null,
    cliente_id: cliCombo._value() || null, veiculo_id: veiCombo._value() || null, km_entrada: val("#f_km"),
    previsao: val("#f_prev"), ordem_compra: val("#f_oc"),
    desconto_geral: num(val("#f_desc")), desconto_tipo: getDescTipo(), acrescimo: num(val("#f_acr")),
    forma_pagamento: pagCombo._value() === "—" ? "" : pagCombo._value(), prazo_execucao: doc.prazo_execucao || "", validade: doc.validade || "",
    observacoes: val("#f_obs"), estado_geral: estadoCombo._value() === "—" ? "" : estadoCombo._value(), nivel_combustivel: nivelSel,
    obs_entrada: val("#f_obsent"), ocorrencia: val("#f_ocor"), mecanico: val("#f_mec"), parecer_mecanico: val("#f_parecer"),
    origem_orcamento_id: doc.origem_orcamento_id || null,
    faturado_em: status === "Faturada" ? (val("#f_fatdata") || doc.data_abertura) : "",
    item_chave_principal: main().querySelector("#c_chave").checked ? 1 : 0,
    item_chave_reserva: main().querySelector("#c_reserva").checked ? 1 : 0,
    item_documento: main().querySelector("#c_doc").checked ? 1 : 0,
    item_manual: main().querySelector("#c_manual").checked ? 1 : 0,
    itens: itens.map(it => ({ item_catalogo_id: it.item_catalogo_id, descricao: it.descricao, tipo: it.tipo, quantidade: num(it.quantidade), valor_unitario: num(it.valor_unitario), desconto: num(it.desconto) })),
    lataria: B.pecas.map(p => ({ peca: p, estado: latMap[p] || "" })),
  });
  const validaPessoa = () => { if (!cliCombo._value()) { toast("Selecione a pessoa", "err"); return false; } return true; };
  const salvar = async (status, msg) => {
    if (!validaPessoa()) return null;
    if (status === "Faturada" && ocExige && !val("#f_oc")) {
      toast("Informe o Nº da Ordem de Compra para faturar (exigido nas preferências).", "err"); return null;
    }
    const saved = await api("save_documento", payloadDe(status));
    // só agora (O.S. realmente criada) o orçamento de origem é marcado como Aprovado
    if (!id && doc.origem_orcamento_id) { try { await api("set_status", { id: doc.origem_orcamento_id, status: "Aprovado" }); } catch (e) {} }
    toast(msg || ("O.S. salva: " + saved.numero), "ok"); return saved;
  };

  // ações por estágio
  const acoes = main().querySelector("#acoes");
  const addBtn = (label, icon, fn, cls) => { const b = btn(label, icon, fn, cls || ""); acoes.appendChild(b); return b; };
  if (isAberta) {
    addBtn("Comprovante de Entrada", "printer", async () => { const s = await salvar(st); if (s) imprimirRecebimento(s.id); });
    addBtn("Salvar", "save", async () => { const s = await salvar(st); if (s) setView("documentos"); });
    addBtn("Iniciar Execução", "trending", async () => { const s = await salvar("Em Execução", "Em execução"); if (s) openOS(s.id); }, "btn-primary");
  } else if (isExec) {
    addBtn("Imprimir O.S.", "printer", async () => { const s = await salvar(st); if (s) printDocumento(s.id); });
    addBtn("Salvar", "save", async () => { const s = await salvar(st); if (s) setView("documentos"); });
    addBtn("Concluir Serviço", "trending", async () => { const s = await salvar("Concluída", "Aguardando faturamento"); if (s) openOS(s.id); }, "btn-primary");
  } else if (isConcl) {
    addBtn("Salvar", "save", async () => { const s = await salvar(st); if (s) setView("documentos"); });
    addBtn("Faturar e Imprimir O.S.", "dollar", async () => {
      if (!itens.length) { toast("Adicione ao menos um serviço antes de faturar.", "err"); return; }
      if (!await confirma("Confirmar o faturamento desta O.S.?", { ok: "Faturar" })) return;
      const s = await salvar("Faturada", "O.S. faturada"); if (s) { printDocumento(s.id); openOS(s.id); }
    }, "btn-primary");
  } else if (isFat) {
    if (travada) {  // O.S. faturada existente: somente leitura
      addBtn("Imprimir O.S.", "printer", () => printDocumento(doc.id), "btn-primary");
      addBtn("Reabrir O.S.", "repeat", async () => {
        if (!await confirma("Reabrir esta O.S.? Ela volta para 'Em Execução' (o parecer do mecânico é mantido).", { ok: "Reabrir" })) return;
        try { await api("set_status", { id: doc.id, status: "Em Execução" }); openOS(doc.id); } catch (e) {}
      });
    } else {  // nova O.S. lançada já faturada: editável
      addBtn("Imprimir O.S.", "printer", async () => { const s = await salvar(st); if (s) printDocumento(s.id); });
      addBtn("Salvar", "save", async () => { const s = await salvar(st); if (s) setView("documentos"); }, "btn-primary");
    }
  } else if (isCancel) {
    addBtn("Reabrir O.S.", "repeat", async () => { if (!await confirma("Reabrir esta O.S. (volta para Aberta)?")) return; const s = await salvar("Aberta"); if (s) openOS(s.id); });
  } else {
    addBtn("Salvar", "save", async () => { const s = await salvar(st); if (s) setView("documentos"); }, "btn-primary");
  }

  main().querySelector("#back").onclick = () => setView("documentos");
  main().querySelector("#cancelar").onclick = () => setView("documentos");
  const vorc = main().querySelector("#ver_orc");
  if (vorc) vorc.onclick = () => formOrcamento(doc.origem_orcamento_id);
  const imp = main().querySelector("#importar");
  if (imp) imp.onclick = () => escolherOrcamento(orc => {
    // regra: assume o cliente e o veículo do orçamento; os produtos são ADICIONADOS aos itens atuais
    cliCombo._setValue(orc.cliente_id); if (orc.cliente_id) { const lista = veiculos.filter(v => String(v.cliente_id) === String(orc.cliente_id)); veiCombo._setItems(lista); }
    veiCombo._setValue(orc.veiculo_id);
    itensDoOrcamento(orc).forEach(it => itens.push(it)); ed.render(); recalc();
    doc.origem_orcamento_id = orc.id;
    toast("Orçamento " + orc.numero + " importado" + (verItens ? "" : " — os serviços aparecem ao iniciar a execução"), "ok");
  });
  // acordeão: clicar no cabeçalho expande/recolhe (checklist e observações)
  main().querySelectorAll(".acc[data-acc] .acc-head").forEach(hd => hd.onclick = () => hd.parentElement.classList.toggle("collapsed"));
  // O.S. faturada existente: somente leitura (cabeçalhos do acordeão continuam clicáveis p/ visualizar)
  if (travada) {
    main().querySelectorAll(".card").forEach(c => c.classList.add("os-locked"));
    main().querySelectorAll(".item-form").forEach(el => el.style.display = "none");
  }
}

/* ----------------------------------------------------------------- print */
async function printDocumento(id) {
  const r = await api("print_documento", id);
  const f = document.getElementById("print-frame"); f.srcdoc = r.html;
  f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast("Falha ao imprimir", "err"); } };
}
async function imprimirRecebimento(id) {
  const r = await api("print_recebimento", id);
  const f = document.getElementById("print-frame"); f.srcdoc = r.html;
  f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast("Falha ao imprimir", "err"); } };
}
async function printPreview(id) {
  const r = await api("print_documento", id);
  const m = h(`<div class="modal" style="width:880px"><button class="close">×</button><h3>${esc(r.numero)}</h3>
    <iframe style="width:100%;height:64vh;border:1px solid #e5e7eb;border-radius:8px"></iframe>
    <div class="between mt"><button class="btn" id="fechar">Fechar</button><button class="btn btn-primary" id="imp">${ic("printer", 16)}<span>Imprimir / Salvar PDF</span></button></div></div>`);
  const bg = openModal(m); m.querySelector("iframe").srcdoc = r.html;
  m.querySelector(".close").onclick = () => bg.remove(); m.querySelector("#fechar").onclick = () => bg.remove();
  m.querySelector("#imp").onclick = () => { const fr = m.querySelector("iframe"); fr.contentWindow.focus(); fr.contentWindow.print(); };
}

/* ----------------------------------------------------------------- pessoas (clientes) */
async function viewClientes() {
  const mode = vmode("clientes", "cards");
  render(`<div class="between"><div><h1 class="page-title">Pessoas</h1><p class="page-sub">Gerencie o cadastro de pessoas</p></div>
      <div class="row"><span id="vt"></span><button class="btn btn-primary" id="novo">${ic("plus", 16)}<span>Nova Pessoa</span></button></div></div>
    <div class="card"><div class="search">${ic("search", 16)}<input id="q" placeholder="Buscar por nome, CPF/CNPJ ou telefone..."></div></div>
    <div id="lista" class="mt"></div>`);
  main().querySelector("#vt").appendChild(viewToggle("clientes", mode, [{ v: "cards", icon: "grid", title: "Blocos" }, { v: "list", icon: "list", title: "Lista" }], () => viewClientes()));
  async function reload() {
    const cs = await api("list_clientes", val("#q"));
    const lst = main().querySelector("#lista"); lst.innerHTML = "";
    if (!cs.length) { lst.appendChild(emptyState("users", "Nenhuma pessoa cadastrada", "Cadastre pessoas para vinculá-las às ordens e orçamentos.", "Nova Pessoa", () => formCliente(null))); return; }
    if (mode === "list") {
      const list = h(`<div class="list-rows"></div>`);
      cs.forEach(c => {
        const r = h(`<div class="list-row"><div class="avatar blue">${ic("user", 22)}</div><div class="grow">
          <div style="font-weight:700">${esc(c.nome)}</div><div class="small muted">${esc(c.cpf_cnpj || "")} ${c.telefone ? "· " + esc(c.telefone) : ""} ${c.cidade ? "· " + esc(c.cidade) + "/" + esc(c.uf || "") : ""}</div></div>
          <div class="acts"></div></div>`);
        r.querySelector(".acts").appendChild(btn("", "edit", () => formCliente(c)));
        r.querySelector(".acts").appendChild(btn("", "trash", () => delCliente(c), "btn-danger"));
        list.appendChild(r);
      });
      lst.appendChild(list); injectIcons(lst);
    } else {
      const grid = h(`<div class="cards grid3"></div>`);
      cs.forEach(c => {
        const card = h(`<div class="card"><div class="entity-head"><div class="avatar blue">${ic("user", 22)}</div>
            <div style="min-width:0"><div style="font-weight:700;font-size:15px">${esc(c.nome)}</div><div class="small muted">${esc(c.codigo_interno || "")}${c.apelido ? " · " + esc(c.apelido) : ""}</div></div></div>
          <div class="entity-meta">
            ${c.cpf_cnpj ? `<span class="mi">${ic("doc", 14)}<span>${esc(c.cpf_cnpj)}</span></span>` : ""}
            ${c.telefone ? `<span class="mi">${ic("phone", 14)}<span>${esc(c.telefone)}</span></span>` : ""}
            ${c.email ? `<span class="mi">${ic("mail", 14)}<span>${esc(c.email)}</span></span>` : ""}
            ${c.cidade ? `<span class="mi">${ic("pin", 14)}<span>${esc(c.cidade)}/${esc(c.uf || "")}</span></span>` : ""}
          </div>
          <div class="card-foot"><button class="btn btn-sm e" title="Editar">${ic("edit", 15)}</button><button class="btn btn-sm btn-danger x" title="Excluir">${ic("trash", 15)}</button></div></div>`);
        injectIcons(card);
        card.querySelector(".e").onclick = () => formCliente(c);
        card.querySelector(".x").onclick = () => delCliente(c);
        grid.appendChild(card);
      });
      lst.appendChild(grid);
    }
  }
  main().querySelector("#novo").onclick = () => formCliente(null);
  main().querySelector("#q").addEventListener("input", reload);
  reload(); window.__reloadClientes = reload;
}
async function delCliente(c) { if (await confirma("Excluir esta pessoa?", { danger: true, ok: "Excluir" })) { await api("delete_cliente", c.id); toast("Excluída", "ok"); viewClientes(); } }
function formCliente(c, opts) {
  c = Object.assign({}, c || {}, (opts && opts.prefill) || {});
  const m = h(`<div class="modal"><button class="close">×</button><h3>${c.id ? "Editar Pessoa" : "Nova Pessoa"}</h3>
    <div class="grid2"><div class="field"><label>Nome *</label><input id="nome" value="${esc(c.nome || "")}"></div>
      <div class="field"><label>CPF/CNPJ</label><input id="cpf" value="${esc(c.cpf_cnpj || "")}"></div></div>
    <div class="grid2"><div class="field"><label>Apelido/Nome Fantasia</label><input id="apelido" value="${esc(c.apelido || "")}"></div>
      <div class="field"><label>RG/IE</label><input id="rgie" value="${esc(c.rg_ie || "")}"></div></div>
    <div class="grid2"><div class="field"><label>Telefone *</label><input id="tel" value="${esc(c.telefone || "")}"></div>
      <div class="field"><label>WhatsApp</label><input id="wpp" value="${esc(c.whatsapp || "")}"></div></div>
    <div class="field"><label>E-mail</label><input id="email" value="${esc(c.email || "")}"></div>
    <div class="grid3"><div class="field"><label>CEP</label><input id="cep" value="${esc(c.cep || "")}" placeholder="00000-000"></div>
      <div class="field" style="grid-column:span 2"><label>Endereço</label><input id="end" value="${esc(c.endereco || "")}"></div></div>
    <div class="grid2"><div class="field"><label>Número</label><input id="numero" value="${esc(c.numero || "")}"></div>
      <div class="field"><label>Bairro</label><input id="bairro" value="${esc(c.bairro || "")}"></div></div>
    <div class="grid2"><div class="field"><label>Cidade</label><div id="c_cidade"></div></div>
      <div class="field"><label>UF</label><input id="uf" value="${esc(c.uf || "")}" readonly placeholder="(definida pela cidade)"></div></div>
    <hr class="sep">
    <div class="between" style="align-items:center"><h3 class="sec-title" style="margin:0">${ic("car", 16)} Veículos</h3>
      <button class="btn btn-sm" id="addv">${ic("plus", 15)}<span>Adicionar veículo</span></button></div>
    <div id="veic-list" class="mt"></div>
    <div class="between mt"><button class="btn" id="cc">Cancelar</button><button class="btn btn-primary" id="sv">Salvar</button></div></div>`);
  const bg = openModal(m);
  bindMask(m.querySelector("#cpf"), mDoc); bindMask(m.querySelector("#tel"), mFone); bindMask(m.querySelector("#wpp"), mFone);
  const ufField = m.querySelector("#uf");
  const cidadeCombo = comboText(CITIES, c.cidade || "", {
    placeholder: "Cidade", getLabel: x => Array.isArray(x) ? x[0] : x, getSub: x => Array.isArray(x) ? x[1] : "",
    onPick: x => { if (Array.isArray(x)) ufField.value = x[1]; },
    onCreate: txt => cadastrarCidade(txt, (nm, uf) => { cidadeCombo._input.value = nm; ufField.value = uf; CITIES.push([nm, uf]); }),
    createLabel: t => `Cadastrar "${t}" (informar UF)`,
  });
  m.querySelector("#c_cidade").appendChild(cidadeCombo);
  const cep = m.querySelector("#cep"); bindMask(cep, mCEP);
  cep.addEventListener("change", () => cepLookup(cep.value, { endereco: m.querySelector("#end"), bairro: m.querySelector("#bairro"), cidade: cidadeCombo._input, uf: ufField }));

  // ----- seção de Veículos (agrupa todos os veículos desta pessoa) -----
  const veicBox = m.querySelector("#veic-list");
  async function reloadVeics() {
    veicBox.innerHTML = "";
    if (!c.id) { veicBox.appendChild(h(`<div class="muted small">Salve a pessoa para cadastrar e agrupar os veículos dela aqui.</div>`)); return; }
    const vs = await api("veiculos_cliente", c.id);
    if (!vs.length) { veicBox.appendChild(h(`<div class="muted small">Nenhum veículo cadastrado para esta pessoa.</div>`)); return; }
    const list = h(`<div class="list-rows"></div>`);
    vs.forEach(v => {
      const r = h(`<div class="list-row"><div class="avatar purple">${ic("car", 18)}</div><div class="grow">
        <div style="font-weight:700">${esc(v.placa)} <span class="muted small">${esc(v.marca || "")} ${esc(v.modelo || "")}</span></div>
        <div class="small muted">Cor: ${esc(v.cor || "-")} · Ano: ${esc(v.ano_fab || "-")}</div></div><div class="acts"></div></div>`);
      r.querySelector(".acts").appendChild(btn("", "edit", () => formVeiculo(v, null, { lockOwner: true, ownerName: val("#nome", m) || c.nome, prefill: { cliente_id: c.id }, onSaved: () => reloadVeics() })));
      r.querySelector(".acts").appendChild(btn("", "trash", () => delVeicInline(v), "btn-danger"));
      list.appendChild(r);
    });
    veicBox.appendChild(list); injectIcons(veicBox);
  }
  async function delVeicInline(v) { if (await confirma(`Excluir o veículo ${esc(v.placa)}?`, { danger: true, ok: "Excluir" })) { await api("delete_veiculo", v.id); toast("Veículo excluído", "ok"); reloadVeics(); } }
  async function salvar() {
    const payload = { id: c.id, nome: val("#nome", m), cpf_cnpj: val("#cpf", m), apelido: val("#apelido", m), rg_ie: val("#rgie", m),
      telefone: val("#tel", m), whatsapp: val("#wpp", m), email: val("#email", m), endereco: val("#end", m),
      numero: val("#numero", m), bairro: val("#bairro", m), cidade: cidadeCombo._value(), uf: ufField.value.trim(), cep: val("#cep", m) };
    if (!payload.nome || !payload.telefone) { toast("Nome e Telefone são obrigatórios", "err"); return null; }
    const saved = await api("save_cliente", payload); await refreshSug();
    c.id = saved.id; Object.assign(c, saved);
    return saved;
  }
  m.querySelector("#addv").onclick = async () => {
    if (!c.id) { const s = await salvar(); if (!s) return; toast("Pessoa salva — adicione os veículos", "ok"); await reloadVeics(); }
    formVeiculo(null, null, { lockOwner: true, ownerName: val("#nome", m) || c.nome, prefill: { cliente_id: c.id }, onSaved: () => reloadVeics() });
  };
  m.querySelector(".close").onclick = () => bg.remove(); m.querySelector("#cc").onclick = () => bg.remove();
  m.querySelector("#sv").onclick = async () => {
    const saved = await salvar();
    if (!saved) return;
    toast("Pessoa salva", "ok"); bg.remove();
    if (opts && opts.onSaved) opts.onSaved(saved); else if (window.__reloadClientes) window.__reloadClientes();
  };
  reloadVeics();
}
function dl(id, values) { return `<datalist id="${id}">${(values || []).map(v => `<option value="${esc(v)}"></option>`).join("")}</datalist>`; }

/* ----------------------------------------------------------------- veiculos */
async function viewVeiculos() {
  const mode = vmode("veiculos", "cards");
  const clientes = await api("list_clientes");
  render(`<div class="between"><div><h1 class="page-title">Veículos</h1><p class="page-sub">Gerencie o cadastro de veículos</p></div>
      <div class="row"><span id="vt"></span><button class="btn btn-primary" id="novo">${ic("plus", 16)}<span>Novo Veículo</span></button></div></div>
    <div class="card"><div class="search">${ic("search", 16)}<input id="q" placeholder="Buscar por placa, marca ou modelo..."></div></div>
    <div id="lista" class="mt"></div>`);
  main().querySelector("#vt").appendChild(viewToggle("veiculos", mode, [{ v: "cards", icon: "grid", title: "Blocos" }, { v: "list", icon: "list", title: "Lista" }], () => viewVeiculos()));
  async function reload() {
    const vs = await api("list_veiculos", val("#q"));
    const lst = main().querySelector("#lista"); lst.innerHTML = "";
    if (!vs.length) { lst.appendChild(emptyState("car", "Nenhum veículo cadastrado", "Cadastre veículos e vincule-os a um proprietário.", "Novo Veículo", () => formVeiculo(null, clientes))); return; }
    if (mode === "list") {
      const list = h(`<div class="list-rows"></div>`);
      vs.forEach(v => {
        const r = h(`<div class="list-row"><div class="avatar purple">${ic("car", 22)}</div><div class="grow">
          <div style="font-weight:700">${esc(v.placa)} <span class="muted small">${esc(v.marca || "")} ${esc(v.modelo || "")}</span></div>
          <div class="small muted">Ano: ${esc(v.ano_fab || "-")} · Cor: ${esc(v.cor || "-")} · ${esc(v.cliente_nome || "sem proprietário")}</div></div><div class="acts"></div></div>`);
        r.querySelector(".acts").appendChild(btn("", "edit", () => formVeiculo(v, clientes)));
        r.querySelector(".acts").appendChild(btn("", "trash", () => delVeiculo(v), "btn-danger"));
        list.appendChild(r);
      });
      lst.appendChild(list); injectIcons(lst);
    } else {
      const grid = h(`<div class="cards grid3"></div>`);
      vs.forEach(v => {
        const card = h(`<div class="card"><div class="entity-head"><div class="avatar purple">${ic("car", 22)}</div>
            <div style="min-width:0"><div style="font-weight:700;font-size:15px">${esc(v.placa)}</div><div class="small muted">${esc(v.marca || "")} ${esc(v.modelo || "")}</div></div></div>
          <div class="entity-meta">
            ${v.ano_fab ? `<span class="mi">${ic("tag", 14)}<span>Ano ${esc(v.ano_fab)}</span></span>` : ""}
            ${v.cor ? `<span class="mi">${ic("palette", 14)}<span>${esc(v.cor)}</span></span>` : ""}
            ${v.combustivel ? `<span class="mi">${ic("droplet", 14)}<span>${esc(v.combustivel)}</span></span>` : ""}
            <span class="mi">${ic("user", 14)}<span>${esc(v.cliente_nome || "sem proprietário")}</span></span>
          </div>
          <div class="card-foot"><button class="btn btn-sm e" title="Editar">${ic("edit", 15)}</button><button class="btn btn-sm btn-danger x" title="Excluir">${ic("trash", 15)}</button></div></div>`);
        injectIcons(card);
        card.querySelector(".e").onclick = () => formVeiculo(v, clientes);
        card.querySelector(".x").onclick = () => delVeiculo(v);
        grid.appendChild(card);
      });
      lst.appendChild(grid);
    }
  }
  main().querySelector("#novo").onclick = () => formVeiculo(null, clientes);
  main().querySelector("#q").addEventListener("input", reload);
  reload(); window.__reloadVeiculos = reload;
}
async function delVeiculo(v) { if (await confirma("Excluir este veículo?", { danger: true, ok: "Excluir" })) { await api("delete_veiculo", v.id); toast("Excluído", "ok"); viewVeiculos(); } }
function formVeiculo(v, clientes, opts) {
  opts = opts || {};
  v = Object.assign({}, v || {}, opts.prefill || {});
  const lockOwner = !!opts.lockOwner;  // dono fixo (cadastro a partir do form da Pessoa)
  const propHtml = lockOwner
    ? `<input value="${esc(opts.ownerName || "")}" readonly>`
    : `<div id="c_prop"></div>`;
  const m = h(`<div class="modal"><button class="close">×</button><h3>${v.id ? "Editar" : "Novo"} Veículo</h3>
    <div class="grid2"><div class="field"><label>Placa *</label><input id="placa" value="${esc(v.placa || "")}" placeholder="ABC1D23"></div>
      <div class="field"><label>Ano (Fab.)</label><input id="ano" value="${esc(v.ano_fab || "")}"></div></div>
    <div class="grid2"><div class="field"><label>Marca *</label><div id="c_marca"></div></div>
      <div class="field"><label>Modelo *</label><input id="modelo" value="${esc(v.modelo || "")}"></div></div>
    <div class="grid2"><div class="field"><label>Versão</label><input id="versao" value="${esc(v.versao || "")}"></div>
      <div class="field"><label>Cor</label><div id="c_cor"></div></div></div>
    <div class="grid2"><div class="field"><label>Chassi</label><input id="chassi" value="${esc(v.chassi || "")}"></div>
      <div class="field"><label>Renavam</label><input id="renavam" value="${esc(v.renavam || "")}"></div></div>
    <div class="grid2"><div class="field"><label>Combustível</label><div id="c_comb"></div></div>
      <div class="field"><label>KM Atual</label><input id="km" value="${esc(v.km_atual || "")}"></div></div>
    <div class="field"><label>Proprietário *</label>${propHtml}</div>
    <div class="between mt"><button class="btn" id="cc">Cancelar</button><button class="btn btn-primary" id="sv">Salvar</button></div></div>`);
  const bg = openModal(m);
  bindUpper(m.querySelector("#placa")); bindInt(m.querySelector("#ano")); bindInt(m.querySelector("#renavam")); bindInt(m.querySelector("#km"));
  m.querySelector("#chassi").addEventListener("input", e => e.target.value = e.target.value.toUpperCase());
  SUG.custom = SUG.custom || { marca: [], cor: [], combustivel: [] };
  const cadValor = (tipo, getCombo, listaKey, label) => async txt => {
    try { await api("add_valor", { tipo, valor: txt }); } catch (e) { return; }
    if (!SUG[listaKey].some(x => x.toLowerCase() === txt.toLowerCase())) SUG[listaKey].push(txt);
    if (!(SUG.custom[tipo] || []).some(x => x.toLowerCase() === txt.toLowerCase())) (SUG.custom[tipo] = SUG.custom[tipo] || []).push(txt);
    const c = getCombo(); c._setItems(SUG[listaKey]); c._input.value = txt; toast(label + ' cadastrado(a)', "ok");
  };
  // remove um valor de autocomplete cadastrado pelo usuário (só os custom mostram o botão de lixeira)
  const delValor = (tipo, listaKey) => async val => {
    try { await api("delete_valor", { tipo, valor: val }); } catch (e) { return false; }
    SUG[listaKey] = SUG[listaKey].filter(x => x !== val);
    SUG.custom[tipo] = (SUG.custom[tipo] || []).filter(x => x !== val);
    toast(`"${val}" removido das sugestões`, "ok");
  };
  const ehCustom = tipo => val => (SUG.custom[tipo] || []).some(x => x.toLowerCase() === String(val).toLowerCase());
  const marcaC = comboText(SUG.marcas, v.marca || "", { placeholder: "Marca", getLabel: x => x, onCreate: cadValor("marca", () => marcaC, "marcas", "Marca"), createLabel: t => `Cadastrar marca "${t}"`, deletaveis: ehCustom("marca"), onDelete: delValor("marca", "marcas") }); m.querySelector("#c_marca").appendChild(marcaC);
  const corC = comboText(SUG.cores, v.cor || "", { placeholder: "Cor", getLabel: x => x, onCreate: cadValor("cor", () => corC, "cores", "Cor"), createLabel: t => `Cadastrar cor "${t}"`, deletaveis: ehCustom("cor"), onDelete: delValor("cor", "cores") }); m.querySelector("#c_cor").appendChild(corC);
  const combC = comboText(SUG.combustiveis, v.combustivel || "", { placeholder: "Combustível", getLabel: x => x, onCreate: cadValor("combustivel", () => combC, "combustiveis", "Combustível"), createLabel: t => `Cadastrar "${t}"`, deletaveis: ehCustom("combustivel"), onDelete: delValor("combustivel", "combustiveis") }); m.querySelector("#c_comb").appendChild(combC);
  let propC = null;
  if (!lockOwner) {
    propC = comboSelect(clientes, v.cliente_id || null, { placeholder: "Buscar/selecionar pessoa...", getLabel: c => c.nome, getSub: c => c.cpf_cnpj || "",
      onCreate: txt => formCliente(null, { prefill: { nome: txt }, onSaved: c => { clientes.push(c); propC._setItems(clientes); propC._setValue(c.id); } }) });
    m.querySelector("#c_prop").appendChild(propC);
  }
  m.querySelector(".close").onclick = () => bg.remove(); m.querySelector("#cc").onclick = () => bg.remove();
  m.querySelector("#sv").onclick = async () => {
    const owner = lockOwner ? (opts.prefill && opts.prefill.cliente_id) || v.cliente_id || null : (propC._value() || null);
    const payload = { id: v.id, placa: val("#placa", m), ano_fab: val("#ano", m), marca: marcaC._value(), modelo: val("#modelo", m),
      versao: val("#versao", m), cor: corC._value(), chassi: val("#chassi", m), renavam: val("#renavam", m),
      combustivel: combC._value(), km_atual: val("#km", m), cliente_id: owner };
    if (!payload.placa || !payload.marca || !payload.modelo) { toast("Placa, Marca e Modelo são obrigatórios", "err"); return; }
    const saved = await api("save_veiculo", payload); await refreshSug(); toast("Veículo salvo", "ok"); bg.remove();
    if (opts.onSaved) opts.onSaved(saved); else if (window.__reloadVeiculos) window.__reloadVeiculos();
  };
}

/* ----------------------------------------------------------------- produtos/serviços */
async function viewProdutos() {
  const mode = vmode("produtos", "cards");
  render(`<div class="between"><div><h1 class="page-title">Produtos e Serviços</h1><p class="page-sub">Catálogo de produtos e serviços</p></div>
      <div class="row"><span id="vt"></span><button class="btn btn-primary" id="novo">${ic("plus", 16)}<span>Novo Item</span></button></div></div>
    <div class="card"><div class="search">${ic("search", 16)}<input id="q" placeholder="Buscar por nome ou descrição..."></div></div>
    <div id="lista" class="mt"></div>`);
  main().querySelector("#vt").appendChild(viewToggle("produtos", mode, [{ v: "cards", icon: "grid", title: "Blocos" }, { v: "list", icon: "list", title: "Lista" }], () => viewProdutos()));
  async function reload() {
    const its = await api("list_itens", val("#q"));
    const lst = main().querySelector("#lista"); lst.innerHTML = "";
    if (!its.length) { lst.appendChild(emptyState("box", "Nenhum item no catálogo", "Cadastre produtos e serviços para agilizar o lançamento das ordens.", "Novo Item", () => formItem(null))); return; }
    const badge = i => i.tipo === "produto" ? '<span class="badge b-green">Produto</span>' : '<span class="badge b-orc">Serviço</span>';
    if (mode === "list") {
      const list = h(`<div class="list-rows"></div>`);
      its.forEach(i => {
        const r = h(`<div class="list-row"><div class="avatar ${i.tipo === "produto" ? "green" : "amber"}">${ic(i.tipo === "produto" ? "box" : "wrench", 22)}</div><div class="grow">
          <div style="font-weight:700">${esc(i.nome)} ${badge(i)}</div><div class="small muted">${esc(i.descricao || "")}</div></div>
          <span class="money">${money(i.preco)}</span><div class="acts"></div></div>`);
        r.querySelector(".acts").appendChild(btn("", "edit", () => formItem(i)));
        r.querySelector(".acts").appendChild(btn("", "trash", () => delItem(i), "btn-danger"));
        list.appendChild(r);
      });
      lst.appendChild(list); injectIcons(lst);
    } else {
      const grid = h(`<div class="cards grid3"></div>`);
      its.forEach(i => {
        const card = h(`<div class="card"><div class="entity-head"><div class="avatar ${i.tipo === "produto" ? "green" : "amber"}">${ic(i.tipo === "produto" ? "box" : "wrench", 22)}</div>
            <div style="min-width:0"><div style="font-weight:700;font-size:15px">${esc(i.nome)} ${badge(i)}</div><div class="small muted">${esc(i.descricao || "")}</div></div></div>
          <div class="money" style="margin-top:10px;font-size:20px">${money(i.preco)}</div>
          <div class="small muted">${i.ativo ? "Ativo" : "Inativo"}</div>
          <div class="card-foot"><button class="btn btn-sm e" title="Editar">${ic("edit", 15)}</button><button class="btn btn-sm btn-danger x" title="Excluir">${ic("trash", 15)}</button></div></div>`);
        injectIcons(card);
        card.querySelector(".e").onclick = () => formItem(i);
        card.querySelector(".x").onclick = () => delItem(i);
        grid.appendChild(card);
      });
      lst.appendChild(grid);
    }
  }
  main().querySelector("#novo").onclick = () => formItem(null);
  main().querySelector("#q").addEventListener("input", reload);
  reload(); window.__reloadItens = reload;
}
async function delItem(i) { if (await confirma("Excluir este item?", { danger: true, ok: "Excluir" })) { await api("delete_item", i.id); toast("Excluído", "ok"); viewProdutos(); } }
function formItem(i) {
  i = i || { tipo: "servico", ativo: 1, preco: 0 };
  const m = h(`<div class="modal" style="width:560px"><button class="close">×</button><h3>${i.id ? "Editar" : "Novo"} Item</h3>
    <div class="field"><label>Nome *</label><input id="nome" value="${esc(i.nome || "")}"></div>
    <div class="field"><label>Descrição</label><textarea id="desc">${esc(i.descricao || "")}</textarea></div>
    <div class="grid2"><div class="field"><label>Tipo *</label><div id="c_tipo"></div></div>
      <div class="field"><label>Preço *</label><input id="preco" class="money-in" style="text-align:right" value="${fmtMoney(i.preco || 0)}"></div></div>
    <div class="field"><label>Ativo</label><div id="c_ativo"></div></div>
    <div class="muted small">O preço é apenas sugestão — pode ser alterado no momento do lançamento.</div>
    <div class="between mt"><button class="btn" id="cc">Cancelar</button><button class="btn btn-primary" id="sv">Salvar</button></div></div>`);
  const bg = openModal(m); bindMoney(m.querySelector("#preco"));
  const tipoCombo = selectCombo([{ value: "produto", label: "Produto" }, { value: "servico", label: "Serviço" }], i.tipo || "servico", null);
  m.querySelector("#c_tipo").appendChild(tipoCombo);
  const ativoCombo = selectCombo([{ value: "1", label: "Sim" }, { value: "0", label: "Não" }], i.ativo ? "1" : "0", null);
  m.querySelector("#c_ativo").appendChild(ativoCombo);
  m.querySelector(".close").onclick = () => bg.remove(); m.querySelector("#cc").onclick = () => bg.remove();
  m.querySelector("#sv").onclick = async () => {
    const payload = { id: i.id, nome: val("#nome", m), descricao: val("#desc", m), tipo: tipoCombo._value(), preco: num(val("#preco", m)), ativo: parseInt(ativoCombo._value()) };
    if (!payload.nome) { toast("Nome é obrigatório", "err"); return; }
    await api("save_item", payload); toast("Item salvo", "ok"); bg.remove(); if (window.__reloadItens) window.__reloadItens();
  };
}

/* ----------------------------------------------------------------- empresa (aba de Configurações) */
async function renderEmpresa(container) {
  const e = await api("get_empresa");
  const logo = await api("get_logo_uri");
  container.innerHTML = `
    <div class="card"><div class="logo-box">
      <div class="logo-prev ${logo.uri ? "" : "empty"}" id="logo-prev">${logo.uri ? `<img src="${logo.uri}">` : "Sem logo"}</div>
      <div><div style="font-weight:700;margin-bottom:2px">Logotipo</div><div class="muted small" style="margin-bottom:8px">Aparece no topo dos documentos impressos.</div>
        <button class="btn btn-sm" id="logo">${ic("image", 15)}<span>Escolher arquivo…</span></button>
        <button class="btn btn-sm btn-danger" id="logodel" style="${logo.uri ? "" : "display:none"}">${ic("trash", 15)}<span>Remover</span></button></div></div></div>
    <div class="card mt"><h3 class="sec-title">Identificação</h3>
      <div class="field"><label>Razão Social *</label><input id="razao" value="${esc(e.razao_social || "")}"></div>
      <div class="grid2"><div class="field"><label>Nome Fantasia</label><input id="fant" value="${esc(e.nome_fantasia || "")}"></div>
        <div class="field"><label>CNPJ</label><input id="cnpj" value="${esc(e.cnpj || "")}" placeholder="00.000.000/0000-00"></div></div>
      <div class="grid2"><div class="field"><label>Inscrição Estadual</label><input id="ie" value="${esc(e.ie || "")}"></div>
        <div class="field"><label>Slogan</label><input id="slogan" value="${esc(e.slogan || "")}"></div></div></div>
    <div class="card mt"><h3 class="sec-title">Contato</h3>
      <div class="grid3"><div class="field"><label>Telefone</label><input id="tel" value="${esc(e.telefone || "")}" placeholder="(00) 0000-0000"></div>
        <div class="field"><label>WhatsApp</label><input id="wpp" value="${esc(e.whatsapp || "")}" placeholder="(00) 00000-0000"></div>
        <div class="field"><label>E-mail</label><input id="email" value="${esc(e.email || "")}"></div></div>
      <div class="field"><label>Site</label><input id="site" value="${esc(e.site || "")}"></div></div>
    <div class="card mt"><h3 class="sec-title">Endereço</h3>
      <div class="muted small" style="margin-bottom:10px">Digite o CEP para carregar o endereço automaticamente — você ainda pode ajustar os campos.</div>
      <div class="grid3"><div class="field"><label>CEP</label><input id="cep" value="${esc(e.cep || "")}" placeholder="00000-000"></div>
        <div class="field" style="grid-column:span 2"><label>Endereço</label><input id="end" value="${esc(e.endereco || "")}"></div></div>
      <div class="grid2"><div class="field"><label>Bairro</label><input id="bairro" value="${esc(e.bairro || "")}"></div>
        <div class="field"><label>Cidade</label><div id="c_cidade"></div></div></div>
      <div class="grid2"><div class="field"><label>UF</label><input id="uf" value="${esc(e.uf || "")}" readonly placeholder="(definida pela cidade)"></div>
        <div></div></div></div>
    <div class="card mt"><h3 class="sec-title">Texto Padrão nas OS</h3>
      <div class="field"><label>Observações / Termos padrão</label><textarea id="termos">${esc(e.termos_padrao || "")}</textarea></div></div>
    <div class="card mt"><div class="between" style="align-items:center"><h3 class="sec-title" style="margin:0">Termo de Garantia</h3>
        <button class="btn btn-sm" id="gprev">${ic("eye", 15)}<span>Pré-visualizar</span></button></div>
      <div class="muted small" style="margin:4px 0 8px">Suporta <b>Markdown</b> (negrito <code>**texto**</code>, itálico <code>*texto*</code>, listas <code>-</code>, títulos <code>#</code>, links). Será incluído na abertura da Ordem de Serviço.</div>
      <textarea id="garantia" maxlength="15000" style="min-height:170px">${esc(e.termo_garantia || "")}</textarea>
      <div id="gpreview" class="md-preview" style="display:none"></div>
      <div class="muted small" id="gcount" style="text-align:right;margin-top:4px"></div></div>
    <div class="between mt" style="margin-bottom:30px"><span></span><button class="btn btn-primary" id="sv">${ic("save", 16)}<span>Salvar Dados</span></button></div>`;
  injectIcons(container);
  // máscaras de identificação/contato
  bindMask(container.querySelector("#cnpj"), mDoc);
  bindMask(container.querySelector("#tel"), mFone);
  bindMask(container.querySelector("#wpp"), mFone);
  // endereço com a mesma lógica da Pessoa: CEP -> busca; Cidade (combo) define a UF (readonly)
  const ufField = container.querySelector("#uf");
  const cidadeCombo = comboText(CITIES, e.cidade || "", {
    placeholder: "Cidade", getLabel: x => Array.isArray(x) ? x[0] : x, getSub: x => Array.isArray(x) ? x[1] : "",
    onPick: x => { if (Array.isArray(x)) ufField.value = x[1]; },
    onCreate: txt => cadastrarCidade(txt, (nm, uf) => { cidadeCombo._input.value = nm; ufField.value = uf; CITIES.push([nm, uf]); }),
    createLabel: t => `Cadastrar "${t}" (informar UF)`,
  });
  container.querySelector("#c_cidade").appendChild(cidadeCombo);
  const cep = container.querySelector("#cep"); bindMask(cep, mCEP);
  cep.addEventListener("change", () => cepLookup(cep.value, { endereco: container.querySelector("#end"), bairro: container.querySelector("#bairro"), cidade: cidadeCombo._input, uf: ufField }));
  // termo de garantia: contador + pré-visualização markdown
  const garantia = container.querySelector("#garantia"), gprev = container.querySelector("#gprev"), gpreview = container.querySelector("#gpreview"), gcount = container.querySelector("#gcount");
  const atualizaContador = () => gcount.textContent = `${garantia.value.length} / 15000`;
  garantia.addEventListener("input", atualizaContador); atualizaContador();
  let preview = false;
  gprev.onclick = () => {
    preview = !preview;
    gpreview.style.display = preview ? "" : "none";
    garantia.style.display = preview ? "none" : "";
    if (preview) gpreview.innerHTML = garantia.value.trim() ? mdToHtml(garantia.value) : '<span class="muted">Nada para pré-visualizar.</span>';
    gprev.querySelector("span").textContent = preview ? "Editar" : "Pré-visualizar";
  };
  container.querySelector("#sv").onclick = async () => {
    const payload = { razao_social: val("#razao"), nome_fantasia: val("#fant"), cnpj: val("#cnpj"), ie: val("#ie"), slogan: val("#slogan"),
      telefone: val("#tel"), whatsapp: val("#wpp"), email: val("#email"), site: val("#site"),
      endereco: val("#end"), bairro: val("#bairro"), cidade: cidadeCombo._value(), uf: ufField.value.trim(), cep: val("#cep"),
      termos_padrao: val("#termos"), termo_garantia: garantia.value };
    if (!payload.razao_social) { toast("Razão Social é obrigatória", "err"); return; }
    await api("save_empresa", payload); B.empresa = Object.assign({}, B.empresa, payload); toast("Dados salvos", "ok");
  };
  container.querySelector("#logo").onclick = async () => {
    const r = await api("escolher_logo");
    if (r && r.has_logo) { const l = await api("get_logo_uri"); const p = container.querySelector("#logo-prev"); p.classList.remove("empty"); p.innerHTML = `<img src="${l.uri}">`; container.querySelector("#logodel").style.display = ""; toast("Logo atualizado", "ok"); }
  };
  container.querySelector("#logodel").onclick = async () => {
    if (!await confirma("Remover o logotipo da empresa?", { danger: true, ok: "Remover" })) return;
    await api("remover_logo");
    const p = container.querySelector("#logo-prev"); p.classList.add("empty"); p.innerHTML = "Sem logo";
    container.querySelector("#logodel").style.display = "none"; toast("Logo removido", "ok");
  };
}

/* ----------------------------------------------------------------- configurações (abas) */
async function viewConfiguracoes(tab) {
  tab = tab || "empresa";
  setActive("config");
  render(`<h1 class="page-title">Configurações</h1><p class="page-sub">Empresa, usuários e backup do sistema</p>
    <div class="tabs" id="cfgtabs">
      <button data-tab="empresa">${ic("building", 16)}<span>Empresa</span></button>
      <button data-tab="preferencias">${ic("settings", 16)}<span>Preferências</span></button>
      <button data-tab="usuarios">${ic("shield", 16)}<span>Usuários</span></button>
      <button data-tab="backup">${ic("save", 16)}<span>Backup e Restauração</span></button>
      <button data-tab="auditoria">${ic("list", 16)}<span>Auditoria</span></button>
    </div>
    <div id="cfgbody" class="mt"></div>`);
  const tabs = main().querySelector("#cfgtabs");
  tabs.querySelectorAll("button").forEach(b => { b.classList.toggle("on", b.dataset.tab === tab); b.onclick = () => viewConfiguracoes(b.dataset.tab); });
  const body = main().querySelector("#cfgbody");
  body.innerHTML = '<div class="empty">Carregando…</div>';
  if (tab === "empresa") await renderEmpresa(body);
  else if (tab === "preferencias") await renderPreferencias(body);
  else if (tab === "usuarios") await renderUsuarios(body);
  else if (tab === "auditoria") await renderAuditoria(body);
  else renderBackup(body);
}

/* ----------------------------------------------------------------- auditoria (aba de Configurações) */
const AUDIT_ACOES = {
  criar: { lbl: "Criação", cls: "b-green" }, editar: { lbl: "Edição", cls: "b-os" },
  excluir: { lbl: "Exclusão", cls: "b-late" }, status: { lbl: "Status", cls: "b-aberta" },
  parametro: { lbl: "Parâmetro", cls: "b-orc" }, login: { lbl: "Login", cls: "b-gray" },
  logout: { lbl: "Logout", cls: "b-gray" }, login_falha: { lbl: "Login falho", cls: "b-late" },
  backup: { lbl: "Backup", cls: "b-gray" }, restaurar: { lbl: "Restauração", cls: "b-late" },
};
const AUDIT_ENT = { cliente: "Pessoa", veiculo: "Veículo", item: "Produto/Serviço", documento: "Documento",
  usuario: "Usuário", empresa: "Empresa", preferencias: "Preferências", parametro: "Parâmetro" };
function fmtAuditVal(v) { if (v === null || v === undefined || v === "") return "—"; if (typeof v === "object") return JSON.stringify(v); return String(v); }

async function renderAuditoria(container) {
  const r0 = monthRange();
  const acoes = B.audit_acoes || Object.keys(AUDIT_ACOES);
  container.innerHTML = `
    <div class="card"><div class="filtros audit-filtros">
      <div class="search">${ic("search", 16)}<input id="a_q" placeholder="Buscar na descrição, entidade ou usuário..."></div>
      <div class="fdates">
        <select id="a_user" class="pref-sel"><option value="">Todos os usuários</option></select>
        <select id="a_acao" class="pref-sel"><option value="">Todas as ações</option>${acoes.map(a => `<option value="${a}">${(AUDIT_ACOES[a] || {}).lbl || a}</option>`).join("")}</select>
        <label>De</label><input type="date" id="a_ini" value="${r0.ini}"><label>até</label><input type="date" id="a_fim" value="${r0.fim}">
        <button class="btn btn-sm" id="a_clear">Limpar</button>
      </div>
    </div></div>
    <div class="muted small audit-note">${ic("lock", 13)}<span>Somente leitura — registros de auditoria não podem ser alterados nem excluídos por ninguém. <b id="a_total"></b></span></div>
    <div id="a_lista"></div>`;
  injectIcons(container);
  const $ = s => container.querySelector(s);
  const filtros = () => ({ q: $("#a_q").value.trim(), data_ini: $("#a_ini").value, data_fim: $("#a_fim").value, usuario: $("#a_user").value, acao: $("#a_acao").value });
  let usuariosOk = false;
  async function reload() {
    const res = await api("list_auditoria", filtros());
    if (!usuariosOk) { (res.usuarios || []).forEach(u => $("#a_user").appendChild(h(`<option value="${esc(u)}">${esc(u)}</option>`))); usuariosOk = true; }
    $("#a_total").textContent = `Total de eventos: ${res.total}.`;
    const lst = $("#a_lista"); lst.innerHTML = "";
    const regs = res.registros || [];
    if (!regs.length) { lst.appendChild(emptyState("list", "Nenhum evento no período", "Ajuste os filtros para ver os registros de auditoria.")); return; }
    const table = h(`<table class="grid-table"><thead><tr><th>Data / Hora</th><th>Usuário</th><th>Ação</th><th>Registro</th><th></th></tr></thead><tbody></tbody></table>`);
    const tb = table.querySelector("tbody");
    regs.forEach(rg => {
      const meta = AUDIT_ACOES[rg.acao] || { lbl: rg.acao, cls: "b-gray" };
      const ent = AUDIT_ENT[rg.entidade] || rg.entidade || "";
      const tr = h(`<tr>
        <td class="mono" style="white-space:nowrap">${fmtDateTime(rg.criado_em)}</td>
        <td>${esc(rg.usuario_login || "—")}</td>
        <td><span class="badge ${meta.cls}">${esc(meta.lbl)}</span></td>
        <td><div>${esc(rg.descricao || "")}</div>${ent ? `<div class="small muted">${esc(ent)}${rg.entidade_id ? " #" + rg.entidade_id : ""}</div>` : ""}</td>
        <td class="r"></td></tr>`);
      if (rg.detalhes) tr.querySelector("td.r").appendChild(btn("Detalhes", "eye", () => auditDetalhes(rg)));
      tb.appendChild(tr);
    });
    const card = h(`<div class="card grid-card"></div>`); card.appendChild(table); lst.appendChild(card); injectIcons(lst);
  }
  $("#a_q").addEventListener("input", reload);
  ["#a_ini", "#a_fim", "#a_user", "#a_acao"].forEach(s => $(s).addEventListener("change", reload));
  $("#a_clear").onclick = () => { ["#a_q", "#a_ini", "#a_fim", "#a_user", "#a_acao"].forEach(s => $(s).value = ""); reload(); };
  reload();
}

function auditDetalhes(rg) {
  const d = rg.detalhes || {};
  let body;
  if (d.diff && Object.keys(d.diff).length) {
    body = `<table class="grid-table"><thead><tr><th>Campo</th><th>Antes</th><th>Depois</th></tr></thead><tbody>${
      Object.entries(d.diff).map(([k, v]) => `<tr><td class="mono">${esc(k)}</td><td>${esc(fmtAuditVal(v[0]))}</td><td>${esc(fmtAuditVal(v[1]))}</td></tr>`).join("")}</tbody></table>`;
  } else if (d.snapshot && Object.keys(d.snapshot).length) {
    body = `<table class="grid-table"><thead><tr><th>Campo</th><th>Valor</th></tr></thead><tbody>${
      Object.entries(d.snapshot).map(([k, v]) => `<tr><td class="mono">${esc(k)}</td><td>${esc(fmtAuditVal(v))}</td></tr>`).join("")}</tbody></table>`;
  } else if (d.de !== undefined || d.para !== undefined) {
    body = `<p style="font-size:15px">De <b>${esc(d.de || "—")}</b> &nbsp;→&nbsp; <b>${esc(d.para || "—")}</b></p>`;
  } else {
    body = `<pre class="audit-json">${esc(JSON.stringify(d, null, 2))}</pre>`;
  }
  const m = h(`<div class="modal" style="width:660px"><button class="close">×</button>
    <h3>Detalhes do evento</h3>
    <div class="small muted" style="margin:0 0 14px">${fmtDateTime(rg.criado_em)} · ${esc(rg.usuario_login || "—")} · ${esc(rg.descricao || "")}</div>
    <div class="grid-card" style="max-height:60vh;overflow:auto;border:1px solid var(--line);border-radius:10px">${body}</div>
    <div class="between mt"><span></span><button class="btn btn-primary" id="fch">Fechar</button></div></div>`);
  const bg = openModal(m); m.querySelector(".close").onclick = () => bg.remove(); m.querySelector("#fch").onclick = () => bg.remove();
}

/* ----------------------------------------------------------------- preferências (aba de Configurações) */
async function renderPreferencias(container) {
  const prefs = await api("get_preferencias");
  const unidades = B.unidades_tempo || ["horas", "dias", "semanas", "meses"];
  const uOpts = (sel) => unidades.map(u => `<option value="${u}" ${u === sel ? "selected" : ""}>${u}</option>`).join("");
  container.innerHTML = `
    <div class="card"><h3 class="sec-title">Orçamentos</h3>
      <p class="muted" style="margin:0 0 14px">Prazo de validade padrão dos orçamentos. Depois desse prazo, um orçamento em aberto passa a ser exibido como <b>Expirado</b> nas listagens.</p>
      <div class="pref-row"><label>Validade padrão</label>
        <input type="number" min="1" id="p_orc_qtd" class="pref-num" value="${esc(prefs.orc_validade_qtd)}">
        <select id="p_orc_uni" class="pref-sel">${uOpts(prefs.orc_validade_unidade)}</select></div>
      <div class="pref-preview" id="p_orc_prev"></div></div>

    <div class="card mt"><h3 class="sec-title">Ordens de Serviço</h3>
      <p class="muted" style="margin:0 0 14px">Tolerância de atraso. Quando a <b>Previsão de Entrega</b> de uma O.S. é ultrapassada por mais que este tempo, ela é sinalizada como <b>Atrasada</b> no quadro e nas listagens.</p>
      <div class="pref-row"><label>Sinalizar atraso após</label>
        <input type="number" min="0" id="p_os_qtd" class="pref-num" value="${esc(prefs.os_atraso_qtd)}">
        <select id="p_os_uni" class="pref-sel">${uOpts(prefs.os_atraso_unidade)}</select>
        <span class="muted small">além da previsão</span></div>
      <div class="pref-row" style="margin-top:14px"><label>Ordem de Compra</label>
        <label class="pref-check"><input type="checkbox" id="p_oc" ${String(prefs.os_exige_oc) === "1" ? "checked" : ""}> Exigir Nº de Ordem de Compra ao faturar a O.S.</label></div></div>

    <div class="between mt"><span></span><button class="btn btn-primary" id="p_save">${ic("save", 16)}<span>Salvar preferências</span></button></div>`;
  injectIcons(container);
  const prev = () => { container.querySelector("#p_orc_prev").textContent = validadeTexto({ orc_validade_qtd: val("#p_orc_qtd"), orc_validade_unidade: container.querySelector("#p_orc_uni").value }); };
  container.querySelector("#p_orc_qtd").addEventListener("input", prev);
  container.querySelector("#p_orc_uni").addEventListener("change", prev);
  prev();
  container.querySelector("#p_save").onclick = async () => {
    const payload = {
      orc_validade_qtd: val("#p_orc_qtd") || "0", orc_validade_unidade: container.querySelector("#p_orc_uni").value,
      os_atraso_qtd: val("#p_os_qtd") || "0", os_atraso_unidade: container.querySelector("#p_os_uni").value,
      os_exige_oc: container.querySelector("#p_oc").checked ? "1" : "0",
    };
    B.preferencias = await api("save_preferencias", payload);
    toast("Preferências salvas", "ok");
  };
}
function renderBackup(container) {
  container.innerHTML = `
    <div class="card"><h3 class="sec-title">Backup dos dados</h3>
      <p class="muted" style="margin:0 0 14px">Gera uma cópia de segurança de todo o banco (pessoas, veículos, documentos, usuários e configurações) em um arquivo <b>.db</b> que você escolhe onde salvar.</p>
      <button class="btn btn-primary" id="bk">${ic("save", 16)}<span>Fazer backup agora</span></button></div>
    <div class="card mt"><h3 class="sec-title">Restaurar backup</h3>
      <p class="muted" style="margin:0 0 14px">Substitui <b>todos</b> os dados atuais pelos de um arquivo de backup. Esta ação não pode ser desfeita — faça um backup antes, se necessário.</p>
      <button class="btn btn-danger" id="rs">${ic("upload", 16)}<span>Restaurar de um arquivo…</span></button></div>`;
  injectIcons(container);
  container.querySelector("#bk").onclick = doBackup;
  container.querySelector("#rs").onclick = doRestore;
}

/* ----------------------------------------------------------------- usuários (aba de Configurações) */
async function renderUsuarios(container) {
  const todos = await api("list_usuarios");
  // SUPORTE é exclusivo da equipe de manutenção: oculto para usuários comuns
  const souSup = CURRENT_USER && CURRENT_USER.is_suporte;
  const us = souSup ? todos : todos.filter(u => !u.is_suporte);
  container.innerHTML = `<div class="between" style="margin-bottom:14px"><div class="muted small">${us.length} usuário(s) · login sempre em MAIÚSCULAS</div>
      <button class="btn btn-primary" id="novo">${ic("plus", 16)}<span>Novo Usuário</span></button></div>
    <div id="ulista"></div>`;
  injectIcons(container);
  const lst = container.querySelector("#ulista");
  if (!us.length) { lst.appendChild(emptyState("shield", "Nenhum usuário", "Cadastre usuários para controlar o acesso.", "Novo Usuário", () => formUsuario(null))); }
  else {
    const list = h(`<div class="list-rows"></div>`);
    us.forEach(u => {
      const eu = CURRENT_USER && u.id === CURRENT_USER.id;
      const ava = u.avatar_uri ? `<div class="avatar blue" style="overflow:hidden"><img src="${u.avatar_uri}" style="width:100%;height:100%;object-fit:cover"></div>` : `<div class="avatar blue">${ic("user", 22)}</div>`;
      const r = h(`<div class="list-row">${ava}<div class="grow">
        <div style="font-weight:700">${esc(u.nome || u.login)} ${eu ? '<span class="badge b-os">você</span>' : ""} ${u.is_suporte ? '<span class="badge b-orc">mestre</span>' : ""} ${u.ativo ? "" : '<span class="badge b-gray">Inativo</span>'} ${u.must_change ? '<span class="badge b-aberta">senha provisória</span>' : ""}</div>
        <div class="small muted">Login: ${esc(u.login)}</div></div><div class="acts"></div></div>`);
      const a = r.querySelector(".acts");
      const souSuporte = CURRENT_USER && CURRENT_USER.is_suporte;
      const podeEditar = !u.is_suporte || souSuporte;   // só o SUPORTE edita/redefine o SUPORTE
      if (!eu && podeEditar) a.appendChild(btn("", "lock", () => redefinirSenha(u), ""));  // redefinir senha de outro
      if (podeEditar) a.appendChild(btn("", "edit", () => formUsuario(u)));
      if (!u.is_suporte) a.appendChild(btn("", "trash", () => delUsuario(u), "btn-danger"));
      list.appendChild(r);
    });
    lst.appendChild(list); injectIcons(lst);
  }
  const nv = container.querySelector("#novo"); if (nv) nv.onclick = () => formUsuario(null);
}
async function delUsuario(u) {
  if (u.is_suporte) { toast("O usuário SUPORTE não pode ser excluído.", "err"); return; }
  if (CURRENT_USER && u.id === CURRENT_USER.id) { toast("Você não pode excluir o usuário conectado.", "err"); return; }
  if (await confirma(`Excluir o usuário "${esc(u.login)}"?`, { danger: true, ok: "Excluir" })) {
    await api("delete_usuario", u.id); toast("Usuário excluído", "ok"); viewConfiguracoes("usuarios");
  }
}
function formUsuario(u, opts) {
  u = u || { ativo: 1 };
  let avatarB64 = null, avatarRemover = false;  // estado do avatar escolhido nesta edição
  const m = h(`<div class="modal" style="width:480px"><button class="close">×</button><h3>${u.id ? "Editar" : "Novo"} Usuário</h3>
    <div class="ava-box">
      <div class="ava-prev" id="ava">${u.avatar_uri ? `<img src="${u.avatar_uri}">` : ic("user", 30)}</div>
      <div><div style="font-weight:700;margin-bottom:2px">Avatar</div><div class="muted small" style="margin-bottom:8px">Foto do usuário (opcional).</div>
        <button class="btn btn-sm" id="avpick">${ic("image", 15)}<span>Escolher…</span></button>
        <button class="btn btn-sm btn-danger" id="avdel" style="${u.avatar_uri ? "" : "display:none"}">${ic("trash", 15)}</button></div>
    </div>
    <div class="field"><label>Nome</label><input id="nome" value="${esc(u.nome || "")}"></div>
    <div class="field"><label>Login * (MAIÚSCULAS)</label><input id="login" value="${esc(u.login || "")}" autocomplete="off" ${u.is_suporte ? "readonly" : ""}></div>
    <div class="field"><label>Senha ${u.id ? "(em branco mantém a atual)" : "*"}</label><input id="senha" type="password" autocomplete="new-password" placeholder="${u.id ? "••••••••" : "Mínimo 4 caracteres"}"></div>
    <div class="field"><label>Situação</label><div id="c_ativo"></div></div>
    <div class="between mt"><button class="btn" id="cc">Cancelar</button><button class="btn btn-primary" id="sv">Salvar</button></div></div>`);
  const bg = openModal(m);
  const loginInput = m.querySelector("#login"), nomeInput = m.querySelector("#nome");
  let loginEditado = !!u.id;  // ao editar usuário existente não auto-replica o login
  if (!u.is_suporte) {
    loginInput.addEventListener("input", () => { loginEditado = true; const p = loginInput.selectionStart; loginInput.value = loginInput.value.toUpperCase(); loginInput.setSelectionRange(p, p); });
    nomeInput.addEventListener("input", () => { if (!loginEditado) loginInput.value = loginFromNome(nomeInput.value); });  // replica nome no login (MAIÚSCULO, sem acento)
  }
  const ativoCombo = selectCombo([{ value: "1", label: "Ativo" }, { value: "0", label: "Inativo" }], u.ativo ? "1" : "0", null);
  m.querySelector("#c_ativo").appendChild(ativoCombo);
  const ava = m.querySelector("#ava"), avdel = m.querySelector("#avdel");
  m.querySelector("#avpick").onclick = async () => {
    const r = await api("pick_image");
    if (r && r.uri) { avatarB64 = r.b64; avatarRemover = false; ava.innerHTML = `<img src="${r.uri}">`; avdel.style.display = ""; }
  };
  avdel.onclick = () => { avatarB64 = null; avatarRemover = true; ava.innerHTML = ic("user", 30); avdel.style.display = "none"; };
  m.querySelector(".close").onclick = () => bg.remove(); m.querySelector("#cc").onclick = () => bg.remove();
  m.querySelector("#sv").onclick = async () => {
    const senha = m.querySelector("#senha").value;
    const payload = { id: u.id, nome: val("#nome", m), login: val("#login", m), senha, ativo: parseInt(ativoCombo._value()) };
    if (avatarB64) payload.avatar_b64 = avatarB64; else if (avatarRemover) payload.avatar_remove = true;
    if (!payload.login) { toast("Login é obrigatório", "err"); return; }
    if (!u.id && senha.length < 4) { toast("A senha deve ter ao menos 4 caracteres", "err"); return; }
    const saved = await api("save_usuario", payload);
    if (CURRENT_USER && saved && saved.id === CURRENT_USER.id) { CURRENT_USER.nome = saved.nome; CURRENT_USER.login = saved.login; CURRENT_USER.avatar_uri = saved.avatar_uri; mountUserChip(); }
    toast("Usuário salvo", "ok"); bg.remove();
    if (opts && opts.onSaved) opts.onSaved(saved); else viewConfiguracoes("usuarios");
  };
}
/* redefinir senha de outro usuário (valida com a senha do solicitante; alvo troca no 1º login) */
function redefinirSenha(alvo) {
  const m = h(`<div class="modal" style="width:440px"><button class="close">×</button><h3>Redefinir senha</h3>
    <p class="muted" style="margin:0 0 14px">Você vai redefinir a senha de <b>${esc(alvo.nome || alvo.login)}</b> para a senha padrão. Confirme com a <b>sua</b> senha para autorizar.</p>
    <div class="field"><label>Sua senha *</label><input id="sp" type="password" autocomplete="off"></div>
    <div class="login-err" id="er"></div>
    <div class="between mt"><button class="btn" id="cc">Cancelar</button><button class="btn btn-primary" id="ok">Redefinir senha</button></div></div>`);
  const bg = openModal(m);
  const sp = m.querySelector("#sp"), er = m.querySelector("#er");
  setTimeout(() => sp.focus(), 30);
  const go = async () => {
    er.textContent = "";
    try {
      const r = await window.pywebview.api.reset_senha({ alvo_id: alvo.id, solicitante_id: CURRENT_USER && CURRENT_USER.id, senha: sp.value });
      if (r && r.ok === false) { er.textContent = r.erro || "Não foi possível redefinir."; return; }
      bg.remove();
      const info = h(`<div class="modal" style="width:460px"><h3>Senha redefinida</h3>
        <p class="muted" style="margin:0">A senha de <b>${esc(r.data.login)}</b> foi redefinida para a senha padrão:</p>
        <div class="pass-box">${esc(r.data.senha_padrao)}</div>
        <p class="muted" style="margin:0">Este usuário deverá <b>obrigatoriamente</b> alterá-la ao fazer o próximo login.</p>
        <div class="between mt"><span></span><button class="btn btn-primary" id="ok2">Entendi</button></div></div>`);
      const bg2 = openModal(info);
      info.querySelector("#ok2").onclick = () => { bg2.remove(); viewConfiguracoes("usuarios"); };
    } catch (e) { er.textContent = "Erro ao redefinir a senha."; }
  };
  m.querySelector(".close").onclick = () => bg.remove(); m.querySelector("#cc").onclick = () => bg.remove();
  m.querySelector("#ok").onclick = go;
  sp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); go(); } });
}
/* troca obrigatória no primeiro login após uma redefinição (modal não dispensável) */
function trocaSenhaObrigatoria(user) {
  return new Promise(resolve => {
    const m = h(`<div class="modal" style="width:440px"><h3>Defina uma nova senha</h3>
      <p class="muted" style="margin:0 0 16px">Sua senha foi redefinida para a senha padrão. Por segurança, crie uma nova senha para continuar — ela não pode ser igual à atual.</p>
      <div class="field"><label>Nova senha *</label><input id="s1" type="password" placeholder="Mínimo 4 caracteres"></div>
      <div class="field"><label>Confirmar nova senha *</label><input id="s2" type="password"></div>
      <div class="login-err" id="er"></div>
      <div class="between mt"><span></span><button class="btn btn-primary" id="ok">Salvar nova senha</button></div></div>`);
    const bg = h(`<div class="modal-bg"></div>`); bg.appendChild(m);
    document.getElementById("modal-root").appendChild(bg); injectIcons(m);
    const s1 = m.querySelector("#s1"), s2 = m.querySelector("#s2"), er = m.querySelector("#er");
    setTimeout(() => s1.focus(), 30);
    const go = async () => {
      er.textContent = "";
      if (s1.value.length < 4) { er.textContent = "A senha deve ter ao menos 4 caracteres."; return; }
      if (s1.value !== s2.value) { er.textContent = "As senhas não conferem."; return; }
      try {
        const r = await window.pywebview.api.definir_senha({ id: user.id, nova_senha: s1.value });
        if (r && r.ok === false) { er.textContent = r.erro || "Não foi possível salvar."; return; }
        bg.remove(); resolve(r.data);
      } catch (e) { er.textContent = "Erro ao salvar a senha."; }
    };
    m.querySelector("#ok").onclick = go;
    s2.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); go(); } });
  });
}

/* ----------------------------------------------------------------- login / sessão */
function showLogin(opts) {
  opts = opts || {};
  return new Promise(resolve => {
    const ov = h(`<div class="login-ov"><div class="login-card">
      <div class="login-logo">${ic("wrench", 30)}</div>
      <h2>ClickOS</h2><p class="login-sub">${esc(opts.hint || "Entre para continuar")}</p>
      <div class="field"><label>Usuário</label><input id="lg_user" autocomplete="off" placeholder="Login" value="${esc(opts.prefillUser || "")}"></div>
      <div class="field"><label>Senha</label><input id="lg_pass" type="password" placeholder="Senha"></div>
      <button class="btn btn-primary" id="lg_btn">${ic("lock", 16)}<span>Entrar</span></button>
      <div class="login-err" id="lg_err"></div></div></div>`);
    document.body.appendChild(ov); injectIcons(ov);
    const user = ov.querySelector("#lg_user"), pass = ov.querySelector("#lg_pass"), err = ov.querySelector("#lg_err"), bt = ov.querySelector("#lg_btn");
    user.addEventListener("input", () => { const p = user.selectionStart; user.value = user.value.toUpperCase(); user.setSelectionRange(p, p); });
    setTimeout(() => (opts.prefillUser ? pass : user).focus(), 30);
    const doLogin = async () => {
      err.textContent = ""; bt.disabled = true;
      try {
        const r = await window.pywebview.api.login({ login: user.value.trim().toUpperCase(), senha: pass.value });
        if (r && r.ok === false) { err.textContent = r.erro || "Login ou senha inválidos."; pass.value = ""; pass.focus(); bt.disabled = false; return; }
        ov.remove();
        let u = r.data;
        if (u && u.must_change) u = await trocaSenhaObrigatoria(u);  // 1º login após redefinição
        resolve(u);
      } catch (e) { err.textContent = "Erro ao entrar. Tente novamente."; bt.disabled = false; }
    };
    bt.onclick = doLogin;
    user.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); pass.focus(); } });
    pass.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); doLogin(); } });
  });
}
/* assistente de primeira execução (configurações mínimas) */
function showWizard() {
  return new Promise(async (resolve) => {
    let emp;
    try { emp = await api("get_empresa"); } catch (e) { emp = {}; }
    let users = []; try { users = await api("list_usuarios"); } catch (e) {}
    const STEPS = ["Seu acesso", "Empresa", "Usuários"];
    let step = 0, meuUsuario = null, meuSenha = "", loginEditado = false;
    const ov = h(`<div class="wizard-ov"><div class="wizard-card">
      <div class="wiz-head"><div class="wiz-logo">${ic("wrench", 26)}</div>
        <div><div class="wiz-title">Bem-vindo ao ClickOS</div><div class="wiz-sub" id="wsub"></div></div></div>
      <div class="wiz-steps" id="wsteps"></div>
      <div class="wiz-body" id="wbody"></div>
      <div class="wiz-foot"><button class="btn" id="wback">Voltar</button>
        <button class="wiz-skip" id="wskip">Pular configuração</button>
        <span class="spacer"></span><button class="btn btn-primary" id="wnext"></button></div>
    </div></div>`);
    document.body.appendChild(ov); injectIcons(ov);
    const body = ov.querySelector("#wbody"), wsub = ov.querySelector("#wsub"), wsteps = ov.querySelector("#wsteps");
    const back = ov.querySelector("#wback"), next = ov.querySelector("#wnext");
    const werr = () => body.querySelector("#werr");

    function renderBody() {
      wsteps.innerHTML = STEPS.map((s, i) => `<span class="wiz-pill ${i === step ? "on" : i < step ? "done" : ""}">${i + 1}. ${esc(s)}</span>`).join("");
      back.style.visibility = step === 0 ? "hidden" : "";
      next.textContent = step === STEPS.length - 1 ? "Concluir" : "Próximo";
      wsub.textContent = `Passo ${step + 1} de ${STEPS.length}`;
      if (step === 0) {
        body.innerHTML = `<p class="muted">Crie o <b>seu acesso</b> para usar o sistema no dia a dia. Você administra tudo com a sua própria conta.</p>
          <div class="grid2"><div class="field"><label>Seu nome *</label><input id="wnome" value="${esc(meuUsuario ? (meuUsuario.nome || "") : "")}"></div>
            <div class="field"><label>Login * (MAIÚSCULAS)</label><input id="wlogin" value="${esc(meuUsuario ? (meuUsuario.login || "") : "")}" autocomplete="off"></div></div>
          <div class="grid2"><div class="field"><label>Senha *${meuUsuario ? " (em branco mantém)" : ""}</label><input id="wsenha" type="password" placeholder="Mínimo 4 caracteres"></div>
            <div class="field"><label>Confirmar senha</label><input id="wsenha2" type="password"></div></div>
          <div class="login-err" id="werr"></div>`;
        const wl = body.querySelector("#wlogin"), wn = body.querySelector("#wnome");
        if (meuUsuario) loginEditado = true;  // já criado: não sobrescreve o login ao reeditar o nome
        wl.addEventListener("input", () => { loginEditado = true; const p = wl.selectionStart; wl.value = wl.value.toUpperCase(); wl.setSelectionRange(p, p); });
        wn.addEventListener("input", () => { if (!loginEditado) wl.value = loginFromNome(wn.value); });  // replica nome no login
      } else if (step === 1) {
        body.innerHTML = `<p class="muted">Dados da sua empresa que aparecem nos documentos (opcional). Você pode completar o restante depois em Configurações → Empresa.</p>
          <div class="field"><label>Razão Social</label><input id="wrazao" value="${esc(emp.razao_social || "")}"></div>
          <div class="grid2"><div class="field"><label>Nome Fantasia</label><input id="wfant" value="${esc(emp.nome_fantasia || "")}"></div>
            <div class="field"><label>CNPJ</label><input id="wcnpj" value="${esc(emp.cnpj || "")}" placeholder="00.000.000/0000-00"></div></div>
          <div class="grid2"><div class="field"><label>Telefone</label><input id="wtel" value="${esc(emp.telefone || "")}" placeholder="(00) 0000-0000"></div>
            <div class="field"><label>WhatsApp</label><input id="wwpp" value="${esc(emp.whatsapp || "")}" placeholder="(00) 00000-0000"></div></div>
          <div class="login-err" id="werr"></div>`;
        bindMask(body.querySelector("#wcnpj"), mDoc); bindMask(body.querySelector("#wtel"), mFone); bindMask(body.querySelector("#wwpp"), mFone);
      } else {
        const comuns = users.filter(u => !u.is_suporte);  // SUPORTE não é exibido (uso interno)
        body.innerHTML = `<p class="muted">Cadastre os demais usuários que vão acessar o sistema (opcional). Você pode gerenciá-los depois em Configurações → Usuários.</p>
          <div id="wulist"></div>
          <button class="btn btn-sm mt" id="wadd">${ic("plus", 15)}<span>Adicionar usuário</span></button>`;
        injectIcons(body);
        const ul = body.querySelector("#wulist");
        ul.innerHTML = comuns.length
          ? `<div class="list-rows">${comuns.map(u => `<div class="list-row"><div class="avatar blue">${ic("user", 18)}</div><div class="grow"><div style="font-weight:700">${esc(u.nome || u.login)}</div><div class="small muted">Login: ${esc(u.login)}</div></div></div>`).join("")}</div>`
          : `<div class="muted small">Nenhum usuário além do seu acesso ainda.</div>`;
        injectIcons(ul);
        body.querySelector("#wadd").onclick = () => formUsuario(null, { onSaved: async () => { try { users = await api("list_usuarios"); } catch (e) {} renderBody(); } });
      }
    }
    async function concluir() {
      next.disabled = true;
      try { await api("concluir_setup"); } catch (e) {}
      if (B.empresa) B.empresa.setup_concluido = 1;
      ov.remove();
      if (meuUsuario && meuSenha) {
        // login automático na conta recém-criada — sem exigir nova tela de login
        try {
          await window.pywebview.api.logout();
          const r = await window.pywebview.api.login({ login: meuUsuario.login, senha: meuSenha });
          if (r && r.ok !== false) CURRENT_USER = r.data;
        } catch (e) {}
      }
      resolve();
    }
    back.onclick = () => { if (step > 0) { step--; renderBody(); } };
    ov.querySelector("#wskip").onclick = () => concluir();
    next.onclick = async () => {
      if (step === 0) {
        const nome = body.querySelector("#wnome").value.trim();
        const login = body.querySelector("#wlogin").value.trim().toUpperCase();
        const senha = body.querySelector("#wsenha").value, senha2 = body.querySelector("#wsenha2").value;
        if (!login) { werr().textContent = "Informe um login para o seu acesso."; return; }
        const precisaSenha = !meuUsuario || senha || senha2;
        if (precisaSenha) {
          if (senha.length < 4) { werr().textContent = "A senha deve ter ao menos 4 caracteres."; return; }
          if (senha !== senha2) { werr().textContent = "As senhas não conferem."; return; }
        }
        try {
          const payload = meuUsuario ? { id: meuUsuario.id, nome, login, ativo: 1 } : { nome, login, senha, ativo: 1 };
          if (meuUsuario && senha) payload.senha = senha;
          meuUsuario = await api("save_usuario", payload);
          if (senha) meuSenha = senha;  // guarda p/ login automático ao concluir
        } catch (e) { werr().textContent = e.message || "Não foi possível criar o usuário."; return; }
        step = 1; renderBody(); return;
      }
      if (step === 1) {
        Object.assign(emp, { razao_social: body.querySelector("#wrazao").value.trim(), nome_fantasia: body.querySelector("#wfant").value.trim(),
          cnpj: body.querySelector("#wcnpj").value.trim(), telefone: body.querySelector("#wtel").value.trim(), whatsapp: body.querySelector("#wwpp").value.trim() });
        try { await api("save_empresa", emp); B.empresa = Object.assign({}, B.empresa, emp); }
        catch (e) { werr().textContent = "Não foi possível salvar os dados."; return; }
        step = 2; renderBody(); return;
      }
      concluir();
    };
    renderBody();
  });
}
function mountUserChip() {
  const box = document.getElementById("user-box"); if (!box) return;
  box.style.display = "flex";
  document.getElementById("user-name").textContent = (CURRENT_USER && (CURRENT_USER.nome || CURRENT_USER.login)) || "";
  const ava = document.getElementById("user-ava");
  if (ava) { if (CURRENT_USER && CURRENT_USER.avatar_uri) ava.innerHTML = `<img src="${CURRENT_USER.avatar_uri}">`; else { ava.innerHTML = ic("user", 18); } }
  document.getElementById("btn-logout").onclick = logout;
}
async function logout() {
  if (!await confirma("Deseja sair do app agora?", { ok: "Sair" })) return;
  try { await window.pywebview.api.logout(); } catch (e) {}  // limpa a sessão no servidor
  CURRENT_USER = null;
  document.getElementById("app").style.display = "none";
  document.getElementById("user-box").style.display = "none";
  main().innerHTML = "";
  CURRENT_USER = await showLogin();
  document.getElementById("app").style.display = "flex";
  mountUserChip();
  setView("dashboard");
}

/* ----------------------------------------------------------------- backup/restore + init */
async function doBackup() { const r = await api("backup"); if (r && r.arquivo) toast("Backup salvo em: " + r.arquivo, "ok"); }
async function doRestore() {
  if (!await confirma("Restaurar substituirá TODOS os dados atuais pelos do arquivo escolhido. Continuar?")) return;
  const r = await api("restore"); if (r && r.restaurado) { toast("Backup restaurado", "ok"); try { B = await api("bootstrap"); } catch (e) {} await refreshSug(); setView("dashboard"); }
}
async function refreshSug() { try { SUG = await api("sugestoes"); } catch (e) {} }
function bindNav() {
  document.querySelectorAll(".menu a").forEach(a => a.onclick = () => setView(a.dataset.view));
  const cfg = document.getElementById("btn-config"); if (cfg) cfg.onclick = () => viewConfiguracoes();
}
async function start() {
  window.__p = "begin";
  injectIcons(document);
  const app = document.getElementById("app");
  app.style.display = "none";   // só mostra após o login
  window.__p = "ui-ready";
  try { B = await api("bootstrap"); window.__p = "bootstrap-ok"; } catch (e) { window.__p = "bootstrap-err:" + e.message; }
  try { SUG = await api("sugestoes"); window.__p = "sug-ok"; } catch (e) { window.__p = "sug-err:" + e.message; }
  try { CITIES = await api("cidades"); } catch (e) { CITIES = []; }
  const primeiraExec = !(B.empresa && B.empresa.setup_concluido);
  if (primeiraExec) {
    // 1ª execução: NÃO exige login. Abre uma sessão interna provisória só para o assistente rodar;
    // ao concluir, o lojista é logado automaticamente na própria conta que acabou de criar.
    let ok = false;
    try { const r = await window.pywebview.api.login({ login: "SUPORTE", senha: "1234567890" }); if (r && r.ok !== false) { CURRENT_USER = r.data; ok = true; } } catch (e) {}
    if (ok) { try { await showWizard(); } catch (e) {} }
    else { CURRENT_USER = await showLogin(); }
  } else {
    CURRENT_USER = await showLogin();
  }
  app.style.display = "flex";
  bindNav();
  mountUserChip();
  setView("dashboard");
  window.__p = "done";
}
window.__err = "";
window.addEventListener("error", e => { window.__err = (e.message || "") + " @ " + (e.filename || "") + ":" + (e.lineno || ""); });
window.addEventListener("unhandledrejection", e => { window.__err = "reject: " + String(e.reason); });
if (window.pywebview && window.pywebview.api) start();
else window.addEventListener("pywebviewready", start);
