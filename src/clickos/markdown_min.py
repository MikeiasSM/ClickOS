"""Conversor Markdown mínimo (sem dependências) usado no termo de garantia.

`to_html` gera HTML seguro para a impressão (o conteúdo é escapado antes da formatação);
`to_text` remove os operadores deixando texto legível para a planilha Excel.
Cobre: cabeçalhos, negrito/itálico, código, listas (- * 1.), regra (---) e links.
"""
import html
import re


def _inline(t: str) -> str:
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"__([^_]+)__", r"<strong>\1</strong>", t)
    t = re.sub(r"(^|[^*])\*([^*\n]+)\*", r"\1<em>\2</em>", t)
    t = re.sub(r"(^|[^_])_([^_\n]+)_", r"\1<em>\2</em>", t)
    t = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", r'<a href="\2">\1</a>', t)
    return t


def to_html(md) -> str:
    if not md:
        return ""
    s = html.escape(str(md))  # escapa antes de formatar (sem risco de injeção)
    out, lista = [], None

    def fecha():
        nonlocal lista
        if lista:
            out.append(f"</{lista}>")
            lista = None

    for ln in s.replace("\r\n", "\n").split("\n"):
        m = re.match(r"^(#{1,6})\s+(.*)$", ln)
        if m:
            fecha()
            n = len(m.group(1))
            out.append(f"<h{n}>{_inline(m.group(2))}</h{n}>")
            continue
        if re.match(r"^\s*---+\s*$", ln):
            fecha()
            out.append("<hr>")
            continue
        m = re.match(r"^\s*[-*]\s+(.*)$", ln)
        if m:
            if lista != "ul":
                fecha()
                out.append("<ul>")
                lista = "ul"
            out.append(f"<li>{_inline(m.group(1))}</li>")
            continue
        m = re.match(r"^\s*\d+\.\s+(.*)$", ln)
        if m:
            if lista != "ol":
                fecha()
                out.append("<ol>")
                lista = "ol"
            out.append(f"<li>{_inline(m.group(1))}</li>")
            continue
        if not ln.strip():
            fecha()
            continue
        fecha()
        out.append(f"<p>{_inline(ln)}</p>")
    fecha()
    return "".join(out)


def to_text(md) -> str:
    """Texto sem operadores markdown — legível na planilha."""
    if not md:
        return ""
    out = []
    for ln in str(md).replace("\r\n", "\n").split("\n"):
        t = re.sub(r"^\s*#{1,6}\s+", "", ln)
        t = re.sub(r"^\s*[-*]\s+", "• ", t)
        t = re.sub(r"^\s*---+\s*$", "", t)
        t = re.sub(r"`([^`]+)`", r"\1", t)
        t = re.sub(r"\*\*([^*]+)\*\*", r"\1", t)
        t = re.sub(r"__([^_]+)__", r"\1", t)
        t = re.sub(r"\*([^*\n]+)\*", r"\1", t)
        t = re.sub(r"_([^_\n]+)_", r"\1", t)
        t = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", r"\1", t)
        out.append(t)
    return "\n".join(out).strip()
