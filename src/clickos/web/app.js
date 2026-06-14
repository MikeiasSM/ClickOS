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
function fmtQtd(v) { return Number(num(v)).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(s) { s = String(s || ""); return (s.length >= 10 && s[4] === "-") ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : s; }
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
  function renderOpts() {
    ai = -1;
    const f = input.value.trim().toLowerCase();
    const matches = items.filter(x => getLabel(x).toLowerCase().includes(f)).slice(0, 60);
    let html = matches.map((x, i) => `<div class="combo-opt" data-i="${i}"><span>${esc(getLabel(x))}</span>${opt.getSub ? `<span class="sub">${esc(opt.getSub(x) || "")}</span>` : ""}</div>`).join("");
    if (!matches.length && !opt.onCreate) html = '<div class="combo-none">Sem sugestões — usado como texto</div>';
    if (opt.onCreate && input.value.trim() && !exact()) html += `<div class="combo-add">${ic("plus", 15)}<span>${esc(opt.createLabel ? opt.createLabel(input.value.trim()) : 'Cadastrar "' + input.value.trim() + '"')}</span></div>`;
    pop.innerHTML = html;
    pop.querySelectorAll(".combo-opt").forEach(o => o.onclick = () => { const x = matches[+o.dataset.i]; input.value = getLabel(x); close(); opt.onPick && opt.onPick(x); });
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
const VIEWS = { dashboard: viewDashboard, documentos: viewDocumentos, clientes: viewClientes, veiculos: viewVeiculos, produtos: viewProdutos };
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
  const W = 560, H = 190, pad = 26, n = data.length || 1;
  const max = Math.max(1, ...data.map(d => d.valor));
  const gap = (W - pad * 2) / n, bw = gap * 0.55;
  const vazio = data.every(d => !d.valor);
  let bars = "", labels = "";
  data.forEach((d, i) => {
    const bh = vazio ? 0 : (d.valor / max) * (H - pad * 2 - 14);
    const x = pad + i * gap + (gap - bw) / 2, y = H - pad - bh;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, bh).toFixed(1)}" rx="5" fill="url(#barg)"></rect>`;
    if (d.valor) bars += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="10" fill="#475569">${moneyK(d.valor)}</text>`;
    labels += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - pad + 16}" text-anchor="middle" font-size="11" fill="#64748b">${esc(d.label)}</text>`;
  });
  const wrap = h(`<div style="position:relative"></div>`);
  wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
    <defs><linearGradient id="barg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#60a5fa"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs>
    <line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}" stroke="#e5e7eb"/>${bars}${labels}</svg>`;
  if (vazio) wrap.appendChild(h('<div class="muted small" style="position:absolute;left:0;right:0;top:0;bottom:34px;display:flex;align-items:center;justify-content:center;pointer-events:none">Ainda sem faturamento registrado</div>'));
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
  if (["Aberta", "Aberto"].includes(s)) return "b-aberta";
  if (["Em Execução"].includes(s)) return "b-os";
  if (["Concluída", "Entregue", "Aprovado"].includes(s)) return "b-green";
  return "b-gray";
}
async function viewDashboard() {
  const d = await api("dashboard");
  const u = CURRENT_USER || {};
  const primeiroNome = (String(u.nome || u.login || "").trim().split(/\s+/)[0]) || "";
  render(`
    <div class="between dash-head">
      <div><h1 class="page-title">${saudacao()}${primeiroNome ? ", " + esc(primeiroNome) : ""}! 👋</h1><p class="page-sub">${hojeExtenso()}</p></div>
      <div class="row"><button class="btn" id="nc">${ic("user", 16)}<span>Nova Pessoa</span></button><button class="btn btn-primary" id="nd">${ic("plus", 16)}<span>Novo Documento</span></button></div>
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
  if (!d.recentes.length) rec.appendChild(emptyState("file", "Nenhum documento ainda", "Comece criando um orçamento ou ordem de serviço.", "Novo Documento", () => openDocForm()));
  else renderDocsList(rec, d.recentes);
  main().querySelector("#vt").onclick = () => setView("documentos");
  main().querySelector("#nd").onclick = () => openDocForm();
  main().querySelector("#nc").onclick = () => formCliente(null);
}

/* ----------------------------------------------------------------- documentos (kanban + lista) */
async function viewDocumentos() {
  const mode = vmode("docs", "kanban");
  render(`<div class="between"><div><h1 class="page-title">Ordens de Serviço</h1><p class="page-sub">Quadro de acompanhamento</p></div>
    <div class="row"><span id="vt"></span><button class="btn btn-primary" id="novo">${ic("plus", 16)}<span>Novo Documento</span></button></div></div>
    <div class="card"><div class="search">${ic("search", 16)}<input id="q" placeholder="Buscar por número, pessoa ou placa..."></div></div>
    <div id="board" class="mt"></div>`);
  main().querySelector("#vt").appendChild(viewToggle("docs", mode,
    [{ v: "kanban", icon: "columns", title: "Quadro" }, { v: "list", icon: "list", title: "Lista" }], () => viewDocumentos()));
  main().querySelector("#novo").onclick = () => openDocForm();
  const q = main().querySelector("#q");
  async function reload() {
    const docs = await api("list_documentos", { q: q.value.trim() });
    const board = main().querySelector("#board"); board.innerHTML = "";
    if (!docs.length) { board.appendChild(emptyState("file", "Nenhum documento encontrado", "Crie um novo orçamento ou ordem de serviço.", "Novo Documento", () => openDocForm())); return; }
    if (mode === "list") renderDocsList(board, docs); else renderKanban(board, docs);
  }
  q.addEventListener("input", reload);
  reload();
}
function renderDocsList(board, docs) {
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
    a.appendChild(btn("", "trash", () => delDoc(d.id), "btn-danger"));
    list.appendChild(r);
  });
  board.appendChild(list); injectIcons(board);
}
function renderKanban(board, docs) {
  const colunas = B.kanban_colunas || B.kanban_os_status;
  const cols = [{ key: "orcamentos", title: "Orçamentos", match: d => d.tipo === "orcamento" && !["Aprovado", "Recusado", "Cancelado"].includes(d.status) }]
    .concat(colunas.map(s => ({ key: s, title: s, match: d => d.tipo === "os" && d.status === s })));
  const wrap = h(`<div class="kanban"></div>`);
  cols.forEach(col => {
    const items = docs.filter(col.match);
    const c = h(`<div class="kcol" data-col="${esc(col.key)}"><div class="kcol-head"><span>${esc(col.title)}</span><span class="cnt">${items.length}</span></div></div>`);
    items.forEach(d => c.appendChild(kcard(d)));
    c.addEventListener("dragover", e => { e.preventDefault(); c.classList.add("drop"); });
    c.addEventListener("dragleave", () => c.classList.remove("drop"));
    c.addEventListener("drop", e => { e.preventDefault(); c.classList.remove("drop"); onDropCard(col.key); });
    wrap.appendChild(c);
  });
  board.appendChild(wrap); injectIcons(board);
}
function kcard(d) {
  const prio = d.prioridade || "Normal";
  const card = h(`<div class="kcard pl-${esc(prio)}" draggable="true" data-id="${d.id}">
    <div class="knum">${esc(d.veiculo_placa || "Sem veículo")} ${d.tipo === "os" ? '<span class="badge b-os">OS</span>' : '<span class="badge b-orc">Orçamento</span>'}</div>
    <div class="kmeta">${esc(((d.veiculo_marca || "") + " " + (d.veiculo_modelo || "")).trim() || "—")}<br>${esc(d.numero)} · ${esc(d.cliente_nome || "-")} · ${fmtDate(d.data_abertura)}</div>
    <div class="kfoot"><span class="money">${money(d.total)}</span><span class="kmini">
      ${prio !== "Normal" ? `<span class="prio ${prio}">${prio}</span>` : ""}
      <button data-a="ver" title="Ver">${ic("eye", 14)}</button><button data-a="edit" title="Editar">${ic("edit", 14)}</button><button data-a="del" title="Excluir">${ic("trash", 14)}</button></span></div>`);
  card.addEventListener("dragstart", () => { card.classList.add("dragging"); window.__drag = { id: d.id, tipo: d.tipo, status: d.status }; });
  card.addEventListener("dragend", () => card.classList.remove("dragging"));
  card.querySelector("[data-a=ver]").onclick = e => { e.stopPropagation(); printPreview(d.id); };
  card.querySelector("[data-a=edit]").onclick = e => { e.stopPropagation(); openDocForm(d.id); };
  card.querySelector("[data-a=del]").onclick = e => { e.stopPropagation(); delDoc(d.id); };
  return card;
}
async function onDropCard(colKey) {
  const drag = window.__drag; if (!drag) return; window.__drag = null;
  const id = drag.id;
  if (colKey === "orcamentos") { if (drag.tipo === "os") toast("Uma OS não retorna a orçamento.", "err"); return; }
  if (drag.tipo === "orcamento") {
    if (colKey === "Cancelada") {
      if (!await confirma("Cancelar este orçamento?", { danger: true, ok: "Cancelar orçamento" })) return;
      await api("set_status", { id, status: "Cancelado" });
      toast("Orçamento cancelado", "ok");
    } else {
      if (!await confirma(`Converter este orçamento em Ordem de Serviço (coluna "${colKey}")?`)) return;
      const os = await api("converter_os", id);
      if (colKey !== "Aberta") await api("set_status", { id: os.id, status: colKey });
      toast("Convertido em " + os.numero, "ok");
    }
  } else {
    if (drag.status === colKey) return;
    await api("set_status", { id, status: colKey });
    toast("Status: " + colKey, "ok");
  }
  viewDocumentos();
}
async function delDoc(id) { if (!await confirma("Excluir este documento? Esta ação não pode ser desfeita.", { danger: true, ok: "Excluir" })) return; await api("delete_documento", id); toast("Documento excluído", "ok"); viewDocumentos(); }

/* ----------------------------------------------------------------- documento form */
function blankItem() { return { item_catalogo_id: null, descricao: "", tipo: "servico", quantidade: 1, valor_unitario: 0, desconto: 0 }; }
function statusOptions(tipo, current) { return (tipo === "os" ? B.status_os : B.status_orcamento).map(s => `<option ${s === current ? "selected" : ""}>${s}</option>`).join(""); }
async function openDocForm(id) {
  setActive("documentos");
  let [clientes, veiculos, cat] = await Promise.all([api("list_clientes"), api("list_veiculos"), api("list_itens")]);
  const doc = id ? await api("get_documento", id) : { tipo: "orcamento", status: "Aberto", prioridade: "Normal", data_abertura: today(),
    cliente_id: "", veiculo_id: "", km_entrada: "", desconto_geral: 0, acrescimo: 0, itens: [], lataria: [],
    forma_pagamento: "", prazo_execucao: "", validade: "", observacoes: B.empresa ? B.empresa.termos_padrao : "",
    estado_geral: "", nivel_combustivel: "", obs_entrada: "", item_chave_principal: 0, item_chave_reserva: 0, item_documento: 0, item_manual: 0,
    usuario_id: (CURRENT_USER && CURRENT_USER.id) || null };
  const itens = (doc.itens && doc.itens.length ? doc.itens.map(i => ({ ...i })) : [blankItem()]);
  const latMap = {}; (doc.lataria || []).forEach(p => latMap[p.peca] = p.estado);
  const respNome = doc.usuario_nome || (CURRENT_USER && (CURRENT_USER.nome || CURRENT_USER.login)) || "—";

  render(`
    <div class="row"><button class="btn btn-sm" id="back">${ic("back", 16)}</button>
      <div><h1 class="page-title" style="font-size:24px">${id ? "Editar" : "Novo"} Documento</h1><p class="page-sub" style="margin:0">Preencha os dados</p></div></div>

    <div class="card mt"><h3 class="sec-title">Dados Principais</h3>
      <div class="grid3">
        <div class="field"><label>Tipo</label><div id="c_tipo"></div></div>
        <div class="field"><label>Status</label><div id="c_status"></div></div>
        <div class="field"><label>Prioridade</label><div id="c_prio"></div></div>
      </div>
      <div class="grid3">
        <div class="field"><label>Data de Abertura</label><input type="date" id="f_data" value="${esc(doc.data_abertura || today())}"></div>
        <div class="field"><label>Pessoa</label><div id="c_cli"></div></div>
        <div class="field"><label>Veículo</label><div id="c_vei"></div></div>
      </div>
      <div class="grid3"><div class="field"><label>KM Entrada</label><input id="f_km" value="${esc(doc.km_entrada || "")}" placeholder="Ex: 45000"></div>
        <div class="field"><label>Responsável</label><input value="${esc(respNome)}" readonly></div></div>
    </div>

    <div class="card mt"><div class="between"><h3 class="sec-title">Itens</h3>
      <button class="btn btn-sm" id="add-item">${ic("plus", 15)}<span>Adicionar Item</span></button></div>
      <table class="itens"><thead><tr><th style="width:40%">Produto / Serviço</th><th>Qtd</th><th>Vlr Bruto</th><th>Desconto</th><th>Vlr Líquido</th><th></th></tr></thead>
      <tbody id="itens-body"></tbody></table>
      <hr class="sep">
      <div class="tot-line"><span class="muted">Serviços (subtotal)</span><b id="t_sub">R$ 0,00</b></div>
      <div class="tot-line"><span class="muted">Desconto geral</span><input id="f_desc" class="money-in" style="width:150px;text-align:right" value="${doc.desconto_geral || 0}"></div>
      <div class="tot-line"><span class="muted">Acréscimo</span><input id="f_acr" class="money-in" style="width:150px;text-align:right" value="${doc.acrescimo || 0}"></div>
      <div class="tot-line"><span class="big">TOTAL</span><span class="big" id="t_total">R$ 0,00</span></div>
    </div>

    <div class="card mt" id="checklist-card"><h3 class="sec-title">Checklist de Entrada</h3>
      <div class="muted small" style="margin-bottom:6px">Lataria (marque OK ou Avaria)</div>
      <div class="lataria" id="lataria"></div>
      <div class="grid2 mt">
        <div class="field"><label>Estado Geral</label><div id="c_estado"></div></div>
        <div class="field"><label>Nível de Combustível</label><div class="chips" id="nivel"></div></div>
      </div>
      <div class="field"><label>Itens Entregues</label><div class="checks">
        <label><input type="checkbox" id="c_chave" ${doc.item_chave_principal ? "checked" : ""}> Chave Principal</label>
        <label><input type="checkbox" id="c_reserva" ${doc.item_chave_reserva ? "checked" : ""}> Chave Reserva</label>
        <label><input type="checkbox" id="c_doc" ${doc.item_documento ? "checked" : ""}> Documento</label>
        <label><input type="checkbox" id="c_manual" ${doc.item_manual ? "checked" : ""}> Manual</label>
      </div></div>
      <div class="field"><label>Observações de Entrada</label><textarea id="f_obsent">${esc(doc.obs_entrada || "")}</textarea></div>
    </div>

    <div class="card mt"><h3 class="sec-title">Condições Comerciais</h3>
      <div class="grid3">
        <div class="field"><label>Forma de Pagamento</label><div id="c_pag"></div></div>
        <div class="field"><label>Prazo de Execução</label><input id="f_prazo" value="${esc(doc.prazo_execucao || "")}"></div>
        <div class="field"><label>Validade do Orçamento</label><input id="f_val" value="${esc(doc.validade || "")}"></div>
      </div>
      <div class="field"><label>Observações</label><textarea id="f_obs">${esc(doc.observacoes || "")}</textarea></div>
    </div>

    <div class="between mt" style="margin-bottom:30px"><button class="btn" id="cancel">Cancelar</button>
      <button class="btn btn-primary" id="salvar">${ic("save", 16)}<span>Salvar Documento</span></button></div>`);

  // dropdowns customizados (Tipo / Status / Prioridade / Estado Geral / Forma de Pagamento)
  const checklistCard = main().querySelector("#checklist-card");
  const toggleChecklist = tipo => { checklistCard.style.display = tipo === "os" ? "" : "none"; };
  const statusBox = main().querySelector("#c_status");
  let statusCombo;
  const buildStatus = (tipo, current) => {
    statusBox.innerHTML = "";
    const lista = tipo === "os" ? B.status_os : B.status_orcamento;
    statusCombo = selectCombo(lista, current || lista[0], null);
    statusBox.appendChild(statusCombo);
  };
  const tipoCombo = selectCombo([{ value: "orcamento", label: "Orçamento" }, { value: "os", label: "Ordem de Serviço" }],
    doc.tipo, t => { buildStatus(t, ""); toggleChecklist(t); });
  main().querySelector("#c_tipo").appendChild(tipoCombo);
  buildStatus(doc.tipo, doc.status);
  toggleChecklist(doc.tipo);
  const prioCombo = selectCombo(B.prioridades, doc.prioridade || "Normal", null);
  main().querySelector("#c_prio").appendChild(prioCombo);
  const estadoCombo = selectCombo(["—"].concat(B.estado_geral), doc.estado_geral || "—", null);
  main().querySelector("#c_estado").appendChild(estadoCombo);
  const pagCombo = selectCombo(["—"].concat(B.formas_pagamento), doc.forma_pagamento || "—", null);
  main().querySelector("#c_pag").appendChild(pagCombo);

  // cliente + veículo (veículo SEMPRE amarrado ao cliente: o seletor de veículo mostra só os do cliente)
  let cliCombo, veiCombo;
  const filtraVeiculos = cid => {
    const lista = cid ? veiculos.filter(v => String(v.cliente_id) === String(cid)) : veiculos.slice();
    veiCombo._setItems(lista);
    const cur = veiCombo._value();
    if (cur && cid && !lista.some(v => String(v.id) === String(cur))) veiCombo._setValue(null);
  };
  cliCombo = comboSelect(clientes, doc.cliente_id || null, {
    placeholder: "Buscar/selecionar pessoa...", getLabel: c => c.nome, getSub: c => c.cpf_cnpj || c.telefone || "",
    onSelect: cid => filtraVeiculos(cid),
    onCreate: txt => formCliente(null, { prefill: { nome: txt }, onSaved: c => { clientes.push(c); cliCombo._setItems(clientes); cliCombo._setValue(c.id); filtraVeiculos(c.id); } }),
  });
  main().querySelector("#c_cli").appendChild(cliCombo);
  veiCombo = comboSelect(doc.cliente_id ? veiculos.filter(v => String(v.cliente_id) === String(doc.cliente_id)) : veiculos.slice(), doc.veiculo_id || null, {
    placeholder: "Buscar/selecionar veículo...", getLabel: v => v.placa, getSub: v => `${v.marca || ""} ${v.modelo || ""}`.trim(),
    onSelect: vid => { const v = veiculos.find(x => String(x.id) === String(vid)); if (v && v.cliente_id) cliCombo._setValue(v.cliente_id); },
    onCreate: txt => formVeiculo(null, clientes, { prefill: { placa: txt.toUpperCase(), cliente_id: cliCombo._value() || null }, onSaved: v => { veiculos.push(v); if (v.cliente_id) cliCombo._setValue(v.cliente_id); filtraVeiculos(cliCombo._value()); veiCombo._setValue(v.id); } }),
  });
  main().querySelector("#c_vei").appendChild(veiCombo);

  // itens
  function renderItens() {
    const body = main().querySelector("#itens-body"); body.innerHTML = "";
    itens.forEach((it, idx) => {
      const tr = h(`<tr><td class="i-cell"></td>
        <td><input class="i-qtd" style="width:64px;text-align:right" value="${fmtQtd(it.quantidade)}"></td>
        <td><input class="i-vu money-in" style="width:96px;text-align:right" value="${fmtMoney(it.valor_unitario)}"></td>
        <td><input class="i-de money-in" style="width:96px;text-align:right" value="${fmtMoney(it.desconto)}"></td>
        <td><b class="i-liq">${money(num(it.quantidade) * num(it.valor_unitario) - num(it.desconto))}</b></td>
        <td><button class="btn btn-sm btn-danger i-del">${ic("trash", 15)}</button></td></tr>`);
      const combo = comboText(cat, it.descricao || "", {
        placeholder: "Digite o produto/serviço", getLabel: c => c.nome, getSub: c => c.tipo,
        onInput: v => it.descricao = v,
        onPick: c => { it.item_catalogo_id = c.id; it.tipo = c.tipo; it.descricao = c.nome; it.valor_unitario = c.preco; tr.querySelector(".i-vu").value = fmtMoney(c.preco); recalc(); upRow(tr, it); },
      });
      tr.querySelector(".i-cell").appendChild(combo);
      const q = tr.querySelector(".i-qtd"); bindQtd(q); q.oninput = () => { it.quantidade = q.value; recalc(); upRow(tr, it); };
      const vu = tr.querySelector(".i-vu"); bindMoney(vu); vu.oninput = () => { it.valor_unitario = vu.value; it.item_catalogo_id = null; recalc(); upRow(tr, it); };
      const de = tr.querySelector(".i-de"); bindMoney(de); de.oninput = () => { it.desconto = de.value; recalc(); upRow(tr, it); };
      tr.querySelector(".i-del").onclick = () => { itens.splice(idx, 1); if (!itens.length) itens.push(blankItem()); renderItens(); recalc(); };
      body.appendChild(tr);
    });
  }
  function upRow(tr, it) { tr.querySelector(".i-liq").textContent = money(num(it.quantidade) * num(it.valor_unitario) - num(it.desconto)); }
  function recalc() {
    const sub = itens.reduce((a, it) => a + (num(it.quantidade) * num(it.valor_unitario) - num(it.desconto)), 0);
    main().querySelector("#t_sub").textContent = money(sub);
    main().querySelector("#t_total").textContent = money(sub - num(val("#f_desc")) + num(val("#f_acr")));
  }
  main().querySelector("#add-item").onclick = () => { itens.push(blankItem()); renderItens(); };
  const fd = main().querySelector("#f_desc"), fa = main().querySelector("#f_acr"); bindMoney(fd); bindMoney(fa); fd.oninput = recalc; fa.oninput = recalc;
  renderItens(); recalc();

  // lataria
  const latBox = main().querySelector("#lataria");
  B.pecas.forEach(peca => {
    const cur = latMap[peca] || "";
    const row = h(`<div class="lat-row"><span class="nm">${esc(peca)}</span>
      <span class="seg"><button class="ok ${cur === "OK" ? "on" : ""}">OK</button><button class="av ${cur === "Avaria" ? "on" : ""}">Avaria</button></span></div>`);
    const ok = row.querySelector(".ok"), av = row.querySelector(".av");
    ok.onclick = () => { latMap[peca] = latMap[peca] === "OK" ? "" : "OK"; ok.classList.toggle("on", latMap[peca] === "OK"); av.classList.remove("on"); };
    av.onclick = () => { latMap[peca] = latMap[peca] === "Avaria" ? "" : "Avaria"; av.classList.toggle("on", latMap[peca] === "Avaria"); ok.classList.remove("on"); };
    latBox.appendChild(row);
  });
  const nivBox = main().querySelector("#nivel"); let nivelSel = doc.nivel_combustivel || "";
  B.niveis_combustivel.forEach(n => {
    const c = h(`<span class="chip ${n === nivelSel ? "on" : ""}">${n}</span>`);
    c.onclick = () => { nivelSel = nivelSel === n ? "" : n; nivBox.querySelectorAll(".chip").forEach(x => x.classList.toggle("on", x.textContent === nivelSel)); };
    nivBox.appendChild(c);
  });

  main().querySelector("#back").onclick = () => setView("documentos");
  main().querySelector("#cancel").onclick = () => setView("documentos");
  main().querySelector("#salvar").onclick = async () => {
    const payload = {
      id: doc.id, tipo: tipoCombo._value(), status: statusCombo._value(), prioridade: prioCombo._value(), data_abertura: val("#f_data"),
      usuario_id: doc.usuario_id || (CURRENT_USER && CURRENT_USER.id) || null,
      cliente_id: cliCombo._value() || null, veiculo_id: veiCombo._value() || null, km_entrada: val("#f_km"),
      desconto_geral: num(val("#f_desc")), acrescimo: num(val("#f_acr")),
      forma_pagamento: pagCombo._value() === "—" ? "" : pagCombo._value(), prazo_execucao: val("#f_prazo"), validade: val("#f_val"),
      observacoes: val("#f_obs"), estado_geral: estadoCombo._value() === "—" ? "" : estadoCombo._value(), nivel_combustivel: nivelSel, obs_entrada: val("#f_obsent"),
      item_chave_principal: main().querySelector("#c_chave").checked ? 1 : 0,
      item_chave_reserva: main().querySelector("#c_reserva").checked ? 1 : 0,
      item_documento: main().querySelector("#c_doc").checked ? 1 : 0,
      item_manual: main().querySelector("#c_manual").checked ? 1 : 0,
      itens: itens.filter(it => (it.descricao || "").trim() || num(it.valor_unitario)).map(it => ({
        item_catalogo_id: it.item_catalogo_id, descricao: it.descricao, tipo: it.tipo,
        quantidade: num(it.quantidade), valor_unitario: num(it.valor_unitario), desconto: num(it.desconto) })),
      lataria: B.pecas.map(p => ({ peca: p, estado: latMap[p] || "" })),
    };
    const saved = await api("save_documento", payload);
    toast("Documento salvo: " + saved.numero, "ok"); setView("documentos");
  };
}

/* ----------------------------------------------------------------- print */
async function printDocumento(id) {
  const r = await api("print_documento", id);
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
            ${v.cor ? `<span class="mi">${ic("box", 14)}<span>${esc(v.cor)}</span></span>` : ""}
            ${v.combustivel ? `<span class="mi">${ic("trending", 14)}<span>${esc(v.combustivel)}</span></span>` : ""}
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
  const marcaC = comboText(SUG.marcas, v.marca || "", { placeholder: "Marca", getLabel: x => x }); m.querySelector("#c_marca").appendChild(marcaC);
  const corC = comboText(SUG.cores, v.cor || "", { placeholder: "Cor", getLabel: x => x }); m.querySelector("#c_cor").appendChild(corC);
  const combC = comboText(SUG.combustiveis, v.combustivel || "", { placeholder: "Combustível", getLabel: x => x }); m.querySelector("#c_comb").appendChild(combC);
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
        <button class="btn btn-sm" id="logo">${ic("image", 15)}<span>Escolher arquivo…</span></button></div></div></div>
    <div class="card mt"><h3 class="sec-title">Identificação</h3>
      <div class="field"><label>Razão Social *</label><input id="razao" value="${esc(e.razao_social || "")}"></div>
      <div class="grid2"><div class="field"><label>Nome Fantasia</label><input id="fant" value="${esc(e.nome_fantasia || "")}"></div>
        <div class="field"><label>CNPJ</label><input id="cnpj" value="${esc(e.cnpj || "")}"></div></div>
      <div class="grid2"><div class="field"><label>Inscrição Estadual</label><input id="ie" value="${esc(e.ie || "")}"></div>
        <div class="field"><label>Slogan</label><input id="slogan" value="${esc(e.slogan || "")}"></div></div></div>
    <div class="card mt"><h3 class="sec-title">Contato</h3>
      <div class="grid3"><div class="field"><label>Telefone</label><input id="tel" value="${esc(e.telefone || "")}"></div>
        <div class="field"><label>WhatsApp</label><input id="wpp" value="${esc(e.whatsapp || "")}"></div>
        <div class="field"><label>E-mail</label><input id="email" value="${esc(e.email || "")}"></div></div>
      <div class="field"><label>Site</label><input id="site" value="${esc(e.site || "")}"></div></div>
    <div class="card mt"><h3 class="sec-title">Endereço</h3>
      <div class="grid2"><div class="field"><label>Endereço</label><input id="end" value="${esc(e.endereco || "")}"></div>
        <div class="field"><label>Bairro</label><input id="bairro" value="${esc(e.bairro || "")}"></div></div>
      <div class="grid3"><div class="field"><label>Cidade</label><input id="cid" value="${esc(e.cidade || "")}"></div>
        <div class="field"><label>UF</label><input id="uf" value="${esc(e.uf || "")}"></div>
        <div class="field"><label>CEP</label><input id="cep" value="${esc(e.cep || "")}"></div></div></div>
    <div class="card mt"><h3 class="sec-title">Texto Padrão nas OS</h3>
      <div class="field"><label>Observações / Termos padrão</label><textarea id="termos">${esc(e.termos_padrao || "")}</textarea></div></div>
    <div class="between mt"><span></span><button class="btn btn-primary" id="sv">${ic("save", 16)}<span>Salvar Dados</span></button></div>`;
  injectIcons(container);
  container.querySelector("#sv").onclick = async () => {
    const payload = { razao_social: val("#razao"), nome_fantasia: val("#fant"), cnpj: val("#cnpj"), ie: val("#ie"), slogan: val("#slogan"),
      telefone: val("#tel"), whatsapp: val("#wpp"), email: val("#email"), site: val("#site"),
      endereco: val("#end"), bairro: val("#bairro"), cidade: val("#cid"), uf: val("#uf"), cep: val("#cep"), termos_padrao: val("#termos") };
    await api("save_empresa", payload); B.empresa = payload; toast("Dados salvos", "ok");
  };
  container.querySelector("#logo").onclick = async () => {
    const r = await api("escolher_logo");
    if (r && r.has_logo) { const l = await api("get_logo_uri"); const p = container.querySelector("#logo-prev"); p.classList.remove("empty"); p.innerHTML = `<img src="${l.uri}">`; toast("Logo atualizado", "ok"); }
  };
}

/* ----------------------------------------------------------------- configurações (abas) */
async function viewConfiguracoes(tab) {
  tab = tab || "empresa";
  setActive("config");
  render(`<h1 class="page-title">Configurações</h1><p class="page-sub">Empresa, usuários e backup do sistema</p>
    <div class="tabs" id="cfgtabs">
      <button data-tab="empresa">${ic("building", 16)}<span>Empresa</span></button>
      <button data-tab="usuarios">${ic("shield", 16)}<span>Usuários</span></button>
      <button data-tab="backup">${ic("save", 16)}<span>Backup e Restauração</span></button>
    </div>
    <div id="cfgbody" class="mt"></div>`);
  const tabs = main().querySelector("#cfgtabs");
  tabs.querySelectorAll("button").forEach(b => { b.classList.toggle("on", b.dataset.tab === tab); b.onclick = () => viewConfiguracoes(b.dataset.tab); });
  const body = main().querySelector("#cfgbody");
  body.innerHTML = '<div class="empty">Carregando…</div>';
  if (tab === "empresa") await renderEmpresa(body);
  else if (tab === "usuarios") await renderUsuarios(body);
  else renderBackup(body);
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
  const us = await api("list_usuarios");
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
function formUsuario(u) {
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
  const loginInput = m.querySelector("#login");
  if (!u.is_suporte) loginInput.addEventListener("input", () => { const p = loginInput.selectionStart; loginInput.value = loginInput.value.toUpperCase(); loginInput.setSelectionRange(p, p); });
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
    toast("Usuário salvo", "ok"); bg.remove(); viewConfiguracoes("usuarios");
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
        <p class="muted" style="margin:0 0 4px">Este usuário deverá <b>obrigatoriamente</b> alterá-la ao fazer o próximo login.</p>
        <p class="muted small" style="margin:0">Lembrete: o acesso <b>SUPORTE</b> permanece como administrador mestre do sistema.</p>
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
function showLogin() {
  return new Promise(resolve => {
    const ov = h(`<div class="login-ov"><div class="login-card">
      <div class="login-logo">${ic("wrench", 30)}</div>
      <h2>ClickOS</h2><p class="login-sub">Entre para continuar</p>
      <div class="field"><label>Usuário</label><input id="lg_user" autocomplete="off" placeholder="Login"></div>
      <div class="field"><label>Senha</label><input id="lg_pass" type="password" placeholder="Senha"></div>
      <button class="btn btn-primary" id="lg_btn">${ic("lock", 16)}<span>Entrar</span></button>
      <div class="login-err" id="lg_err"></div></div></div>`);
    document.body.appendChild(ov); injectIcons(ov);
    const user = ov.querySelector("#lg_user"), pass = ov.querySelector("#lg_pass"), err = ov.querySelector("#lg_err"), bt = ov.querySelector("#lg_btn");
    user.addEventListener("input", () => { const p = user.selectionStart; user.value = user.value.toUpperCase(); user.setSelectionRange(p, p); });
    setTimeout(() => user.focus(), 30);
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
function mountUserChip() {
  const box = document.getElementById("user-box"); if (!box) return;
  box.style.display = "flex";
  document.getElementById("user-name").textContent = (CURRENT_USER && (CURRENT_USER.nome || CURRENT_USER.login)) || "";
  const ava = document.getElementById("user-ava");
  if (ava) { if (CURRENT_USER && CURRENT_USER.avatar_uri) ava.innerHTML = `<img src="${CURRENT_USER.avatar_uri}">`; else { ava.innerHTML = ic("user", 18); } }
  document.getElementById("btn-logout").onclick = logout;
}
async function logout() {
  if (!await confirma("Deseja sair da sua conta?", { ok: "Sair" })) return;
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
  CURRENT_USER = await showLogin();
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
