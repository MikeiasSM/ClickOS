"""Exporta um documento (orçamento/O.S.) para .xlsx replicando o layout impresso — editável.

Mantém o mesmo conteúdo e disposição do print (cabeçalho da empresa, dados da pessoa/veículo,
tabela de itens, resumo financeiro e condições) numa planilha sem proteção, pronta para edição.
"""
from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

_THIN = Side(style="thin", color="000000")
_BORDER = Border(left=_THIN, right=_THIN, top=_THIN, bottom=_THIN)
_GRAY = PatternFill("solid", fgColor="D9D9D9")
_LIGHT = PatternFill("solid", fgColor="F2F2F2")
_BOLD = Font(bold=True)
_L = Alignment(horizontal="left", vertical="center", wrap_text=True)
_C = Alignment(horizontal="center", vertical="center", wrap_text=True)
_R = Alignment(horizontal="right", vertical="center")
COLS = "ABCDEFG"  # 7 colunas


def _brl(v) -> str:
    try:
        n = float(v or 0)
    except (TypeError, ValueError):
        n = 0.0
    return "R$ " + f"{n:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


def _qtd(v) -> str:
    try:
        n = float(v or 0)
    except (TypeError, ValueError):
        n = 0.0
    return f"{n:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


def _dt(s) -> str:
    s = str(s or "")
    if len(s) >= 10 and s[4] == "-" and s[7] == "-":
        data = f"{s[8:10]}/{s[5:7]}/{s[0:4]}"
        if len(s) >= 16 and s[10] in ("T", " "):
            return f"{data} {s[11:16]}"
        return data
    return s


