"use strict";
/* ClickOS — front-end (vanilla JS) conversando com a Api Python via pywebview */

const main = () => document.getElementById("main");
let B = { status_lista: [], formas_pagamento: [], niveis_combustivel: [], estado_geral: [], pecas: [] };
let SUG = { marcas: [], cores: [], combustiveis: [], cidades: [] };

/* ----------------------------------------------------------------- ícones (Feather/Lucide, MIT) */
const ICONS = {
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
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
};
function ic(name, size) {
  const s = size || 18;
  return `<svg class="icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;
}
function injectIcons(root) {
  (root || document).querySelectorAll(".ic[data-icon]").forEach(s => { s.innerHTML = ic(s.dataset.icon); });
}

/* ----------------------------------------------------------------- helpers */
function h(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function val(sel, root) { const e = (root || document).querySelector(sel); return e ? e.value.trim() : ""; }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function num(v) { // aceita "R$ 1.234,56", "1234.56", "1,5", número
  if (typeof v === "number") return v;
  let s = String(v == null ? "" : v).replace(/[R$\s]/g, "");
  if (s.indexOf(",") > -1) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s); return isNaN(n) ? 0 : n;
}
function money(v) { return "R$ " + Number(num(v)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtMoney(v) { return Number(num(v)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtQtd(v) { return Number(num(v)).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(s) { s = String(s || ""); return (s.length >= 10 && s[4] === "-") ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : s; }
function btn(label, icon, onclick, cls) { const b = h(`<button class="btn btn-sm ${cls || ""}">${icon ? ic(icon, 15) : ""}<span>${label}</span></button>`); b.onclick = onclick; return b; }

/* máscaras */
function mCEP(v) { return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"); }
function mFone(v) {
  v = v.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 10) return v.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (m, a, b, c) => (a ? "(" + a + ") " : "") + b + (c ? "-" + c : "")).trim();
  return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}
function mDoc(v) {
  v = v.replace(/\D/g, "");
  if (v.length <= 11) return v.slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return v.slice(0, 14).replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}
function bindMask(el, fn) { if (!el) return; el.addEventListener("input", () => { const p = el.selectionStart; el.value = fn(el.value); }); el.value = fn(el.value); }
function bindUpper(el) { if (!el) return; el.addEventListener("input", () => el.value = el.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")); }
function bindInt(el) { if (!el) return; el.addEventListener("input", () => el.value = el.value.replace(/\D/g, "")); }
function bindMoney(el) { if (!el) return; el.setAttribute("inputmode", "decimal"); el.addEventListener("blur", () => { if (el.value.trim() !== "") el.value = fmtMoney(el.value); }); if (el.value) el.value = fmtMoney(el.value); }
function bindQtd(el) { if (!el) return; el.setAttribute("inputmode", "decimal"); el.addEventListener("blur", () => { if (el.value.trim() !== "") el.value = fmtQtd(el.value); }); if (el.value) el.value = fmtQtd(el.value); }
function datalist(id, values) { return `<datalist id="${id}">${(values || []).map(v => `<option value="${esc(v)}"></option>`).join("")}</datalist>`; }

async function cepLookup(cep, set) {
  const d = String(cep || "").replace(/\D/g, "");
  if (d.length !== 8) return;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    const j = await r.json();
    if (j && !j.erro) {
      if (j.logradouro && set.endereco) set.endereco.value = j.logradouro;
      if (j.bairro && set.bairro) set.bairro.value = j.bairro;
      if (j.localidade && set.cidade) set.cidade.value = j.localidade;
      if (j.uf && set.uf) set.uf.value = j.uf;
    }
  } catch (e) { /* offline: integração é opcional, ignora */ }
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
async function confirma(msg) { return window.confirm(msg); }
function render(html) { main().innerHTML = html; injectIcons(main()); }

/* ----------------------------------------------------------------- router */
function setActive(view) { document.querySelectorAll(".menu a").forEach(a => a.classList.toggle("active", a.dataset.view === view)); }
const VIEWS = { dashboard: viewDashboard, documentos: viewDocumentos, clientes: viewClientes, veiculos: viewVeiculos, produtos: viewProdutos, empresa: viewEmpresa };
async function setView(view) { setActive(view); try { await VIEWS[view](); } catch (e) { render(`<div class="empty">Erro ao carregar: ${esc(e.message)}</div>`); } }

/* ----------------------------------------------------------------- dashboard */
function kpi(label, v, icon, bg, color) {
  return `<div class="card kpi"><div><div class="k-label">${label}</div><div class="k-val">${v}</div></div>
    <div class="k-ico" style="background:${bg};color:${color}">${ic(icon, 22)}</div></div>`;
}
function statusClass(s) { if (s === "Aberta") return "b-aberta"; if (["Concluído", "Entregue", "Aprovado"].includes(s)) return "b-green"; return "b-gray"; }
function docCard(doc, actions) {
  const tipoB = doc.tipo === "os" ? '<span class="badge b-os">OS</span>' : '<span class="badge b-orc">Orçamento</span>';
  const e = h(`<div class="item-card"><div>
      <div style="font-weight:700">${esc(doc.numero)} ${tipoB} <span class="badge ${statusClass(doc.status)}">${esc(doc.status)}</span></div>
      <div class="small muted" style="margin-top:3px">Cliente: ${esc(doc.cliente_nome || "-")} · Placa: ${esc(doc.veiculo_placa || "-")} · ${fmtDate(doc.data_abertura)}</div>
      <div class="money" style="margin-top:4px">${money(doc.total)}</div>
    </div><div class="row acts"></div></div>`);
  if (actions) {
    const box = e.querySelector(".acts");
    box.appendChild(btn("Ver", "eye", () => printPreview(doc.id)));
    box.appendChild(btn("Editar", "edit", () => openDocForm(doc.id)));
    if (doc.tipo === "orcamento") box.appendChild(btn("Virar OS", "repeat", () => converter(doc.id)));
    box.appendChild(btn("", "printer", () => printDocumento(doc.id)));
    box.appendChild(btn("", "trash", () => delDoc(doc.id), "btn-danger"));
  }
  return e;
}
async function viewDashboard() {
  const d = await api("dashboard");
  render(`<h1 class="page-title">Dashboard</h1><p class="page-sub">Visão geral do sistema</p>
    <div class="cards kpis">
      ${kpi("Total de Documentos", d.total, "file", "#dbeafe", "#2563eb")}
      ${kpi("Abertas", d.abertas, "trending", "#fef9c3", "#d97706")}
      ${kpi("Clientes", d.clientes, "users", "#f3e8ff", "#7c3aed")}
      ${kpi("Faturamento Mês", money(d.faturamento_mes), "dollar", "#dcfce7", "#16a34a")}
    </div>
    <div class="card mt"><div class="between"><h3 style="margin:0">Documentos Recentes</h3>
      <button class="btn btn-sm" id="vt">Ver todas</button></div><div id="recent" style="margin-top:8px"></div></div>`);
  const rec = main().querySelector("#recent");
  if (!d.recentes.length) rec.innerHTML = '<div class="empty">Nenhum documento ainda. Crie o primeiro em "Ordens / Orçamentos".</div>';
  else d.recentes.forEach(doc => rec.appendChild(docCard(doc, true)));
  main().querySelector("#vt").onclick = () => setView("documentos");
}

/* ----------------------------------------------------------------- documentos */
async function viewDocumentos() {
  render(`<div class="between"><div><h1 class="page-title">Ordens / Orçamentos</h1><p class="page-sub">Gerencie todos os documentos</p></div>
      <button class="btn btn-primary" id="novo">${ic("plus", 16)}<span>Novo Documento</span></button></div>
    <div class="card"><div class="row">
      <div class="search" style="flex:1">${ic("search", 16)}<input id="q" placeholder="Buscar por número, cliente ou placa..."></div>
      <select id="ftipo" style="width:170px"><option value="">Todos os tipos</option><option value="orcamento">Orçamento</option><option value="os">Ordem de Serviço</option></select>
      <select id="fstatus" style="width:170px"><option value="">Todos os status</option>${B.status_lista.map(s => `<option>${s}</option>`).join("")}</select>
    </div></div>
    <div class="card mt"><h3 id="lt" style="margin:0 0 6px">Lista</h3><div id="lista"></div></div>`);
  async function reload() {
    const docs = await api("list_documentos", { q: val("#q"), tipo: val("#ftipo"), status: val("#fstatus") });
    const lst = main().querySelector("#lista"); lst.innerHTML = "";
    main().querySelector("#lt").textContent = `Lista (${docs.length})`;
    if (!docs.length) lst.innerHTML = '<div class="empty">Nenhum documento encontrado.</div>';
    else docs.forEach(d => lst.appendChild(docCard(d, true)));
  }
  main().querySelector("#novo").onclick = () => openDocForm();
  ["#q", "#ftipo", "#fstatus"].forEach(s => main().querySelector(s).addEventListener("input", reload));
  reload();
}
async function delDoc(id) { if (!await confirma("Excluir este documento? Esta ação não pode ser desfeita.")) return; await api("delete_documento", id); toast("Documento excluído", "ok"); viewDocumentos(); }
async function converter(id) { if (!await confirma("Converter este orçamento em Ordem de Serviço?")) return; const os = await api("converter_os", id); toast("Convertido em " + os.numero, "ok"); viewDocumentos(); }

/* ----------------------------------------------------------------- documento form */
function blankItem() { return { item_catalogo_id: null, descricao: "", tipo: "servico", quantidade: 1, valor_unitario: 0, desconto: 0 }; }
async function openDocForm(id) {
  setActive("documentos");
  const [clientes, veiculos, cat] = await Promise.all([api("list_clientes"), api("list_veiculos"), api("list_itens")]);
  const doc = id ? await api("get_documento", id) : { tipo: "orcamento", status: "Aberta", data_abertura: today(),
    cliente_id: "", veiculo_id: "", km_entrada: "", desconto_geral: 0, acrescimo: 0, itens: [], lataria: [],
    forma_pagamento: "", prazo_execucao: "", validade: "", observacoes: B.empresa ? B.empresa.termos_padrao : "",
    estado_geral: "", nivel_combustivel: "", obs_entrada: "",
    item_chave_principal: 0, item_chave_reserva: 0, item_documento: 0, item_manual: 0 };
  const itens = (doc.itens && doc.itens.length ? doc.itens.map(i => ({ ...i })) : [blankItem()]);
  const latMap = {}; (doc.lataria || []).forEach(p => latMap[p.peca] = p.estado);
  const opt = (arr, v, label) => arr.map(x => `<option value="${x.id}" ${x.id == v ? "selected" : ""}>${esc(label(x))}</option>`).join("");

  render(`
    <div class="row"><button class="btn btn-sm" id="back">${ic("back", 16)}</button>
      <div><h1 class="page-title" style="font-size:24px">${id ? "Editar" : "Novo"} Documento</h1><p class="page-sub" style="margin:0">Preencha os dados</p></div></div>

    <div class="card mt"><h3 class="sec-title">Dados Principais</h3>
      <div class="grid3">
        <div class="field"><label>Tipo</label><select id="f_tipo">
          <option value="orcamento" ${doc.tipo === "orcamento" ? "selected" : ""}>Orçamento</option>
          <option value="os" ${doc.tipo === "os" ? "selected" : ""}>Ordem de Serviço</option></select></div>
        <div class="field"><label>Data de Abertura</label><input type="date" id="f_data" value="${esc(doc.data_abertura || today())}"></div>
        <div class="field"><label>KM Entrada</label><input id="f_km" value="${esc(doc.km_entrada || "")}" placeholder="Ex: 45000"></div>
      </div>
      <div class="grid3">
        <div class="field"><label>Status</label><select id="f_status">${B.status_lista.map(s => `<option ${s === doc.status ? "selected" : ""}>${s}</option>`).join("")}</select></div>
        <div class="field"><label>Cliente</label><select id="f_cli"><option value="">Selecione o cliente</option>${opt(clientes, doc.cliente_id, c => `${c.nome}${c.cpf_cnpj ? " — " + c.cpf_cnpj : ""}`)}</select></div>
        <div class="field"><label>Veículo</label><select id="f_vei"><option value="">Selecione o veículo</option>${opt(veiculos, doc.veiculo_id, v => `${v.placa} — ${v.marca || ""} ${v.modelo || ""}`)}</select></div>
      </div>
    </div>

    <div class="card mt"><div class="between"><h3 class="sec-title">Itens</h3>
      <button class="btn btn-sm" id="add-item">${ic("plus", 15)}<span>Adicionar Item</span></button></div>
      ${datalist("cat-dl", cat.map(c => c.nome))}
      <table class="itens"><thead><tr><th style="width:40%">Produto / Serviço</th><th>Qtd</th><th>Vlr Bruto</th><th>Desconto</th><th>Vlr Líquido</th><th></th></tr></thead>
      <tbody id="itens-body"></tbody></table>
      <hr class="sep">
      <div class="tot-line"><span class="muted">Serviços (subtotal)</span><b id="t_sub">R$ 0,00</b></div>
      <div class="tot-line"><span class="muted">Desconto geral</span><input id="f_desc" class="money-in" style="width:150px;text-align:right" value="${doc.desconto_geral || 0}"></div>
      <div class="tot-line"><span class="muted">Acréscimo</span><input id="f_acr" class="money-in" style="width:150px;text-align:right" value="${doc.acrescimo || 0}"></div>
      <div class="tot-line"><span class="big">TOTAL</span><span class="big" id="t_total">R$ 0,00</span></div>
    </div>

    <div class="card mt"><h3 class="sec-title">Checklist de Entrada</h3>
      <div class="muted small" style="margin-bottom:6px">Lataria (marque OK ou Avaria)</div>
      <div class="lataria" id="lataria"></div>
      <div class="grid2 mt">
        <div class="field"><label>Estado Geral</label><select id="f_estado"><option value="">—</option>${B.estado_geral.map(s => `<option ${s === doc.estado_geral ? "selected" : ""}>${s}</option>`).join("")}</select></div>
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
        <div class="field"><label>Forma de Pagamento</label><select id="f_pag"><option value="">—</option>${B.formas_pagamento.map(s => `<option ${s === doc.forma_pagamento ? "selected" : ""}>${s}</option>`).join("")}</select></div>
        <div class="field"><label>Prazo de Execução</label><input id="f_prazo" value="${esc(doc.prazo_execucao || "")}"></div>
        <div class="field"><label>Validade do Orçamento</label><input id="f_val" value="${esc(doc.validade || "")}"></div>
      </div>
      <div class="field"><label>Observações</label><textarea id="f_obs">${esc(doc.observacoes || "")}</textarea></div>
    </div>

    <div class="between mt" style="margin-bottom:30px"><button class="btn" id="cancel">Cancelar</button>
      <button class="btn btn-primary" id="salvar">${ic("save", 16)}<span>Salvar Documento</span></button></div>`);

  function renderItens() {
    const body = main().querySelector("#itens-body"); body.innerHTML = "";
    itens.forEach((it, idx) => {
      const liq = num(it.quantidade) * num(it.valor_unitario) - num(it.desconto);
      const tr = h(`<tr>
        <td><input class="i-desc" list="cat-dl" placeholder="Digite o produto/serviço" value="${esc(it.descricao || "")}"></td>
        <td><input class="i-qtd" style="width:64px;text-align:right" value="${fmtQtd(it.quantidade)}"></td>
        <td><input class="i-vu money-in" style="width:96px;text-align:right" value="${fmtMoney(it.valor_unitario)}"></td>
        <td><input class="i-de money-in" style="width:96px;text-align:right" value="${fmtMoney(it.desconto)}"></td>
        <td><b class="i-liq">${money(liq)}</b></td>
        <td><button class="btn btn-sm btn-danger i-del">${ic("trash", 15)}</button></td></tr>`);
      const desc = tr.querySelector(".i-desc");
      desc.oninput = () => it.descricao = desc.value;
      desc.onchange = () => {
        const c = cat.find(x => (x.nome || "").trim().toLowerCase() === desc.value.trim().toLowerCase());
        if (c) { it.item_catalogo_id = c.id; it.tipo = c.tipo; it.valor_unitario = c.preco; tr.querySelector(".i-vu").value = fmtMoney(c.preco); recalc(); upRow(tr, it); }
        else { it.item_catalogo_id = null; }
      };
      const q = tr.querySelector(".i-qtd"); bindQtd(q); q.oninput = () => { it.quantidade = q.value; recalc(); upRow(tr, it); };
      const vu = tr.querySelector(".i-vu"); bindMoney(vu); vu.oninput = () => { it.valor_unitario = vu.value; recalc(); upRow(tr, it); };
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
  const fd = main().querySelector("#f_desc"), fa = main().querySelector("#f_acr");
  bindMoney(fd); bindMoney(fa); fd.oninput = recalc; fa.oninput = recalc;
  renderItens(); recalc();

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
      id: doc.id, tipo: val("#f_tipo"), status: val("#f_status"), data_abertura: val("#f_data"),
      cliente_id: val("#f_cli") || null, veiculo_id: val("#f_vei") || null, km_entrada: val("#f_km"),
      desconto_geral: num(val("#f_desc")), acrescimo: num(val("#f_acr")),
      forma_pagamento: val("#f_pag"), prazo_execucao: val("#f_prazo"), validade: val("#f_val"),
      observacoes: val("#f_obs"), estado_geral: val("#f_estado"), nivel_combustivel: nivelSel, obs_entrada: val("#f_obsent"),
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
    <div class="between mt"><button class="btn" id="fechar">Fechar</button><button class="btn btn-primary" id="imp">${ic("printer", 16)}<span>Imprimir</span></button></div></div>`);
  const bg = openModal(m); m.querySelector("iframe").srcdoc = r.html;
  m.querySelector(".close").onclick = () => bg.remove(); m.querySelector("#fechar").onclick = () => bg.remove();
  m.querySelector("#imp").onclick = () => { const fr = m.querySelector("iframe"); fr.contentWindow.focus(); fr.contentWindow.print(); };
}

