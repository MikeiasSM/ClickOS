# App "Sistema OS ALVES" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicativo desktop offline (1 executável) para controle de Orçamentos/Ordens de Serviço da ALVES Chapeação e Pintura, com histórico em SQLite e impressão A4 fiel à planilha atual.

**Architecture:** Python expõe uma API a uma UI HTML/CSS/JS renderizada em janela nativa via `pywebview` (WebView2). `sqlite3` para dados em `%APPDATA%\AlvesOS\`. Impressão por template Jinja2 A4 + `window.print()`. Empacotado em 1 `.exe` com PyInstaller.

**Tech Stack:** Python 3.13, pywebview (WebView2), sqlite3 (stdlib), Jinja2, Pillow, pytest, PyInstaller.

**Spec:** `docs/superpowers/specs/2026-06-13-app-os-orcamento-alves-design.md`

**Project root:** `c:\Users\Plenustechdev\Desktop\Amauri\AlvesOS\`

---

## File Structure

```
AlvesOS/
  src/alvesos/
    __init__.py
    paths.py          # localiza %APPDATA%\AlvesOS, assets bundled (PyInstaller _MEIPASS)
    db.py             # conexão, schema (DDL), migração por schema_version, seed ALVES+exemplos
    models.py         # dataclasses: Cliente, Veiculo, ItemCatalogo, Documento, DocumentoItem, Lataria
    services.py       # regras puras: numeração, cálculo de totais, conversão orçamento->OS
    repositories.py   # CRUD por entidade (clientes, veiculos, itens, documentos)
    api.py            # Api: métodos chamados pelo JS (js_api) — orquestra repos/services
    printing.py       # monta HTML A4 (Jinja2) a partir de um documento
    backup.py         # copiar/restaurar o .db
    main.py           # entrada: inicializa DB, cria janela pywebview, registra Api
  src/alvesos/web/
    index.html        # shell (sidebar + container)
    styles.css        # visual do protótipo
    app.js            # roteamento de telas, chamadas à Api, render
  src/alvesos/templates/
    print.html        # template A4 (Jinja2)
  src/alvesos/assets/
    logo.png          # Logo simplificada (copiada de ../../../Logo simplificada.png)
    icon.ico          # ícone do app
  tests/
    test_services.py
    test_repositories.py
    test_db.py
    test_printing.py
  requirements.txt
  build.ps1           # empacotamento PyInstaller
  LICENSE / README.md
```

LISTA_PECAS (lataria, ordem fixa): Capô, Teto, Porta Diant. Esq., Porta Tras. Esq., Porta Diant. Dir., Porta Tras. Dir., Para-lama Diant. Esq., Para-lama Diant. Dir., Tampa Traseira, Para-choque Diant., Para-choque Tras.

---

## Task 0: Project setup

**Files:** Create `AlvesOS/requirements.txt`, `AlvesOS/src/alvesos/__init__.py`, `tests/__init__.py`, copy logo asset.

- [ ] **Step 1:** Criar a árvore de pastas de `File Structure`.
- [ ] **Step 2:** `requirements.txt`:
```
pywebview==5.*
Jinja2==3.*
Pillow==11.*
pytest==8.*
pyinstaller==6.*
```
- [ ] **Step 3:** Copiar `Logo simplificada.png` → `src/alvesos/assets/logo.png`.
- [ ] **Step 4:** `git init` no projeto; `.gitignore` com `__pycache__/`, `build/`, `dist/`, `*.spec`, `.pytest_cache/`.
- [ ] **Step 5:** `python -m pip install -r requirements.txt`. Esperado: instala sem erro.
- [ ] **Step 6:** Commit: `chore: project scaffold`.

---

## Task 1: paths.py (localização de dados e assets)

**Files:** Create `src/alvesos/paths.py`, `tests/test_paths.py`.

- [ ] **Step 1 (test):**
```python
from alvesos import paths
def test_data_dir_under_appdata(tmp_path, monkeypatch):
    monkeypatch.setenv("APPDATA", str(tmp_path))
    d = paths.data_dir()
    assert d.exists() and d.name == "AlvesOS"
def test_db_path_inside_data_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("APPDATA", str(tmp_path))
    assert paths.db_path().parent == paths.data_dir()