def gerar(doc, empresa, cliente, veiculo) -> bytes:
    empresa = empresa or {}
    cliente = cliente or {}
    veiculo = veiculo or {}
    wb = Workbook()
    ws = wb.active
    ws.title = "Orcamento" if doc.get("tipo") == "orcamento" else "OrdemServico"
    ws.sheet_view.showGridLines = False
    larguras = [4, 26, 16, 12, 12, 14, 14]
    for i, w in enumerate(larguras):
        ws.column_dimensions[get_column_letter(i + 1)].width = w

    row = [1]  # cursor mutável

    def merge(r, c1, c2):
        ws.merge_cells(f"{c1}{r}:{c2}{r}")

    def box(r1, r2):
        for r in range(r1, r2 + 1):
            for c in COLS:
                ws[f"{c}{r}"].border = _BORDER

    def secao(texto):
        r = row[0]
        merge(r, "A", "G")
        cel = ws[f"A{r}"]
        cel.value = texto
        cel.font = Font(bold=True, size=10.5)
        cel.fill = _GRAY
        cel.alignment = _L
        box(r, r)
        row[0] += 1

    def campo(label, valor, lc="A", vc1="B", vc2="C", label2=None, valor2=None, l2c="D", v2c1="E", v2c2="G"):
        r = row[0]
        ws[f"{lc}{r}"] = label
        ws[f"{lc}{r}"].font = _BOLD
        ws[f"{lc}{r}"].alignment = _L
        merge(r, vc1, vc2)
        ws[f"{vc1}{r}"] = valor or ""
        ws[f"{vc1}{r}"].alignment = _L
        if label2 is not None:
            ws[f"{l2c}{r}"] = label2
            ws[f"{l2c}{r}"].font = _BOLD
            ws[f"{l2c}{r}"].alignment = _L
            merge(r, v2c1, v2c2)
            ws[f"{v2c1}{r}"] = valor2 or ""
            ws[f"{v2c1}{r}"].alignment = _L
        box(r, r)
        row[0] += 1

    # ---- Cabeçalho: empresa + meta ----
    nome_emp = empresa.get("razao_social") or empresa.get("nome_fantasia") or "Empresa"
    det = []
    if empresa.get("cnpj"):
        det.append(f"CNPJ: {empresa['cnpj']}")
    if empresa.get("ie"):
        det.append(f"I.E.: {empresa['ie']}")
    linha2 = (empresa.get("endereco") or "")
    if empresa.get("cidade"):
        linha2 += f" - {empresa['cidade']}/{empresa.get('uf') or ''}"
    if empresa.get("cep"):
        linha2 += f" - CEP: {empresa['cep']}"
    linha3 = []
    if empresa.get("telefone"):
        linha3.append(f"Tel: {empresa['telefone']}")
    if empresa.get("whatsapp"):
        linha3.append(f"WhatsApp: {empresa['whatsapp']}")
    r0 = row[0]
    merge(r0, "A", "E")
    ws[f"A{r0}"] = nome_emp + "\n" + "  ".join(det) + "\n" + linha2 + "\n" + "  ".join(linha3)
    ws[f"A{r0}"].font = Font(bold=True, size=12)
    ws[f"A{r0}"].alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    merge(r0, "F", "G")
    tipo_lbl = "ORÇAMENTO" if doc.get("tipo") == "orcamento" else "ORDEM DE SERVIÇO"
    meta = [f"Nº {doc.get('numero', '')}", f"Data: {_dt(doc.get('data_abertura'))}", f"Status: {doc.get('status', '')}"]
    if doc.get("usuario_nome"):
        meta.append(f"Atend.: {doc['usuario_nome']}")
    if doc.get("faturado_em"):
        meta.append(f"Fatur.: {_dt(doc['faturado_em'])}")
    if doc.get("ordem_compra"):
        meta.append(f"O.C.: {doc['ordem_compra']}")
    ws[f"F{r0}"] = "\n".join(meta)
    ws[f"F{r0}"].font = Font(size=9)
    ws[f"F{r0}"].alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    ws.row_dimensions[r0].height = 64
    box(r0, r0)
    row[0] += 1
    # título
    r = row[0]
    merge(r, "A", "G")
    ws[f"A{r}"] = tipo_lbl
    ws[f"A{r}"].font = Font(bold=True, size=13)
    ws[f"A{r}"].alignment = _C
    box(r, r)
    row[0] += 1

    # ---- Dados da pessoa ----
    secao("DADOS DA PESSOA")
    campo("Nome", cliente.get("nome") or doc.get("cliente_nome"), label2="CPF/CNPJ", valor2=cliente.get("cpf_cnpj"))
    endereco = cliente.get("endereco") or ""
    if cliente.get("cidade"):
        endereco += f" - {cliente['cidade']}/{cliente.get('uf') or ''}"
    campo("Telefone", cliente.get("telefone"), label2="WhatsApp", valor2=cliente.get("whatsapp"))
    campo("Endereço", endereco, vc2="G", label2=None)

    # ---- Dados do veículo ----
    secao("DADOS DO VEÍCULO")
    campo("Placa", veiculo.get("placa") or doc.get("veiculo_placa"),
          label2="Marca/Modelo", valor2=f"{veiculo.get('marca') or ''} {veiculo.get('modelo') or ''}".strip())
    campo("Cor", veiculo.get("cor"), label2="Combustível", valor2=veiculo.get("combustivel"))
    campo("Quilometragem", doc.get("km_entrada"), label2="Renavam", valor2=veiculo.get("renavam"))

    # ---- Itens ----
    secao("SERVIÇOS / PRODUTOS")
    rh = row[0]
    cabec = ["#", "Descrição (serviço / produto)", "Qtd", "Vlr Bruto", "Desconto", "Vlr Líquido"]
    merge(rh, "B", "C")  # descrição ocupa B:C
    ws[f"A{rh}"] = "#"
    ws[f"B{rh}"] = "Descrição (serviço / produto)"
    ws[f"D{rh}"] = "Qtd"
    ws[f"E{rh}"] = "Vlr Bruto"
    ws[f"F{rh}"] = "Desconto"
    ws[f"G{rh}"] = "Vlr Líquido"
    for c in COLS:
        ws[f"{c}{rh}"].font = _BOLD
        ws[f"{c}{rh}"].fill = _LIGHT
        ws[f"{c}{rh}"].alignment = _C
    box(rh, rh)
    row[0] += 1
    itens = doc.get("itens") or []
    for i, it in enumerate(itens, 1):
        r = row[0]
        merge(r, "B", "C")
        ws[f"A{r}"] = i
        ws[f"A{r}"].alignment = _C
        ws[f"B{r}"] = it.get("descricao") or ""
        ws[f"B{r}"].alignment = _L
        ws[f"D{r}"] = _qtd(it.get("quantidade"))
        ws[f"D{r}"].alignment = _R
        ws[f"E{r}"] = _brl(it.get("valor_unitario"))
        ws[f"E{r}"].alignment = _R
        ws[f"F{r}"] = _brl(it.get("desconto"))
        ws[f"F{r}"].alignment = _R
        ws[f"G{r}"] = _brl(it.get("valor_liquido"))
        ws[f"G{r}"].alignment = _R
        box(r, r)
        row[0] += 1
    # linhas vazias para preenchimento manual (mínimo de 4)
    for _ in range(max(0, 4 - len(itens))):
        r = row[0]
        merge(r, "B", "C")
        box(r, r)
        row[0] += 1

    # ---- Resumo ----
    desc = doc.get("desconto_valor")
    if desc is None:
        desc = doc.get("desconto_geral")
    acr = doc.get("acrescimo_valor")
    if acr is None:
        acr = doc.get("acrescimo")
    for label, valor in (("Subtotal", doc.get("subtotal")), ("Desconto", desc), ("Acréscimo", acr)):
        r = row[0]
        merge(r, "A", "E")
        ws[f"F{r}"] = label
        ws[f"F{r}"].font = _BOLD
        ws[f"F{r}"].alignment = _R
        ws[f"G{r}"] = _brl(valor)
        ws[f"G{r}"].alignment = _R
        box(r, r)
        row[0] += 1
    r = row[0]
    merge(r, "A", "E")
    ws[f"F{r}"] = "TOTAL GERAL"
    ws[f"F{r}"].font = Font(bold=True, size=12)
    ws[f"F{r}"].alignment = _R
    ws[f"G{r}"] = _brl(doc.get("total"))
    ws[f"G{r}"].font = Font(bold=True, size=12)
    ws[f"G{r}"].alignment = _R
    box(r, r)
    row[0] += 1

    # ---- Condições ----
    secao("CONDIÇÕES COMERCIAIS")
    campo("Forma de Pagamento", doc.get("forma_pagamento"), label2="Validade", valor2=doc.get("validade"))
    if doc.get("prazo_execucao"):
        campo("Prazo de Execução", doc.get("prazo_execucao"), vc2="G", label2=None)
    if doc.get("observacoes"):
        secao("OBSERVAÇÕES")
        r = row[0]
        merge(r, "A", "G")
        ws[f"A{r}"] = doc.get("observacoes")
        ws[f"A{r}"].alignment = _L
        ws.row_dimensions[r].height = 38
        box(r, r)
        row[0] += 1

    # ---- Parecer técnico (O.S.) ----
    if doc.get("parecer_mecanico") or doc.get("mecanico"):
        titulo = "PARECER TÉCNICO"
        if doc.get("mecanico"):
            titulo += f" — {doc['mecanico']}"
        secao(titulo)
        r = row[0]
        merge(r, "A", "G")
        ws[f"A{r}"] = doc.get("parecer_mecanico") or ""
        ws[f"A{r}"].alignment = _L
        ws.row_dimensions[r].height = 38
        box(r, r)
        row[0] += 1

    # ---- Assinaturas ----
    row[0] += 1
    r = row[0]
    merge(r, "A", "C")
    merge(r, "E", "G")
    ws[f"A{r}"] = "Assinatura da Pessoa — Nome / Data"
    ws[f"A{r}"].alignment = _C
    ws[f"A{r}"].border = Border(top=_THIN)
    ws[f"E{r}"] = "Responsável pela Empresa — Nome / Data"
    ws[f"E{r}"].alignment = _C
    ws[f"E{r}"].border = Border(top=_THIN)
    ws.row_dimensions[r].height = 34

    # impressão em A4 retrato ajustada à largura
    ws.page_setup.orientation = "portrait"
    ws.page_setup.paperSize = 9
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()