/* ----------------------------------------------------------------- clientes */
async function viewClientes() {
  render(`<div class="between"><div><h1 class="page-title">Clientes</h1><p class="page-sub">Gerencie o cadastro de clientes</p></div>
      <button class="btn btn-primary" id="novo">${ic("plus", 16)}<span>Novo Cliente</span></button></div>
    <div class="card"><div class="search">${ic("search", 16)}<input id="q" placeholder="Buscar por nome, CPF/CNPJ ou telefone..."></div></div>
    <div id="lista" class="grid3 mt"></div>`);
  async function reload() {
    const cs = await api("list_clientes", val("#q"));
    const lst = main().querySelector("#lista"); lst.innerHTML = "";
    if (!cs.length) lst.innerHTML = '<div class="empty">Nenhum cliente.</div>';
    cs.forEach(c => {
      const card = h(`<div class="card"><div style="font-weight:700">${esc(c.nome)}</div>
        <div class="small muted">${esc(c.codigo_interno || "")} ${c.cpf_cnpj ? "· " + esc(c.cpf_cnpj) : ""}</div>
        <div class="small" style="margin-top:8px">Tel: ${esc(c.telefone || "-")}<br>${c.email ? "Email: " + esc(c.email) + "<br>" : ""}${c.cidade ? "Cidade: " + esc(c.cidade) + "/" + esc(c.uf || "") : ""}</div>
        <div class="row mt"><button class="btn btn-sm e" style="flex:1">${ic("edit", 15)}<span>Editar</span></button><button class="btn btn-sm btn-danger x">${ic("trash", 15)}</button></div></div>`);
      injectIcons(card);
      card.querySelector(".e").onclick = () => formCliente(c);
      card.querySelector(".x").onclick = async () => { if (await confirma("Excluir cliente?")) { await api("delete_cliente", c.id); toast("Excluído", "ok"); reload(); } };
      lst.appendChild(card);
    });
  }
  main().querySelector("#novo").onclick = () => formCliente(null);
  main().querySelector("#q").addEventListener("input", reload);
  reload(); window.__reloadClientes = reload;
}
function formCliente(c) {
  c = c || {};
  const m = h(`<div class="modal"><button class="close">×</button><h3>${c.id ? "Editar" : "Novo"} Cliente</h3>
    ${datalist("cid-dl", SUG.cidades)}
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
    <div class="grid3"><div class="field"><label>Cidade</label><input id="cid" list="cid-dl" value="${esc(c.cidade || "")}"></div>
      <div class="field"><label>UF</label><input id="uf" value="${esc(c.uf || "")}"></div>
      <div class="field"></div></div>
    <div class="between mt"><button class="btn" id="cc">Cancelar</button><button class="btn btn-primary" id="sv">Salvar</button></div></div>`);
  const bg = openModal(m);
  bindMask(m.querySelector("#cpf"), mDoc); bindMask(m.querySelector("#tel"), mFone); bindMask(m.querySelector("#wpp"), mFone);
  const cep = m.querySelector("#cep"); bindMask(cep, mCEP);
  cep.addEventListener("change", () => cepLookup(cep.value, { endereco: m.querySelector("#end"), bairro: m.querySelector("#bairro"), cidade: m.querySelector("#cid"), uf: m.querySelector("#uf") }));
  m.querySelector("#uf").addEventListener("input", e => e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2));
  m.querySelector(".close").onclick = () => bg.remove(); m.querySelector("#cc").onclick = () => bg.remove();
  m.querySelector("#sv").onclick = async () => {
    const payload = { id: c.id, nome: val("#nome", m), cpf_cnpj: val("#cpf", m), apelido: val("#apelido", m), rg_ie: val("#rgie", m),
      telefone: val("#tel", m), whatsapp: val("#wpp", m), email: val("#email", m), endereco: val("#end", m),
      numero: val("#numero", m), bairro: val("#bairro", m), cidade: val("#cid", m), uf: val("#uf", m), cep: val("#cep", m) };
    if (!payload.nome || !payload.telefone) { toast("Nome e Telefone são obrigatórios", "err"); return; }
    await api("save_cliente", payload); await refreshSug(); toast("Cliente salvo", "ok"); bg.remove(); window.__reloadClientes();
  };
}