```
- [ ] **Step 2:** Rodar `pytest tests/test_paths.py -v` → FAIL.
- [ ] **Step 3 (impl):** `data_dir()` = `Path(os.environ["APPDATA"])/"AlvesOS"` (cria com `mkdir(parents, exist_ok)`), `backups_dir()`, `db_path()` = `data_dir()/"alvesos.db"`, `asset(name)` que resolve via `sys._MEIPASS` (PyInstaller) ou pasta `assets/` local.
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Commit `feat: app paths`.

---

## Task 2: db.py (schema + migração + seed)

**Files:** Create `src/alvesos/db.py`, `tests/test_db.py`.

DDL (todas as tabelas do spec, §3). `PRAGMA foreign_keys=ON`. Tabela `meta(schema_version INTEGER)`.
Seed: empresa id=1 com dados ALVES (Razão Social "ALVES - Chapeação e Pintura", CNPJ 51.858.310/0001-82,
IE 209.913.600, endereço "Top Park, Rua A, Av. Proncial", bairro "Top Park", cidade "Luís Eduardo Magalhães",
uf "BA", cep "47.850-000", telefone "(77) 99154-3326", whatsapp "(77) 99851-3755", slogan
"QUALIDADE POR VOCÊ VÊ, CUIDADO POR VOCÊ CONFIA!", logo = bytes de assets/logo.png) + catálogo exemplo
(Alinhamento e Balanceamento serviço 120, Revisão Completa serviço 350, Filtro de Ar produto 45, etc.).

- [ ] **Step 1 (test):**
```python
import sqlite3
from alvesos import db
def test_connect_creates_schema(tmp_path):
    con = db.connect(tmp_path/"t.db")
    names = {r[0] for r in con.execute("select name from sqlite_master where type='table'")}
    assert {"empresa","clientes","veiculos","itens_catalogo","documentos",
            "documento_itens","documento_lataria","contadores","meta"} <= names
def test_seed_empresa_alves(tmp_path):
    con = db.connect(tmp_path/"t.db")
    row = con.execute("select cnpj from empresa where id=1").fetchone()
    assert row[0] == "51.858.310/0001-82"
def test_idempotent(tmp_path):
    p = tmp_path/"t.db"; db.connect(p).close(); con = db.connect(p)
    assert con.execute("select count(*) from empresa").fetchone()[0] == 1
```
- [ ] **Step 2:** `pytest tests/test_db.py -v` → FAIL.
- [ ] **Step 3 (impl):** `connect(path)`: abre, ativa FKs, `row_factory=sqlite3.Row`, roda `_migrate` (cria schema se `schema_version` ausente; seed só se `empresa` vazia). DDL completa + seed.
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: sqlite schema, migration and ALVES seed`.

---

## Task 3: services.py — numeração (TDD)

**Files:** Create `src/alvesos/services.py`, `tests/test_services.py`.

- [ ] **Step 1 (test):**
```python
from alvesos import db, services
def test_next_number_orcamento(tmp_path):
    con = db.connect(tmp_path/"t.db")
    assert services.next_number(con, "orcamento", ano=2026) == "ORC-2026-0001"
    assert services.next_number(con, "orcamento", ano=2026) == "ORC-2026-0002"
    assert services.next_number(con, "os", ano=2026) == "OS-2026-0001"
def test_sequence_resets_per_year(tmp_path):
    con = db.connect(tmp_path/"t.db")
    services.next_number(con, "os", ano=2026)
    assert services.next_number(con, "os", ano=2027) == "OS-2027-0001"
```
- [ ] **Step 2:** FAIL.
- [ ] **Step 3 (impl):** `next_number(con, tipo, ano)`: `INSERT ... ON CONFLICT(tipo,ano) DO UPDATE SET ultimo=ultimo+1 RETURNING ultimo`; prefixo `ORC-`/`OS-`; formata `{prefixo}{ano}-{ultimo:04d}`. Transação.
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: document numbering`.

---

## Task 4: services.py — totais (TDD)

**Files:** Modify `src/alvesos/services.py`, `tests/test_services.py`.

- [ ] **Step 1 (test):**
```python
from alvesos import services
def test_line_liquido():
    assert services.line_liquido(qtd=3, bruto=100, desconto=50) == 250.0
def test_document_totals():
    itens = [dict(quantidade=3, valor_unitario=100, desconto=50),
             dict(quantidade=1, valor_unitario=45.5, desconto=0)]
    t = services.compute_totals(itens, desconto_geral=10, acrescimo=5)
    assert t["subtotal"] == 295.5
    assert t["total"] == 290.5
```
- [ ] **Step 2:** FAIL.
- [ ] **Step 3 (impl):** `line_liquido(qtd,bruto,desconto)=round(qtd*bruto-desconto,2)`; `compute_totals(itens, desconto_geral, acrescimo)` → soma `line_liquido` = subtotal, `total=round(subtotal-desconto_geral+acrescimo,2)`. Tolerante a None/strings via coerção numérica.
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: totals computation`.

---

## Task 5: repositories.py — CRUD (TDD por entidade)

**Files:** Create `src/alvesos/repositories.py`, `src/alvesos/models.py`, `tests/test_repositories.py`.

