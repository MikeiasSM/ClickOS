# ClickOS — Gestão de Ordens de Serviço e Orçamentos

Aplicativo **desktop offline** para oficinas (chapeação e pintura) controlarem **Orçamentos** e
**Ordens de Serviço** com **histórico**, cadastro de clientes/veículos/itens e **impressão A4** no
padrão do documento operacional (logo, checklist de entrada com lataria/avarias, assinaturas).

Feito para ser simples: **um único executável**, banco local **SQLite**, sem internet.

## Funcionalidades
- **Dashboard** com indicadores (total, abertas, clientes, faturamento do mês).
- **Documentos** Orçamento/OS: número automático `ORC-AAAA-####` / `OS-AAAA-####`, itens
  (Qtd · Vlr Bruto · Desconto · Vlr Líquido), desconto/acréscimo, total; **converter orçamento em OS**.
- **Checklist de entrada** digital: lataria (11 peças OK/Avaria), estado geral, itens entregues,
  nível de combustível, observações.
- **Clientes**, **Veículos** e **Produtos/Serviços** (CRUD).
- **Dados da Empresa** (pré-cadastrada com a ALVES) + logo + termos padrão.
- **Impressão A4** (1 página) pronta para PDF/papel.
- **Backup** do banco em um clique.

## Tecnologia
Python · [pywebview](https://pywebview.flowrl.com/) (WebView2) · SQLite (stdlib) · Jinja2 · Pillow.
UI em HTML/CSS/JS. Empacotado com PyInstaller.

## Executar (desenvolvimento)
```bash
pip install -r requirements.txt
python run.py
```
Os dados ficam em `%APPDATA%\ClickOS\clickos.db` (criado e populado no 1º uso).

## Testes
```bash
python -m pytest -q
```

## Gerar o executável (Windows)
```powershell
./build.ps1
# saída: dist/ClickOS.exe  (duplo-clique para usar)
```
Requer o **WebView2 Runtime** (já incluso no Windows 11; no Windows 10 instale o
"Evergreen WebView2 Runtime" da Microsoft).

## Estrutura
```
src/clickos/      backend (db, services, repositories, api), UI (web/), template A4 (templates/)
tests/            pytest
run.py            lançador / entrada do PyInstaller
build.ps1         empacotamento
docs/             spec e plano (spec-driven development)
```