/* ----------------------------------------------------------------- veiculos */
async function viewVeiculos() {
  const clientes = await api("list_clientes");
  render(`<div class="between"><div><h1 class="page-title">Veículos</h1><p class="page-sub">Gerencie o cadastro de veículos</p></div>
      <button class="btn btn-primary" id="novo">${ic("plus", 16)}<span>Novo Veículo</span></button></div>
    <div class="card"><div class="search">${ic("search", 16)}<input id="q" placeholder="Buscar por placa, marca ou modelo..."></div></div>
    <div id="lista" class="grid3 mt"></div>`);
  async function reload() {
    const vs = await api("list_veiculos", val("#q"));
    const lst = main().querySelector("#lista"); lst.innerHTML = "";
    if (!vs.length) lst.innerHTML = '<div class="empty">Nenhum veículo.</div>';
    vs.forEach(v => {
      const card = h(`<div class="card"><div style="font-weight:700">${esc(v.placa)}</div>
        <div class="small muted">${esc(v.marca || "")} ${esc(v.modelo || "")}</div>
        <div class="small" style="margin-top:8px">Ano: ${esc(v.ano_fab || "-")}<br>Cor: ${esc(v.cor || "-")}<br>Proprietário: ${esc(v.cliente_nome || "-")}</div>
        <div class="row mt"><button class="btn btn-sm e" style="flex:1">${ic("edit", 15)}<span>Editar</span></button><button class="btn btn-sm btn-danger x">${ic("trash", 15)}</button></div></div>`);
      injectIcons(card);
      card.querySelector(".e").onclick = () => formVeiculo(v, clientes);
      card.querySelector(".x").onclick = async () => { if (await confirma("Excluir veículo?")) { await api("delete_veiculo", v.id); toast("Excluído", "ok"); reload(); } };
      lst.appendChild(card);
    });
  }
  main().querySelector("#novo").onclick = () => formVeiculo(null, clientes);
  main().querySelector("#q").addEventListener("input", reload);
  reload(); window.__reloadVeiculos = reload;
}
function formVeiculo(v, clientes) {
  v = v || {};
  const m = h(`<div class="modal"><button class="close">×</button><h3>${v.id ? "Editar" : "Novo"} Veículo</h3>
    ${datalist("marca-dl", SUG.marcas)}${datalist("cor-dl", SUG.cores)}${datalist("comb-dl", SUG.combustiveis)}
    <div class="grid2"><div class="field"><label>Placa *</label><input id="placa" value="${esc(v.placa || "")}" placeholder="ABC1D23"></div>
      <div class="field"><label>Ano (Fab.)</label><input id="ano" value="${esc(v.ano_fab || "")}"></div></div>
    <div class="grid2"><div class="field"><label>Marca *</label><input id="marca" list="marca-dl" value="${esc(v.marca || "")}"></div>
      <div class="field"><label>Modelo *</label><input id="modelo" value="${esc(v.modelo || "")}"></div></div>
    <div class="grid2"><div class="field"><label>Versão</label><input id="versao" value="${esc(v.versao || "")}"></div>
      <div class="field"><label>Cor</label><input id="cor" list="cor-dl" value="${esc(v.cor || "")}"></div></div>
    <div class="grid2"><div class="field"><label>Chassi</label><input id="chassi" value="${esc(v.chassi || "")}"></div>
      <div class="field"><label>Renavam</label><input id="renavam" value="${esc(v.renavam || "")}"></div></div>
    <div class="grid2"><div class="field"><label>Combustível</label><input id="comb" list="comb-dl" value="${esc(v.combustivel || "")}"></div>
      <div class="field"><label>KM Atual</label><input id="km" value="${esc(v.km_atual || "")}"></div></div>
    <div class="field"><label>Proprietário *</label><select id="cli"><option value="">Selecione o cliente</option>${clientes.map(c => `<option value="${c.id}" ${c.id == v.cliente_id ? "selected" : ""}>${esc(c.nome)}</option>`).join("")}</select></div>
    <div class="between mt"><button class="btn" id="cc">Cancelar</button><button class="btn btn-primary" id="sv">Salvar</button></div></div>`);
  const bg = openModal(m);
  bindUpper(m.querySelector("#placa"));
  bindInt(m.querySelector("#ano")); bindInt(m.querySelector("#renavam")); bindInt(m.querySelector("#km"));
  m.querySelector("#chassi").addEventListener("input", e => e.target.value = e.target.value.toUpperCase());
  m.querySelector(".close").onclick = () => bg.remove(); m.querySelector("#cc").onclick = () => bg.remove();
  m.querySelector("#sv").onclick = async () => {
    const payload = { id: v.id, placa: val("#placa", m), ano_fab: val("#ano", m), marca: val("#marca", m), modelo: val("#modelo", m),
      versao: val("#versao", m), cor: val("#cor", m), chassi: val("#chassi", m), renavam: val("#renavam", m),
      combustivel: val("#comb", m), km_atual: val("#km", m), cliente_id: val("#cli", m) || null };
    if (!payload.placa || !payload.marca || !payload.modelo) { toast("Placa, Marca e Modelo são obrigatórios", "err"); return; }
    await api("save_veiculo", payload); await refreshSug(); toast("Veículo salvo", "ok"); bg.remove(); window.__reloadVeiculos();
  };
}