Cada repo recebe `con`. Métodos: `create/update/delete/get/list/search`. `clientes.create` gera
`codigo_interno` sequencial (CLI-####). `veiculos` valida placa única e FK cliente. Bloquear delete de
cliente/veículo com documentos vinculados (levanta `services.EmVinculo`).

- [ ] **Step 1 (test):** testes para: criar cliente gera código `CLI-0001`; criar veículo exige cliente; criar
  documento persiste itens+lataria (11 peças) e recalcula totais; `search` por número/cliente/placa; bloquear
  delete de cliente vinculado.
```python
def test_create_cliente_codigo(tmp_path):
    con = db.connect(tmp_path/"t.db")
    c = repositories.clientes.create(con, {"nome":"João","telefone":"x"})
    assert c["codigo_interno"] == "CLI-0001"
def test_documento_persists_items_and_lataria(tmp_path):
    con = db.connect(tmp_path/"t.db")
    cli = repositories.clientes.create(con, {"nome":"João","telefone":"x"})
    vei = repositories.veiculos.create(con, {"placa":"ABC1D23","cliente_id":cli["id"],"marca":"GM","modelo":"Onix"})
    doc = repositories.documentos.create(con, {
        "tipo":"orcamento","data_abertura":"2026-06-13","cliente_id":cli["id"],"veiculo_id":vei["id"],
        "itens":[{"descricao":"Pintura","tipo":"servico","quantidade":3,"valor_unitario":100,"desconto":50}],
        "desconto_geral":0,"acrescimo":0,
        "lataria":[{"peca":"Capô","estado":"OK"}]})
    full = repositories.documentos.get(con, doc["id"])
    assert full["numero"].startswith("ORC-")
    assert full["total"] == 250.0
    assert len(full["lataria"]) == 11   # completa as 11 peças
    assert len(full["itens"]) == 1
```
- [ ] **Step 2:** FAIL.
- [ ] **Step 3 (impl):** implementar repos. `documentos.create`: gera número (services), insere documento, itens, e 11 linhas de lataria (mescla as marcadas com `LISTA_PECAS`), grava totais. `get` retorna dict aninhado (itens+lataria). `update` regrava itens/lataria. `convert_to_os(con, orcamento_id)` em services usando repos.
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: repositories (CRUD) with documents`.

---

## Task 6: services.convert_to_os (TDD)

**Files:** Modify `services.py`, `tests/test_services.py`.

- [ ] **Step 1 (test):** criar orçamento → `convert_to_os` cria documento `tipo='os'`, número `OS-...`,
  copia itens/lataria/checklist, grava `origem_orcamento_id`, marca orçamento `Aprovado`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3 (impl):** `convert_to_os(con, orcamento_id)`.
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: convert orçamento to OS`.

---

## Task 7: api.py (ponte JS) — testes de fumaça

**Files:** Create `src/alvesos/api.py`, `tests/test_api.py`.

`class Api` recebe `con`. Métodos JSON-serializáveis: `dashboard()`, `list_documentos(filtro)`,
`get_documento(id)`, `save_documento(payload)`, `delete_documento(id)`, `converter_os(id)`,
`list_clientes/save_cliente/delete_cliente`, idem veículos e itens, `get_empresa/save_empresa`,
`print_documento(id)` (retorna HTML), `backup()/restore(path)`. Cada um abre/usa `con` e retorna dict.

- [ ] **Step 1 (test):** `Api(con).dashboard()` retorna chaves `total, abertas, clientes, faturamento_mes, recentes`; `save_documento` cria e `list_documentos` lista.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3 (impl):** delega para repos/services; trata erros retornando `{"ok":False,"erro":...}`.
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: js_api bridge`.

---

## Task 8: printing.py + templates/print.html (A4)

**Files:** Create `src/alvesos/printing.py`, `src/alvesos/templates/print.html`, `tests/test_printing.py`.

Template reproduz a planilha (spec §5): CSS `@page{size:A4;margin:8mm}`, logo (data URI base64 do BLOB),
cabeçalho, Nº/Data/Status, Tipo, cliente, veículo+KM, checklist (grade lataria com OK/Avaria, itens entregues,
nível, obs), tabela serviços (Nº·Descrição·Qtd·Vlr Bruto·Desconto·Vlr Líquido), resumo (Serviços·Desconto·
Acréscimo·Total), condições, assinaturas, rodapé "Documento gerado em…".

- [ ] **Step 1 (test):** `render_documento(doc, empresa)` retorna HTML contendo o número, nome do cliente,
  "Vlr Líquido", "ASSINATURAS" e `@page`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3 (impl):** Jinja2 `Environment` com loader do diretório `templates`; função monta data URI do logo.
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: A4 print template`.

---

## Task 9: backup.py (TDD)

**Files:** Create `src/alvesos/backup.py`, `tests/test_backup.py`.

- [ ] **Step 1 (test):** `backup(db_path, dest_dir)` cria arquivo `alvesos-*.db` cópia; `restore(src, db_path)` substitui.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3 (impl):** usar `sqlite3` backup API ou `shutil.copy2`; nome com timestamp passado por parâmetro (sem `Date.now` no core — recebe `stamp`).
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: backup/restore`.

---

## Task 10: web UI (index.html, styles.css, app.js)

**Files:** Create `src/alvesos/web/{index.html,styles.css,app.js}`.

Replica o protótipo: barra lateral (Dashboard, Ordens de Serviço, Clientes, Veículos, Produtos e Serviços,
Dados da Empresa), cartões/listas, modais de cadastro, formulário de documento com as seções (Dados Principais,
Itens dinâmicos, Checklist de Entrada, Condições, Observações), botões Salvar/Imprimir/Converter. `app.js`
chama `window.pywebview.api.<metodo>(...)` (Promises) e renderiza. Sem CDN (tudo local). Estilo limpo
(cores do protótipo: azul #2563eb, cinzas, cartões com sombra).

- [ ] **Step 1:** `index.html` shell + carregamento de `app.js`/`styles.css`.
- [ ] **Step 2:** `styles.css` (sidebar, cards, modal, form, tabela de itens, badges de status).
- [ ] **Step 3:** `app.js` — roteamento por tela + render de cada tela consumindo a Api; tela Documento com
  itens dinâmicos (recalcular total no front e confirmar no back) e seção de checklist (11 peças OK/Avaria).
- [ ] **Step 4:** Commit `feat: web UI`.

(Verificação visual ocorre na Task 12 ao abrir a janela.)

---

## Task 11: main.py (janela pywebview)

**Files:** Create `src/alvesos/main.py`.

- [ ] **Step 1 (impl):** `connect(db_path())`; instanciar `Api(con)`; `webview.create_window("Sistema OS - ALVES", url=asset web/index.html, js_api=api, width=1280, height=820, min_size=(1024,680))`; `webview.start()`. Impressão: método `Api.print_documento` retorna HTML; `app.js` abre janela de impressão (`webview` segunda janela ou injeta HTML e chama `window.print()`).
- [ ] **Step 2 (run manual):** `python -m alvesos.main` (com `PYTHONPATH=src`) → janela abre no Dashboard.
- [ ] **Step 3:** Commit `feat: pywebview shell`.

---

## Task 12: Verificação ponta-a-ponta (manual)

- [ ] Abrir o app; cadastrar cliente, veículo, item.
- [ ] Criar Orçamento (itens + checklist preenchido) → salvar → aparece na lista e no dashboard.
- [ ] Imprimir → conferir A4 (1 página, layout da planilha) salvando em PDF.
- [ ] Converter Orçamento → OS (número OS-, vínculo).
- [ ] Busca/filtro; excluir; backup.
- [ ] Rodar `pytest -q` (todos verdes).
- [ ] Commit `test: end-to-end manual verification notes`.

---

## Task 13: Empacotamento (PyInstaller) — 1 executável

**Files:** Create `AlvesOS/build.ps1`.

- [ ] **Step 1:** `build.ps1`:
```powershell
pyinstaller --onefile --windowed --name AlvesOS `
  --add-data "src/alvesos/web;alvesos/web" `
  --add-data "src/alvesos/templates;alvesos/templates" `
  --add-data "src/alvesos/assets;alvesos/assets" `
  --icon src/alvesos/assets/icon.ico `
  --paths src src/alvesos/main.py
```
- [ ] **Step 2:** Ajustar `paths.asset()` para usar `sys._MEIPASS` quando empacotado.
- [ ] **Step 3:** Rodar `build.ps1` → `dist/AlvesOS.exe`.
- [ ] **Step 4 (run):** duplo-clique no `.exe` → app abre, cria `%APPDATA%\AlvesOS\alvesos.db`, funciona offline.
- [ ] **Step 5:** Commit `build: single-exe packaging`.

---

## Self-review (coberto)
Spec §2 Arquitetura→Tasks 11/13; §3 Dados→Tasks 2/5; §4 Telas→Tasks 7/10; §4 Numeração→Task 3;
§4 Cálculos→Task 4; §4 Conversão→Task 6; §5 Impressão→Task 8; §6 Backup→Task 9; §6 Empacotamento→Task 13;
§7 Erros→Task 7 (try/erro) + UI; §8 Testes→Tasks 1-9 (pytest) + Task 12 (manual).
