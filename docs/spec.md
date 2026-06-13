# Spec — App "Sistema OS ALVES" (Controle de OS e Orçamento com histórico)

**Data:** 2026-06-13
**Autor:** Amauri (ALVES Chapeação e Pintura) + Claude
**Status:** Aprovado para planejamento

---

## 1. Contexto e objetivo

A oficina **ALVES Chapeação e Pintura** usa hoje uma planilha (`Documento_Chapeacao_Pintura.xlsx`)
para gerar Orçamentos e Ordens de Serviço. A planilha é boa para impressão, mas é **aberta a erros**
(células editáveis livremente) e **não mantém histórico** dos documentos emitidos.

Este projeto cria um **aplicativo desktop simples** que evolui a planilha para um sistema com
**banco de dados** (histórico permanente, busca e reimpressão), mantendo a **mesma impressão A4**
que a oficina já usa. Será operado por **pessoas não técnicas**, então deve ser um **único executável**
que faz tudo, **offline**, em um computador.

### Premissas confirmadas
- Impressão sai no **layout A4 completo da planilha** (logo ALVES, cabeçalho, **checklist de entrada
  com lataria/avarias**, assinaturas).
- **Checklist de entrada capturado no app (digital)** e impresso preenchido.
- **Orçamento e OS são o mesmo documento** com um campo **Tipo**; numeração `ORC-AAAA-####` / `OS-AAAA-####`;
  é possível **converter um orçamento aprovado em OS**.
- **1 computador, offline**, dados locais em **SQLite**, com **backup/exportação**.
- **Itens & descontos seguem o modelo da planilha** (por linha: Qtd · Vlr Bruto · Desconto · Vlr Líquido;
  no resumo: Desconto geral + Acréscimo + Total).
- Empresa **ALVES pré-cadastrada** (dados + logo), editável.

### Não objetivos (fora de escopo nesta versão)
- Multiusuário / rede / nuvem (só 1 PC offline).
- Controle de estoque, financeiro/fluxo de caixa, contas a pagar/receber.
- Emissão fiscal (NF-e/NFS-e).
- Busca automática de placa/CPF em serviços externos.

---

## 2. Arquitetura

Abordagem escolhida: **A) Python + WebView2 + SQLite, empacotado com PyInstaller**.

- **Único executável** `AlvesOS.exe` (PyInstaller `--onefile --windowed`), ~20–40 MB, duplo-clique.
- **UI:** HTML/CSS/JS renderizado em **janela nativa** via `pywebview` (backend **WebView2**, já instalado —
  v149). Sem navegador/localhost visível. Visual reproduz o protótipo (barra lateral, cartões, modais).
  Sem framework pesado; assets embutidos → **100% offline**.
- **Backend:** módulo Python expõe uma **API ao JS** pela ponte `js_api` do pywebview. Toda a lógica de
  negócio e acesso a dados ficam no Python.
- **Dados:** `sqlite3` (stdlib). Arquivo do banco em `%APPDATA%\AlvesOS\alvesos.db`, criado e populado
  no 1º uso (local gravável — evita pasta de instalação somente-leitura).
- **Impressão:** template **HTML/CSS com `@page A4`** preenchido com os dados do documento; `Imprimir`
  chama `window.print()` no WebView2 → diálogo do Windows (impressora física ou "Microsoft Print to PDF").

**Dependências a instalar:** `pywebview`, `pyinstaller`, `jinja2` (templates de impressão), `pillow` (logo).
Já presentes/confirmados: Python 3.13, WebView2 Runtime.

---

## 3. Modelo de dados (SQLite)

Versão de schema controlada em `meta(schema_version)` para migrações futuras. Datas em ISO-8601.

- **empresa** (1 linha, id=1): `razao_social, nome_fantasia, cnpj, ie, endereco, bairro, cidade, uf, cep,
  telefone, whatsapp, email, site, slogan, logo (BLOB), termos_padrao`.
- **contadores**: `tipo` ('orcamento'|'os'), `ano` (INT), `ultimo` (INT). PK (`tipo`,`ano`). Gera a numeração.
- **clientes**: `id, codigo_interno (CLI-####), nome, apelido, cpf_cnpj, rg_ie, telefone, whatsapp, email,
  endereco, numero, bairro, cidade, uf, cep, criado_em, atualizado_em`.
- **veiculos**: `id, placa (UNIQUE), cliente_id (FK clientes), marca, modelo, versao, ano_fab, ano_modelo,
  cor, chassi, renavam, combustivel, km_atual, criado_em, atualizado_em`.