/* ----------------------------------------------------------------- produtos/serviços */
async function viewProdutos() {
  render(`<div class="between"><div><h1 class="page-title">Produtos e Serviços</h1><p class="page-sub">Catálogo de produtos e serviços</p></div>
      <button class="btn btn-primary" id="novo">${ic("plus", 16)}<span>Novo Item</span></button></div>
    <div class="card"><div class="search">${ic("search", 16)}<input id="q" placeholder="Buscar por nome ou descrição..."></div></div>
    <div id="lista" class="grid3 mt"></div>`);
  async function reload() {
    const its = await api("list_itens", val("#q"));
    const lst = main().querySelector("#lista"); lst.innerHTML = "";
    if (!its.length) lst.innerHTML = '<div class="empty">Nenhum item.</div>';
    its.forEach(i => {
      const tipoB = i.tipo === "produto" ? '<span class="badge b-green">Produto</span>' : '<span class="badge b-orc">Serviço</span>';
      const card = h(`<div class="card"><div style="font-weight:700">${esc(i.nome)} ${tipoB}</div>
        <div class="small muted" style="margin-top:4px">${esc(i.descricao || "")}</div>
        <div class="money" style="margin-top:8px;font-size:20px">${money(i.preco)}</div>
        <div class="small muted">${i.ativo ? "Ativo" : "Inativo"}</div>
        <div class="row mt"><button class="btn btn-sm e" style="flex:1">${ic("edit", 15)}<span>Editar</span></button><button class="btn btn-sm btn-danger x">${ic("trash", 15)}</button></div></div>`);
      injectIcons(card);
      card.querySelector(".e").onclick = () => formItem(i);
      card.querySelector(".x").onclick = async () => { if (await confirma("Excluir item?")) { await api("delete_item", i.id); toast("Excluído", "ok"); reload(); } };
      lst.appendChild(card);
    });
  }
  main().querySelector("#novo").onclick = () => formItem(null);
  main().querySelector("#q").addEventListener("input", reload);
  reload(); window.__reloadItens = reload;
}
function formItem(i) {
  i = i || { tipo: "servico", ativo: 1, preco: 0 };
  const m = h(`<div class="modal" style="width:560px"><button class="close">×</button><h3>${i.id ? "Editar" : "Novo"} Item</h3>
    <div class="field"><label>Nome *</label><input id="nome" value="${esc(i.nome || "")}"></div>
    <div class="field"><label>Descrição</label><textarea id="desc">${esc(i.descricao || "")}</textarea></div>
    <div class="grid2"><div class="field"><label>Tipo *</label><select id="tipo"><option value="produto" ${i.tipo === "produto" ? "selected" : ""}>Produto</option><option value="servico" ${i.tipo === "servico" ? "selected" : ""}>Serviço</option></select></div>
      <div class="field"><label>Preço *</label><input id="preco" class="money-in" style="text-align:right" value="${fmtMoney(i.preco || 0)}"></div></div>
    <div class="field"><label>Ativo</label><select id="ativo"><option value="1" ${i.ativo ? "selected" : ""}>Sim</option><option value="0" ${!i.ativo ? "selected" : ""}>Não</option></select></div>
    <div class="muted small">O preço é apenas sugestão — pode ser alterado no momento do lançamento.</div>
    <div class="between mt"><button class="btn" id="cc">Cancelar</button><button class="btn btn-primary" id="sv">Salvar</button></div></div>`);
  const bg = openModal(m); bindMoney(m.querySelector("#preco"));
  m.querySelector(".close").onclick = () => bg.remove(); m.querySelector("#cc").onclick = () => bg.remove();
  m.querySelector("#sv").onclick = async () => {
    const payload = { id: i.id, nome: val("#nome", m), descricao: val("#desc", m), tipo: val("#tipo", m), preco: num(val("#preco", m)), ativo: parseInt(val("#ativo", m)) };
    if (!payload.nome) { toast("Nome é obrigatório", "err"); return; }
    await api("save_item", payload); toast("Item salvo", "ok"); bg.remove(); window.__reloadItens();
  };
}

