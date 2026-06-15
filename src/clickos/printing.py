"""Geração do HTML A4 de impressão (Jinja2) a partir de um documento."""
import base64

from jinja2 import Environment, FileSystemLoader, select_autoescape

from . import db as dbmod
from . import paths

_env = None


def _brl(v) -> str:
    n = float(v or 0)
    s = f"{n:,.2f}"  # 1,234.56
    return "R$ " + s.replace(",", "_").replace(".", ",").replace("_", ".")


def _dt(s) -> str:
    s = str(s or "")
    if len(s) >= 10 and s[4] == "-" and s[7] == "-":
        data = f"{s[8:10]}/{s[5:7]}/{s[0:4]}"
        if len(s) >= 16 and s[10] in ("T", " "):  # timestamp: acrescenta hora:minuto
            return f"{data} {s[11:16]}"
        return data
    return s


def _environment() -> Environment:
    global _env
    if _env is None:
        tdir = str(paths.asset("templates"))
        _env = Environment(loader=FileSystemLoader(tdir), autoescape=select_autoescape(["html", "xml"]))
        _env.filters["brl"] = _brl
        _env.filters["dt"] = _dt
    return _env


def logo_data_uri(empresa) -> str:
    logo = empresa.get("logo") if isinstance(empresa, dict) else None
    if not logo:
        return ""
    return "data:image/png;base64," + base64.b64encode(logo).decode("ascii")


def render_documento(doc, empresa, cliente=None, veiculo=None, gerado_em="") -> str:
    """Retorna o HTML A4 do documento pronto para impressão."""
    tmpl = _environment().get_template("print.html")
    return tmpl.render(
        doc=doc, empresa=empresa, cliente=cliente or {}, veiculo=veiculo or {},
        logo_uri=logo_data_uri(empresa), pecas=dbmod.LISTA_PECAS,
        niveis=dbmod.NIVEIS_COMBUSTIVEL, gerado_em=gerado_em,
    )


def render_recebimento(doc, empresa, cliente=None, veiculo=None, gerado_em="") -> str:
    """Comprovante de recebimento do veículo (prova de custódia, gerado na abertura da O.S.)."""
    tmpl = _environment().get_template("recebimento.html")
    return tmpl.render(
        doc=doc, empresa=empresa, cliente=cliente or {}, veiculo=veiculo or {},
        logo_uri=logo_data_uri(empresa), niveis=dbmod.NIVEIS_COMBUSTIVEL, gerado_em=gerado_em,
    )