- **itens_catalogo** (Produtos e Serviços): `id, nome, descricao, tipo ('produto'|'servico'), unidade,
  preco, ativo (0/1), criado_em`.
- **documentos**: `id, numero (UNIQUE), tipo ('orcamento'|'os'), status, data_abertura, criado_em,
  atualizado_em, cliente_id (FK), veiculo_id (FK), km_entrada, subtotal, desconto_geral, acrescimo, total,
  forma_pagamento, prazo_execucao, validade, observacoes,
  estado_geral, nivel_combustivel, obs_entrada,
  item_chave_principal, item_chave_reserva, item_documento, item_manual (0/1),
  origem_orcamento_id (FK documentos, NULL)`.
- **documento_itens**: `id, documento_id (FK, ON DELETE CASCADE), item_catalogo_id (FK, NULL),
  descricao, tipo, quantidade, valor_unitario, desconto, valor_liquido`.
- **documento_lataria**: `id, documento_id (FK, ON DELETE CASCADE), peca, estado ('OK'|'Avaria'|'')`.
  11 peças por documento (Capô, Teto, Porta Diant./Tras. Esq./Dir., Para-lama Diant. Esq./Dir.,
  Tampa Traseira, Para-choque Diant./Tras.).

**O conjunto `documentos` é o histórico** — nada é apagado automaticamente; tudo é pesquisável,
visualizável e reimprimível.

### Cálculos (idênticos à planilha)
- Linha: `valor_liquido = quantidade × valor_unitario − desconto`.
- `subtotal` (Serviços) = soma dos `valor_liquido` das linhas.
- `total = subtotal − desconto_geral + acrescimo`.
- Status possíveis: Aberta, Em Análise, Aprovado, Em Execução, Concluído, Entregue, Cancelado.

### Numeração
`ORC-AAAA-####` / `OS-AAAA-####`. Ao criar, lê/incrementa `contadores(tipo, ano)` em transação
(reinicia a sequência a cada ano). Converter orçamento→OS: cria documento `tipo='os'` copiando
cliente/veículo/itens/checklist, grava `origem_orcamento_id`, gera número de OS e marca o orçamento
como `Aprovado`.

---

## 4. Telas e funcionalidades (barra lateral, conforme protótipo)

**Menu:** Dashboard · Ordens de Serviço (Documentos) · Clientes · Veículos · Produtos e Serviços · Dados da Empresa.

1. **Dashboard** — cartões KPI (Total de Documentos, Abertas, Clientes, **Faturamento do mês** = soma do
   `total` de documentos OS no mês corrente) + lista de **documentos recentes**.
2. **Documentos** — lista em cartões com **busca** (número/cliente/placa) e **filtro** (tipo, status);
   botões **Novo**, **Ver**, **Editar**, **Excluir**, **Imprimir**.
3. **Novo/Editar Documento** (formulário em seções):
   - *Dados Principais:* Número (auto), **Tipo** (Orçamento/OS), Data de Abertura, Status, KM Entrada,
     **Cliente** (dropdown), **Veículo** (dropdown filtrado pelo cliente).
   - *Itens:* adicionar linhas (item do catálogo **ou** texto livre), **Qtd · Vlr Bruto · Desconto · Vlr Líquido**
     (auto); Subtotal; **Desconto geral**; **Acréscimo**; **Total**.
   - *Checklist de Entrada:* **Lataria** (11 peças, OK/Avaria), **Estado Geral**, **Itens Entregues**
     (Chave Principal, Chave Reserva, Documento, Manual), **Nível de Combustível**, **Observações de Entrada**.
   - *Condições Comerciais:* Forma de Pagamento, Prazo de Execução, Validade do Orçamento.
   - *Observações* (texto; pré-preenche com "termos padrão" da empresa).
   - Ações: **Salvar**; se Tipo=Orçamento, **Converter em OS**.
4. **Clientes** — lista/busca; modais **Novo/Editar** (Nome*, CPF/CNPJ, Telefone*, Email, Endereço,
   Cidade, UF, CEP — superset com apelido/RG/IE/bairro/número para alimentar a impressão); Excluir.
5. **Veículos** — lista/busca; modais **Novo/Editar** (Placa*, Ano Fab./Modelo, Marca*, Modelo*, Versão,
   Cor, Chassi, Renavam, Combustível, KM Atual, **Proprietário\*** = cliente); Excluir.
6. **Produtos e Serviços** — grade/busca/filtro; modais **Novo/Editar** (Nome*, Descrição, **Tipo**
   Produto/Serviço, Unidade, **Preço\***, **Item Ativo**); Excluir.
