"use strict";
/* ClickOS — front-end (vanilla JS) conversando com a Api Python via pywebview */

const main = () => document.getElementById("main");
let B = { status_lista: [], formas_pagamento: [], niveis_combustivel: [], estado_geral: [], pecas: [] };

/* ----------------------------------------------------------------- helpers */
function h(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function val(sel, root) { const e = (root || document).querySelector(sel); return e ? e.value.trim() : ""; }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function money(v) { return "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function num(v) { v = String(v == null ? "" : v).replace(",", "."); const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(s) { s = String(s || ""); return (s.length >= 10 && s[4] === "-") ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : s; }
function btn(label, onclick, cls) { const b = h(`<button class="btn btn-sm ${cls || ""}">${label}</button>`); b.onclick = onclick; return b; }

async function api(method, ...args) {
  const r = await window.pywebview.api[method](...args);
  if (r && r.ok === false) { toast(r.erro || "Erro", "err"); throw new Error(r.erro || "erro"); }
  return r ? r.data : r;
}
function toast(msg, kind) {
  const t = h(`<div class="toast ${kind || "info"}">${esc(msg)}</div>`);
  document.getElementById("toast-root").appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
function openModal(node) {
  const bg = h(`<div class="modal-bg"></div>`);
  bg.appendChild(node);
  bg.addEventListener("mousedown", e => { if (e.target === bg) bg.remove(); });
  document.getElementById("modal-root").appendChild(bg);
  return bg;
}
function closeModals() { document.getElementById("modal-root").innerHTML = ""; }
async function confirma(msg) { return window.confirm(msg); }

/* ----------------------------------------------------------------- router */
function setActive(view) {
  document.querySelectorAll(".menu a").forEach(a => a.classList.toggle("active", a.dataset.view === view));
}
const VIEWS = {
  dashboard: viewDashboard, documentos: viewDocumentos, clientes: viewClientes,
  veiculos: viewVeiculos, produtos: viewProdutos, empresa: viewEmpresa,
};
async function setView(view) {
  setActive(view);
  try { await VIEWS[view](); }
  catch (e) { main().innerHTML = `<div class="empty">Erro ao carregar: ${esc(e.message)}</div>`; }
}

/* ----------------------------------------------------------------- dashboard */
function kpi(label, v, ico, bg) {
  return `<div class="card kpi"><div><div class="k-label">${label}</div><div class="k-val">${v}</div></div>
    <div class="k-ico" style="background:${bg}">${ico}</div></div>`;
}
function statusClass(s) {
  if (s === "Aberta") return "b-aberta";
  if (["Concluído", "Entregue", "Aprovado"].includes(s)) return "b-green";
  if (s === "Cancelado") return "b-gray";
  return "b-gray";
}
function docCard(doc, actions) {
  const tipoB = doc.tipo === "os" ? '<span class="badge b-os">OS</span>' : '<span class="badge b-orc">Orçamento</span>';
  const e = h(`<div class="item-card"><div>
      <div style="font-weight:700">${esc(doc.numero)} ${tipoB} <span class="badge ${statusClass(doc.status)}">${esc(doc.status)}</span></div>
      <div class="small muted" style="margin-top:3px">Cliente: ${esc(doc.cliente_nome || "-")} · Placa: ${esc(doc.veiculo_placa || "-")} · ${fmtDate(doc.data_abertura)}</div>
      <div class="money" style="margin-top:4px">${money(doc.total)}</div>
    </div><div class="row acts"></div></div>`);
  if (actions) {
    const box = e.querySelector(".acts");
    box.appendChild(btn("👁 Ver", () => printPreview(doc.id)));
    box.appendChild(btn("✏ Editar", () => openDocForm(doc.id)));
    if (doc.tipo === "orcamento") box.appendChild(btn("➡ Virar OS", () => converter(doc.id)));
    box.appendChild(btn("🖨", () => printDocumento(doc.id)));
    box.appendChild(btn("🗑", () => delDoc(doc.id), "btn-danger"));
  }
  return e;
}
async function viewDashboard() {
  const d = await api("dashboard");
  main().innerHTML = `<h1 class="page-title">Dashboard</h1><p class="page-sub">Visão geral do sistema</p>
    <div class="cards kpis">
      ${kpi("Total de Documentos", d.total, "📄", "#dbeafe")}
      ${kpi("Abertas", d.abertas, "📈", "#fef9c3")}
      ${kpi("Clientes", d.clientes, "👥", "#f3e8ff")}
      ${kpi("Faturamento Mês", money(d.faturamento_mes), "💲", "#dcfce7")}
    </div>
    <div class="card mt"><div class="between"><h3 style="margin:0">Documentos Recentes</h3>
      <button class="btn btn-sm" id="vt">Ver todas</button></div><div id="recent" style="margin-top:8px"></div></div>`;
  const rec = main().querySelector("#recent");
  if (!d.recentes.length) rec.innerHTML = '<div class="empty">Nenhum documento ainda. Crie o primeiro em "Ordens / Orçamentos".</div>';
  else d.recentes.forEach(doc => rec.appendChild(docCard(doc, true)));
  main().querySelector("#vt").onclick = () => setView("documentos");
}

/* ----------------------------------------------------------------- documentos list */
async function viewDocumentos() {
  main().innerHTML = `<div class="between"><div><h1 class="page-title">Ordens / Orçamentos</h1>
      <p class="page-sub">Gerencie todos os documentos</p></div>
      <button class="btn btn-primary" id="novo">+ Novo Documento</button></div>
    <div class="card"><div class="row">
      <div class="search" style="flex:1"><input id="q" placeholder="Buscar por número, cliente ou placa..."></div>
      <select id="ftipo" style="width:170px"><option value="">Todos os tipos</option><option value="orcamento">Orçamento</option><option value="os">Ordem de Serviço</option></select>
      <select id="fstatus" style="width:170px"><option value="">Todos os status</option>${B.status_lista.map(s => `<option>${s}</option>`).join("")}</select>
    </div></div>
    <div class="card mt"><h3 id="lt" style="margin:0 0 6px">Lista</h3><div id="lista"></div></div>`;
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
async function delDoc(id) {
  if (!await confirma("Excluir este documento? Esta ação não pode ser desfeita.")) return;
  await api("delete_documento", id); toast("Documento excluído", "ok"); viewDocumentos();
}
async function converter(id) {
  if (!await confirma("Converter este orçamento em Ordem de Serviço?")) return;
  const os = await api("converter_os", id); toast("Convertido em " + os.numero, "ok"); viewDocumentos();
}

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
  main().innerHTML = `
    <div class="row"><button class="btn btn-sm" id="back">←</button>
      <div><h1 class="page-title" style="font-size:24px">${id ? "Editar" : "Novo"} Documento</h1>
      <p class="page-sub" style="margin:0">Preencha os dados</p></div></div>

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
      <button class="btn btn-sm" id="add-item">+ Adicionar Item</button></div>
      <table class="itens"><thead><tr><th style="width:34%">Descrição (produto/serviço)</th><th>Qtd</th><th>Vlr Bruto</th><th>Desconto</th><th>Vlr Líquido</th><th></th></tr></thead>
      <tbody id="itens-body"></tbody></table>
      <hr class="sep">
      <div class="tot-line"><span class="muted">Serviços (subtotal)</span><b id="t_sub">R$ 0,00</b></div>
      <div class="tot-line"><span class="muted">Desconto geral</span><input id="f_desc" style="width:140px;text-align:right" value="${doc.desconto_geral || 0}"></div>
      <div class="tot-line"><span class="muted">Acréscimo</span><input id="f_acr" style="width:140px;text-align:right" value="${doc.acrescimo || 0}"></div>
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
      <button class="btn btn-primary" id="salvar">💾 Salvar Documento</button></div>`;

  // ----- itens -----
  function renderItens() {
    const body = main().querySelector("#itens-body"); body.innerHTML = "";
    itens.forEach((it, idx) => {
      const liq = num(it.quantidade) * num(it.valor_unitario) - num(it.desconto);
      const tr = h(`<tr>
        <td><select class="i-cat"><option value="">— texto livre —</option>${cat.map(c => `<option value="${c.id}" ${c.id == it.item_catalogo_id ? "selected" : ""}>${esc(c.nome)} (${c.tipo})</option>`).join("")}</select>
            <input class="i-desc" style="margin-top:4px" placeholder="Descrição" value="${esc(it.descricao || "")}"></td>
        <td><input class="i-qtd" style="width:60px" value="${it.quantidade}"></td>
        <td><input class="i-vu" style="width:90px" value="${it.valor_unitario}"></td>
        <td><input class="i-desc2" style="width:90px" value="${it.desconto}"></td>
        <td><b class="i-liq">${money(liq)}</b></td>
        <td><button class="btn btn-sm btn-danger i-del">🗑</button></td></tr>`);
      tr.querySelector(".i-cat").onchange = e => {
        const c = cat.find(x => x.id == e.target.value);
        it.item_catalogo_id = c ? c.id : null;
        if (c) { it.descricao = c.nome; it.tipo = c.tipo; it.valor_unitario = c.preco; renderItens(); recalc(); }
      };
      tr.querySelector(".i-desc").oninput = e => it.descricao = e.target.value;
      tr.querySelector(".i-qtd").oninput = e => { it.quantidade = e.target.value; recalc(); upRow(tr, it); };
      tr.querySelector(".i-vu").oninput = e => { it.valor_unitario = e.target.value; recalc(); upRow(tr, it); };
      tr.querySelector(".i-desc2").oninput = e => { it.desconto = e.target.value; recalc(); upRow(tr, it); };
      tr.querySelector(".i-del").onclick = () => { itens.splice(idx, 1); if (!itens.length) itens.push(blankItem()); renderItens(); recalc(); };
      body.appendChild(tr);
    });
  }
  function upRow(tr, it) { tr.querySelector(".i-liq").textContent = money(num(it.quantidade) * num(it.valor_unitario) - num(it.desconto)); }
  function recalc() {
    const sub = itens.reduce((a, it) => a + (num(it.quantidade) * num(it.valor_unitario) - num(it.desconto)), 0);
    const total = sub - num(val("#f_desc")) + num(val("#f_acr"));
    main().querySelector("#t_sub").textContent = money(sub);
    main().querySelector("#t_total").textContent = money(total);
  }
  main().querySelector("#add-item").onclick = () => { itens.push(blankItem()); renderItens(); };
  main().querySelector("#f_desc").oninput = recalc;
  main().querySelector("#f_acr").oninput = recalc;
  renderItens(); recalc();

  // ----- lataria -----
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
  // ----- nivel combustivel -----
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
      observacoes: val("#f_obs"), estado_geral: val("#f_estado"), nivel_combustivel: nivelSel,
      obs_entrada: val("#f_obsent"),
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
    toast("Documento salvo: " + saved.numero, "ok");
    setView("documentos");
  };
}

/* ----------------------------------------------------------------- print */
async function printDocumento(id) {
  const r = await api("print_documento", id);
  const f = document.getElementById("print-frame");
  f.srcdoc = r.html;
  f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast("Falha ao imprimir", "err"); } };
}
async function printPreview(id) {
  const r = await api("print_documento", id);
  const m = h(`<div class="modal" style="width:860px">
    <button class="close">×</button><h3>${esc(r.numero)}</h3>
    <iframe style="width:100%;height:64vh;border:1px solid #e5e7eb;border-radius:8px"></iframe>
    <div class="between mt"><button class="btn" id="fechar">Fechar</button><button class="btn btn-primary" id="imp">🖨 Imprimir</button></div></div>`);
  const bg = openModal(m);
  m.querySelector("iframe").srcdoc = r.html;
  m.querySelector(".close").onclick = () => bg.remove();
  m.querySelector("#fechar").onclick = () => bg.remove();
  m.querySelector("#imp").onclick = () => { const fr = m.querySelector("iframe"); fr.contentWindow.focus(); fr.contentWindow.print(); };
}

