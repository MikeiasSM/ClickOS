"""Monta os entregáveis de um documento (HTML de impressão e Excel), reaproveitando exatamente
o mesmo conteúdo que o desktop gera. Compartilhado entre a Api (desktop) e o servidor mobile,
para que o PDF e o Excel sejam IDÊNTICOS aos do app desktop."""
from datetime import datetime

from . import excel_export, printing, repositories as repo, services


def _contexto(con, did):
    doc = repo.documentos.get(con, did)
    if not doc:
        raise ValueError("Documento não encontrado.")
    cliente = repo.clientes.get(con, doc["cliente_id"]) if doc.get("cliente_id") else {}
    veiculo = repo.veiculos.get(con, doc["veiculo_id"]) if doc.get("veiculo_id") else {}
    empresa = dict(con.execute("SELECT * FROM empresa WHERE id=1").fetchone())
    prefs = repo.get_preferencias(con)
    com_fotos = str(prefs.get("os_print_fotos", "1")) == "1" and doc.get("tipo") == "os"
    return doc, empresa, cliente, veiculo, prefs, com_fotos


def documento_html(con, did):
    """HTML de impressão (mesmo do desktop) — vira PDF fiel via pdfgen/WebView2."""
    doc, empresa, cliente, veiculo, prefs, com_fotos = _contexto(con, did)
    fotos = []
    if com_fotos:
        fotos = [{"uri": services.image_data_uri(r["thumb"])} for r in repo.fotos.list_thumbs(con, did)]
    html = printing.render_documento(doc, empresa, cliente, veiculo, prefs=prefs, fotos=fotos,
                                     gerado_em=datetime.now().strftime("%d/%m/%Y às %H:%M"))
    return doc, html


def documento_excel(con, did):
    """Planilha .xlsx (mesma do desktop)."""
    doc, empresa, cliente, veiculo, prefs, com_fotos = _contexto(con, did)
    fotos = []
    if com_fotos:
        fotos = [bytes(r["thumb"]) for r in repo.fotos.list_thumbs(con, did)]
    return doc, excel_export.gerar(doc, empresa, cliente, veiculo, prefs, fotos)