7. **Dados da Empresa** — Identificação (Razão Social*, Nome Fantasia, CNPJ, IE), Contato (Telefone,
   WhatsApp, Email, Site), Endereço (Endereço, Bairro, Cidade, UF, CEP), **Logo** (upload/trocar),
   **Termos padrão**. **Pré-preenchido com a ALVES** (dados + logo simplificada).

---

## 5. Impressão (fiel à planilha)

Template HTML A4 retrato preenchido por Jinja2, aberto em janela de impressão; `window.print()`.
Seções, de cima para baixo (reproduzindo `Documento_Chapeacao_Pintura.xlsx`):
cabeçalho com **logo ALVES centralizado** + dados da empresa (CNPJ/IE, endereço, **telefones ao final**) +
Nº/Data/Status · **Tipo** · Dados do Cliente · Dados do Veículo (com **KM**) ·
**Checklist de Entrada preenchido** (lataria OK/Avaria, estado geral, itens entregues, nível de combustível,
obs.) · tabela de **Serviços/Produtos** (Nº · Descrição · Qtd · Vlr Bruto · Desconto · Vlr Líquido) ·
**Resumo Financeiro** (Serviços, Desconto geral, Acréscimo, **Total**) · **Condições Comerciais** ·
**Assinaturas** (Cliente / Responsável) · rodapé "Documento gerado em DD/MM/AAAA às HH:MM". CSS `@page A4`,
margens reduzidas, meta de **1 página**.

---

## 6. Empacotamento, deploy e backup

- Build: `pip install pywebview pyinstaller jinja2 pillow` → `pyinstaller --onefile --windowed
  --add-data "web;web" --add-data "templates;templates" --icon ... main.py`.
- 1º uso: cria `%APPDATA%\AlvesOS\`, gera `alvesos.db`, popula **empresa ALVES + logo** e catálogo/listas
  de exemplo.
- **Backup:** botão "Fazer backup" → copia `alvesos.db` para `...\AlvesOS\backups\alvesos-AAAAMMDD-HHMM.db`
  (ou pasta escolhida). **Restaurar** opcional (substitui o banco após confirmação).
- WebView2 já presente neste PC; em outro PC Windows pode exigir instalar o WebView2 Runtime (Win11 já tem).

---

## 7. Tratamento de erros e UX

- Validação de campos obrigatórios com mensagens em **PT-BR**; confirmações antes de excluir/converter/restaurar.
- Erros de banco capturados → diálogo amigável; banco criado/migrado automaticamente na inicialização
  (checa `schema_version`).
- Impressão sempre possível via "Microsoft Print to PDF" mesmo sem impressora física.
- Operações destrutivas pedem confirmação. **Bloquear** a exclusão de cliente/veículo que tenha documentos
  vinculados (exibindo mensagem clara); excluir um documento individual é permitido (com confirmação).

---

## 8. Estratégia de testes

- **Automatizados (pytest, SQLite em memória):** numeração por tipo/ano; cálculo de linha e totais;
  conversão orçamento→OS; CRUD de clientes/veículos/itens; KPIs do dashboard.
- **Manual (checklist):** cadastrar cliente/veículo/item → criar Orçamento e OS → preencher checklist →
  **imprimir em PDF e conferir o A4 (1 página, layout da planilha)** → converter orçamento→OS →
  backup/restaurar → busca/filtro → KPIs. Verificar o **.exe** rodando por duplo-clique.

---

## 9. Estrutura do projeto (proposta)

```
app-os/
  main.py              # entrada: inicializa DB, abre janela pywebview, registra js_api
  api.py               # API exposta ao JS (CRUD, totais, numeração, converter, imprimir, backup)
  db.py                # conexão sqlite, schema, migrações, seed (ALVES + exemplos)
  repositories.py      # acesso a dados por entidade
  services.py          # regras (numeração, cálculo de totais, conversão)
  printing.py          # monta o HTML A4 (Jinja2) a partir de um documento
  web/                 # UI (index.html, app.js, styles.css, assets/logo.png)
  templates/print.html # template A4 de impressão
  assets/              # logo ALVES, ícone do app
  tests/               # pytest
  build.ps1            # script de empacotamento (PyInstaller)
```

---

## 10. Melhorias futuras (não nesta versão)
Relatórios/exportação (CSV/PDF de períodos), backup automático agendado, busca de placa/CPF, multiusuário em
rede, conversão de status com histórico/auditoria, anexos de fotos do veículo na entrada.