/* ----------------------------------------------------------------- clientes */
async function viewClientes() {
  main().innerHTML = `<div class="between"><div><h1 class="page-title">Clientes</h1><p class="page-sub">Gerencie o cadastro de clientes</p></div>
      <button class="btn btn-primary" id="novo">+ Novo Cliente</button></div>
    <div class="card"><div class="search"><input id="q" placeholder="Buscar por nome, CPF/CNPJ ou telefone..."></div></div>
    <div id="lista" class="grid3 mt"></div>`;
  async function reload() {
    const cs = await api("list_clientes", val("#q"));
    const lst = main().querySelector("#lista"); lst.innerHTML = "";
    if (!cs.length) lst.innerHTML = '<div class="empty">Nenhum cliente.</div>';
    cs.forEach(c => {
      const card = h(`<div class="card"><div style="font-weight:700">${esc(c.nome)}</div>
        <div class="small muted">${esc(c.codigo_interno || "")} ${c.cpf_cnpj ? "· " + esc(c.cpf_cnpj) : ""}</div>
        <div class="small" style="margin-top:8px">Tel: ${esc(c.telefone || "-")}<br>${c.email ? "Email: " + esc(c.email) + "<br>" : ""}${c.cidade ? "Cidade: " + esc(c.cidade) + "/" + esc(c.uf || "") : ""}</div>
        <div class="row mt"><button class="btn btn-sm e" style="flex:1">✏ Editar</button><button class="btn btn-sm btn-danger x">🗑</button></div></div>`);
      card.querySelector(".e").onclick = () => formCliente(c);
      card.querySelector(".x").onclick = async () => { if (await confirma("Excluir cliente?")) { await api("delete_cliente", c.id); toast("Excluído", "ok"); reload(); } };
      lst.appendChild(card);
    });
  }
  main().querySelector("#novo").onclick = () => formCliente(null);
  main().querySelector("#q").addEventListener("input", reload);
  reload();
  window.__reloadClientes = reload;
}
function formCliente(c) {
  c = c || {};
  const m = h(`<div class="modal"><button class="close">×</button><h3>${c.id ? "Editar" : "Novo"} Cliente</h3>
    <div class="grid2"><div class="field"><label>Nome *</label><input id="nome" value="${esc(c.nome || "")}"></div>
      <div class="field"><label>CPF/CNPJ</label><input id="cpf" value="${esc(c.cpf_cnpj || "")}"></div></div>
    <div class="grid2"><div class="field"><label>Apelido/Nome Fantasia</label><input id="apelido" value="${esc(c.apelido || "")}"></div>
      <div class="field"><label>RG/IE</label><input id="rgie" value="${esc(c.rg_ie || "")}"></div></div>
    <div class="grid2"><div class="field"><label>Telefone *</label><input id="tel" value="${esc(c.telefone || "")}"></div>
      <div class="field"><label>WhatsApp</label><input id="wpp" value="${esc(c.whatsapp || "")}"></div></div>
    <div class="field"><label>E-mail</label><input id="email" value="${esc(c.email || "")}"></div>
    <div class="grid2"><div class="field"><label>Endereço</label><input id="end" value="${esc(c.endereco || "")}"></div>
      <div class="field"><label>Número / Bairro</label><input id="numbairro" value="${esc((c.numero || "") + (c.bairro ? " - " + c.bairro : ""))}"></div></div>
    <div class="grid3"><div class="field"><label>Cidade</label><input id="cid" value="${esc(c.cidade || "")}"></div>
      <div class="field"><label>UF</label><input id="uf" value="${esc(c.uf || "")}"></div>
      <div class="field"><label>CEP</label><input id="cep" value="${esc(c.cep || "")}"></div></div>
    <div class="between mt"><button class="btn" id="cc">Cancelar</button><button class="btn btn-primary" id="sv">Salvar</button></div></div>`);
  const bg = openModal(m);
  m.querySelector(".close").onclick = () => bg.remove();
  m.querySelector("#cc").onclick = () => bg.remove();
  m.querySelector("#sv").onclick = async () => {
    const nb = val("#numbairro", m).split(" - ");
    const payload = { id: c.id, nome: val("#nome", m), cpf_cnpj: val("#cpf", m), apelido: val("#apelido", m),
      rg_ie: val("#rgie", m), telefone: val("#tel", m), whatsapp: val("#wpp", m), email: val("#email", m),
      endereco: val("#end", m), numero: nb[0] || "", bairro: nb[1] || "", cidade: val("#cid", m),
      uf: val("#uf", m), cep: val("#cep", m) };
    if (!payload.nome || !payload.telefone) { toast("Nome e Telefone são obrigatórios", "err"); return; }
    await api("save_cliente", payload); toast("Cliente salvo", "ok"); bg.remove(); window.__reloadClientes();
  };
}