/* ----------------------------------------------------------------- empresa */
async function viewEmpresa() {
  const e = await api("get_empresa");
  render(`<h1 class="page-title">Dados da Empresa</h1><p class="page-sub">Informações que aparecem nos documentos</p>
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
    <div class="card mt"><h3 class="sec-title">Logotipo & Texto Padrão</h3>
      <div class="row" style="margin-bottom:10px"><span class="muted small">Logo: ${e.has_logo ? "definido ✓" : "não definido"}</span>
        <button class="btn btn-sm" id="logo">${ic("image", 15)}<span>Escolher arquivo…</span></button></div>
      <div class="field"><label>Observações / Termos padrão</label><textarea id="termos">${esc(e.termos_padrao || "")}</textarea></div></div>
    <div class="between mt" style="margin-bottom:30px"><span></span><button class="btn btn-primary" id="sv">${ic("save", 16)}<span>Salvar Dados</span></button></div>`);
  main().querySelector("#sv").onclick = async () => {
    const payload = { razao_social: val("#razao"), nome_fantasia: val("#fant"), cnpj: val("#cnpj"), ie: val("#ie"), slogan: val("#slogan"),
      telefone: val("#tel"), whatsapp: val("#wpp"), email: val("#email"), site: val("#site"),
      endereco: val("#end"), bairro: val("#bairro"), cidade: val("#cid"), uf: val("#uf"), cep: val("#cep"), termos_padrao: val("#termos") };
    await api("save_empresa", payload); B.empresa = payload; toast("Dados salvos", "ok");
  };
  main().querySelector("#logo").onclick = async () => {
    const r = await api("escolher_logo");
    if (r && r.has_logo) { toast("Logo atualizado", "ok"); viewEmpresa(); }
  };
}

/* ----------------------------------------------------------------- backup/restore + init */
async function doBackup() { const r = await api("backup"); if (r && r.arquivo) toast("Backup salvo em: " + r.arquivo, "ok"); }
async function doRestore() {
  if (!await confirma("Restaurar substituirá TODOS os dados atuais pelos do arquivo escolhido. Continuar?")) return;
  const r = await api("restore"); if (r && r.restaurado) { toast("Backup restaurado", "ok"); try { B = await api("bootstrap"); } catch (e) {} setView("dashboard"); }
}
async function refreshSug() { try { SUG = await api("sugestoes"); } catch (e) {} }
function bindNav() {
  document.querySelectorAll(".menu a").forEach(a => a.onclick = () => setView(a.dataset.view));
  document.getElementById("btn-backup").onclick = doBackup;
  document.getElementById("btn-restore").onclick = doRestore;
}
async function start() {
  try { B = await api("bootstrap"); } catch (e) {}
  await refreshSug();
  injectIcons(document);
  bindNav();
  setView("dashboard");
}
if (window.pywebview && window.pywebview.api) start();
else window.addEventListener("pywebviewready", start);