/* ----------------------------------------------------------------- veiculos */
async function viewVeiculos() {
  const clientes = await api("list_clientes");
  main().innerHTML = `<div class="between"><div><h1 class="page-title">Veículos</h1><p class="page-sub">Gerencie o cadastro de veículos</p></div>
      <button class="btn btn-primary" id="novo">+ Novo Veículo</button></div>
    <div class="card"><div class="search"><input id="q" placeholder="Buscar por placa, marca ou modelo..."></div></div>
    <div id="lista" class="grid3 mt"></div>`;
  async function reload() {
    const vs = await api("list_veiculos", val("#q"));
    const lst = main().querySelector("#lista"); lst.innerHTML = "";
    if (!vs.length) lst.innerHTML = '<div class="empty">Nenhum veículo.</div>';
    vs.forEach(v => {
      const card = h(`<div class="card"><div style="font-weight:700">${esc(v.placa)}</div>
        <div class="small muted">${esc(v.marca || "")} ${esc(v.modelo || "")}</div>
        <div class="small" style="margin-top:8px">Ano: ${esc(v.ano_fab || "-")}<br>Cor: ${esc(v.cor || "-")}<br>Proprietário: ${esc(v.cliente_nome || "-")}</div>
        <div class="row mt"><button class="btn btn-sm e" style="flex:1">✏ Editar</button><button class="btn btn-sm btn-danger x">🗑</button></div></div>`);
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
    <div class="grid2"><div class="field"><label>Placa *</label><input id="placa" value="${esc(v.placa || "")}"></div>
      <div class="field"><label>Ano (Fab.)</label><input id="ano" value="${esc(v.ano_fab || "")}"></div></div>
    <div class="grid2"><div class="field"><label>Marca *</label><input id="marca" value="${esc(v.marca || "")}"></div>
      <div class="field"><label>Modelo *</label><input id="modelo" value="${esc(v.modelo || "")}"></div></div>
    <div class="grid2"><div class="field"><label>Versão</label><input id="versao" value="${esc(v.versao || "")}"></div>
      <div class="field"><label>Cor</label><input id="cor" value="${esc(v.cor || "")}"></div></div>
    <div class="grid2"><div class="field"><label>Chassi</label><input id="chassi" value="${esc(v.chassi || "")}"></div>
      <div class="field"><label>Renavam</label><input id="renavam" value="${esc(v.renavam || "")}"></div></div>
    <div class="grid2"><div class="field"><label>Combustível</label><input id="comb" value="${esc(v.combustivel || "")}"></div>
      <div class="field"><label>KM Atual</label><input id="km" value="${esc(v.km_atual || "")}"></div></div>
    <div class="field"><label>Proprietário *</label><select id="cli"><option value="">Selecione o cliente</option>${clientes.map(c => `<option value="${c.id}" ${c.id == v.cliente_id ? "selected" : ""}>${esc(c.nome)}</option>`).join("")}</select></div>
    <div class="between mt"><button class="btn" id="cc">Cancelar</button><button class="btn btn-primary" id="sv">Salvar</button></div></div>`);
  const bg = openModal(m);
  m.querySelector(".close").onclick = () => bg.remove();
  m.querySelector("#cc").onclick = () => bg.remove();
  m.querySelector("#sv").onclick = async () => {
    const payload = { id: v.id, placa: val("#placa", m), ano_fab: val("#ano", m), marca: val("#marca", m),
      modelo: val("#modelo", m), versao: val("#versao", m), cor: val("#cor", m), chassi: val("#chassi", m),
      renavam: val("#renavam", m), combustivel: val("#comb", m), km_atual: val("#km", m), cliente_id: val("#cli", m) || null };
    if (!payload.placa || !payload.marca || !payload.modelo) { toast("Placa, Marca e Modelo são obrigatórios", "err"); return; }
    await api("save_veiculo", payload); toast("Veículo salvo", "ok"); bg.remove(); window.__reloadVeiculos();
  };
}

/* ----------------------------------------------------------------- produtos/serviços */
async function viewProdutos() {
  main().innerHTML = `<div class="between"><div><h1 class="page-title">Produtos e Serviços</h1><p class="page-sub">Catálogo de produtos e serviços</p></div>
      <button class="btn btn-primary" id="novo">+ Novo Item</button></div>
    <div class="card"><div class="search"><input id="q" placeholder="Buscar por nome ou descrição..."></div></div>
    <div id="lista" class="grid3 mt"></div>`;
  async function reload() {
    const its = await api("list_itens", val("#q"));
    const lst = main().querySelector("#lista"); lst.innerHTML = "";
    if (!its.length) lst.innerHTML = '<div class="empty">Nenhum item.</div>';
    its.forEach(i => {
      const tipoB = i.tipo === "produto" ? '<span class="badge b-green">Produto</span>' : '<span class="badge b-orc">Serviço</span>';
      const card = h(`<div class="card"><div style="font-weight:700">${esc(i.nome)} ${tipoB}</div>
        <div class="small muted" style="margin-top:4px">${esc(i.descricao || "")}</div>
        <div class="money" style="margin-top:8px;font-size:20px">${money(i.preco)}</div>
        <div class="small muted">${i.ativo ? "Ativo" : "Inativo"} · ${esc(i.unidade || "Unidade")}</div>
        <div class="row mt"><button class="btn btn-sm e" style="flex:1">✏ Editar</button><button class="btn btn-sm btn-danger x">🗑</button></div></div>`);
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
  i = i || { tipo: "servico", unidade: "Unidade", ativo: 1, preco: 0 };
  const m = h(`<div class="modal" style="width:560px"><button class="close">×</button><h3>${i.id ? "Editar" : "Novo"} Item</h3>
    <div class="field"><label>Nome *</label><input id="nome" value="${esc(i.nome || "")}"></div>
    <div class="field"><label>Descrição</label><textarea id="desc">${esc(i.descricao || "")}</textarea></div>
    <div class="grid2"><div class="field"><label>Tipo *</label><select id="tipo"><option value="produto" ${i.tipo === "produto" ? "selected" : ""}>Produto</option><option value="servico" ${i.tipo === "servico" ? "selected" : ""}>Serviço</option></select></div>
      <div class="field"><label>Unidade</label><input id="un" value="${esc(i.unidade || "Unidade")}"></div></div>
    <div class="grid2"><div class="field"><label>Preço *</label><input id="preco" value="${i.preco || 0}"></div>
      <div class="field"><label>Ativo</label><select id="ativo"><option value="1" ${i.ativo ? "selected" : ""}>Sim</option><option value="0" ${!i.ativo ? "selected" : ""}>Não</option></select></div></div>
    <div class="between mt"><button class="btn" id="cc">Cancelar</button><button class="btn btn-primary" id="sv">Salvar</button></div></div>`);
  const bg = openModal(m);
  m.querySelector(".close").onclick = () => bg.remove();
  m.querySelector("#cc").onclick = () => bg.remove();
  m.querySelector("#sv").onclick = async () => {
    const payload = { id: i.id, nome: val("#nome", m), descricao: val("#desc", m), tipo: val("#tipo", m),
      unidade: val("#un", m), preco: num(val("#preco", m)), ativo: parseInt(val("#ativo", m)) };
    if (!payload.nome) { toast("Nome é obrigatório", "err"); return; }
    await api("save_item", payload); toast("Item salvo", "ok"); bg.remove(); window.__reloadItens();
  };
}

/* ----------------------------------------------------------------- empresa */
async function viewEmpresa() {
  const e = await api("get_empresa");
  main().innerHTML = `<h1 class="page-title">Dados da Empresa</h1><p class="page-sub">Informações que aparecem nos documentos</p>
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
      <div class="field"><label>Observações / Termos padrão</label><textarea id="termos">${esc(e.termos_padrao || "")}</textarea></div>
      <div class="muted small">Logo: ${e.has_logo ? "definido ✓ (ALVES)" : "não definido"} — <button class="btn btn-sm" id="logo">Trocar logo…</button></div></div>
    <div class="between mt" style="margin-bottom:30px"><span></span><button class="btn btn-primary" id="sv">💾 Salvar Dados</button></div>`;
  main().querySelector("#sv").onclick = async () => {
    const payload = { razao_social: val("#razao"), nome_fantasia: val("#fant"), cnpj: val("#cnpj"), ie: val("#ie"),
      slogan: val("#slogan"), telefone: val("#tel"), whatsapp: val("#wpp"), email: val("#email"), site: val("#site"),
      endereco: val("#end"), bairro: val("#bairro"), cidade: val("#cid"), uf: val("#uf"), cep: val("#cep"),
      termos_padrao: val("#termos") };
    await api("save_empresa", payload); B.empresa = payload; toast("Dados salvos", "ok");
  };
  main().querySelector("#logo").onclick = async () => {
    const path = window.prompt("Cole o caminho do arquivo de imagem do logo (PNG/JPG):", "");
    if (path) { try { await api("update_logo", { path }); toast("Logo atualizado", "ok"); viewEmpresa(); } catch (e) { } }
  };
}

/* ----------------------------------------------------------------- backup + init */
async function doBackup() {
  const r = await api("backup"); toast("Backup salvo em: " + r.arquivo, "ok");
}
function bindNav() {
  document.querySelectorAll(".menu a").forEach(a => a.onclick = () => setView(a.dataset.view));
  document.getElementById("btn-backup").onclick = doBackup;
}
async function start() {
  try { B = await api("bootstrap"); } catch (e) { /* segue com defaults */ }
  bindNav();
  setView("dashboard");
}
if (window.pywebview && window.pywebview.api) start();
else window.addEventListener("pywebviewready", start);
