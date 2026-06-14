"""Conexão SQLite, schema, migração por versão e seed (empresa ALVES + catálogo)."""
import sqlite3
from datetime import datetime
from pathlib import Path

from . import paths

SCHEMA_VERSION = 5

# Ordem fixa das peças da lataria (checklist de entrada)
LISTA_PECAS = [
    "Capô", "Teto", "Porta Diant. Esq.", "Porta Tras. Esq.", "Porta Diant. Dir.",
    "Porta Tras. Dir.", "Para-lama Diant. Esq.", "Para-lama Diant. Dir.",
    "Tampa Traseira", "Para-choque Diant.", "Para-choque Tras.",
]

NIVEIS_COMBUSTIVEL = ["Reserva", "1/4", "1/2", "3/4", "Cheio"]

# Status simplificados e diferentes por tipo
STATUS_ORCAMENTO = ["Aberto", "Aprovado", "Recusado", "Cancelado"]
STATUS_OS = ["Aberta", "Em Execução", "Concluída", "Entregue", "Cancelada"]
# Status da OS exibidos no donut "Pipeline de OS" (apenas o fluxo ativo)
KANBAN_OS_STATUS = ["Aberta", "Em Execução", "Concluída"]
# Colunas do quadro kanban (além de "Orçamentos"): inclui "Cancelada"
KANBAN_COLUNAS = ["Aberta", "Em Execução", "Concluída", "Cancelada"]
PRIORIDADES = ["Normal", "Alta", "Urgente"]
UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB",
       "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]

# Sugestões iniciais (autocomplete que cresce com o que o usuário cadastra)
SUG_MARCAS = ["Chevrolet", "Volkswagen", "Fiat", "Ford", "Toyota", "Honda", "Hyundai", "Renault",
              "Nissan", "Jeep", "Peugeot", "Citroën", "Mitsubishi", "Kia", "BMW", "Mercedes-Benz",
              "RAM", "Iveco", "Agrale", "Volvo"]
SUG_CORES = ["Branco", "Preto", "Prata", "Cinza", "Vermelho", "Azul", "Verde", "Amarelo",
             "Marrom", "Bege", "Dourado", "Vinho", "Grafite", "Laranja"]
SUG_COMBUSTIVEIS = ["Gasolina", "Etanol", "Flex", "Diesel", "GNV", "Híbrido", "Elétrico"]
SUG_CIDADES = ["Luís Eduardo Magalhães", "Barreiras", "São Desidério", "Riachão das Neves",
               "Catolândia", "Baianópolis", "Angical", "Salvador"]
STATUS_LISTA = STATUS_ORCAMENTO + STATUS_OS  # união (para filtros)
ESTADO_GERAL_LISTA = ["Sem avarias aparentes", "Com avarias registradas"]
FORMAS_PAGAMENTO = ["Dinheiro", "PIX", "Cartão de Débito", "Cartão de Crédito",
                    "Transferência/TED", "Boleto", "Cheque", "Parcelado"]

DDL = """
CREATE TABLE IF NOT EXISTS meta (schema_version INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS empresa (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  razao_social TEXT, nome_fantasia TEXT, cnpj TEXT, ie TEXT,
  endereco TEXT, bairro TEXT, cidade TEXT, uf TEXT, cep TEXT,
  telefone TEXT, whatsapp TEXT, email TEXT, site TEXT, slogan TEXT,
  logo BLOB, termos_padrao TEXT, termo_garantia TEXT,
  setup_concluido INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS contadores (
  tipo TEXT NOT NULL, ano INTEGER NOT NULL, ultimo INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tipo, ano)
);

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_interno TEXT, nome TEXT NOT NULL, apelido TEXT, cpf_cnpj TEXT, rg_ie TEXT,
  telefone TEXT, whatsapp TEXT, email TEXT, endereco TEXT, numero TEXT, bairro TEXT,
  cidade TEXT, uf TEXT, cep TEXT, criado_em TEXT, atualizado_em TEXT
);

CREATE TABLE IF NOT EXISTS veiculos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  placa TEXT NOT NULL UNIQUE, cliente_id INTEGER REFERENCES clientes(id),
  marca TEXT, modelo TEXT, versao TEXT, ano_fab TEXT, ano_modelo TEXT, cor TEXT,
  chassi TEXT, renavam TEXT, combustivel TEXT, km_atual TEXT, criado_em TEXT, atualizado_em TEXT
);

CREATE TABLE IF NOT EXISTS itens_catalogo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL, descricao TEXT, tipo TEXT NOT NULL DEFAULT 'servico',
  unidade TEXT DEFAULT 'Unidade', preco REAL NOT NULL DEFAULT 0, ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT
);

CREATE TABLE IF NOT EXISTS documentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT NOT NULL UNIQUE, tipo TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Aberta',
  prioridade TEXT DEFAULT 'Normal',
  data_abertura TEXT, criado_em TEXT, atualizado_em TEXT,
  cliente_id INTEGER REFERENCES clientes(id), veiculo_id INTEGER REFERENCES veiculos(id),
  km_entrada TEXT,
  subtotal REAL DEFAULT 0, desconto_geral REAL DEFAULT 0, acrescimo REAL DEFAULT 0, total REAL DEFAULT 0,
  forma_pagamento TEXT, prazo_execucao TEXT, validade TEXT, observacoes TEXT,
  estado_geral TEXT, nivel_combustivel TEXT, obs_entrada TEXT,
  item_chave_principal INTEGER DEFAULT 0, item_chave_reserva INTEGER DEFAULT 0,
  item_documento INTEGER DEFAULT 0, item_manual INTEGER DEFAULT 0,
  origem_orcamento_id INTEGER REFERENCES documentos(id),
  usuario_id INTEGER
);

CREATE TABLE IF NOT EXISTS documento_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  documento_id INTEGER NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  item_catalogo_id INTEGER REFERENCES itens_catalogo(id),
  descricao TEXT, tipo TEXT, quantidade REAL DEFAULT 1, valor_unitario REAL DEFAULT 0,
  desconto REAL DEFAULT 0, valor_liquido REAL DEFAULT 0, ordem INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS documento_lataria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  documento_id INTEGER NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  peca TEXT NOT NULL, estado TEXT DEFAULT '', ordem INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cidades_custom (
  nome TEXT NOT NULL, uf TEXT NOT NULL, UNIQUE(nome, uf)
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login TEXT NOT NULL UNIQUE, nome TEXT, senha_hash TEXT, salt TEXT,
  ativo INTEGER NOT NULL DEFAULT 1, criado_em TEXT,
  avatar BLOB, must_change INTEGER NOT NULL DEFAULT 0
);
-- unicidade de login case-insensitive (reforça a regra "login sempre MAIÚSCULO/único")
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_login_nocase ON usuarios(login COLLATE NOCASE);
"""

CATALOGO_EXEMPLO = [
    ("Alinhamento e Balanceamento", "Alinhamento e balanceamento completo", "servico", "Unidade", 120),
    ("Revisão Completa", "Revisão completa do veículo", "servico", "Unidade", 350),
    ("Filtro de Ar", "Filtro de ar original", "produto", "Unidade", 45),
    ("Pneu 175/70 R14", "Pneu aro 14 novo", "produto", "Unidade", 290),
    ("Troca de Óleo", "Troca de óleo do motor", "servico", "Unidade", 150),
    ("Pastilha de Freio", "Jogo de pastilhas de freio dianteira", "produto", "Unidade", 180),
]


def connect(path=None) -> sqlite3.Connection:
    """Abre a conexão, garante schema e seed. Retorna conexão com row_factory=Row."""
    target = Path(path) if path is not None else paths.db_path()
    # check_same_thread=False: o pywebview chama a API em thread diferente da criação
    con = sqlite3.connect(str(target), check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    _migrate(con)
    return con


def _add_column(con, table, col, decl):
    existentes = [r[1] for r in con.execute(f"PRAGMA table_info({table})")]
    if col not in existentes:
        con.execute(f"ALTER TABLE {table} ADD COLUMN {col} {decl}")


def _migrate(con: sqlite3.Connection) -> None:
    con.executescript(DDL)  # cria tabelas ausentes (banco novo já vem com prioridade)
    row = con.execute("SELECT schema_version FROM meta LIMIT 1").fetchone()
    if row is None:
        con.execute("INSERT INTO meta(schema_version) VALUES (?)", (SCHEMA_VERSION,))
        ver = SCHEMA_VERSION
    else:
        ver = row[0]
    # migrações incrementais para bancos existentes
    if ver < 2:
        _add_column(con, "documentos", "prioridade", "TEXT DEFAULT 'Normal'")
        con.execute("UPDATE meta SET schema_version = 2")
    if ver < 3:
        _add_column(con, "documentos", "usuario_id", "INTEGER")
        con.execute("UPDATE meta SET schema_version = 3")
    if ver < 4:
        _add_column(con, "usuarios", "avatar", "BLOB")
        _add_column(con, "usuarios", "must_change", "INTEGER NOT NULL DEFAULT 0")
        con.execute("UPDATE meta SET schema_version = 4")
    if ver < 5:
        _add_column(con, "empresa", "termo_garantia", "TEXT")
        _add_column(con, "empresa", "setup_concluido", "INTEGER NOT NULL DEFAULT 0")
        con.execute("UPDATE empresa SET setup_concluido = 1")  # instalações existentes não veem o wizard
        con.execute("UPDATE meta SET schema_version = 5")
    if con.execute("SELECT COUNT(*) FROM empresa").fetchone()[0] == 0:
        _seed(con)
    _seed_usuarios(con)
    con.commit()


def _seed_usuarios(con: sqlite3.Connection) -> None:
    """Cria o usuário padrão SUPORTE (senha 1234567890) se a tabela estiver vazia."""
    if con.execute("SELECT COUNT(*) FROM usuarios").fetchone()[0] > 0:
        return
    from . import services
    salt, senha_hash = services.hash_senha("1234567890")
    con.execute(
        "INSERT INTO usuarios(login, nome, senha_hash, salt, ativo, criado_em) VALUES (?,?,?,?,1,?)",
        ("SUPORTE", "Suporte", senha_hash, salt, datetime.now().isoformat(timespec="seconds")),
    )


def _seed(con: sqlite3.Connection) -> None:
    # O app é agnóstico/anêmico quanto à empresa: cria apenas a linha vazia (id=1) — sem dados de
    # exemplo. O lojista preenche os próprios dados no assistente de primeira execução.
    con.execute("INSERT INTO empresa(id, setup_concluido) VALUES (1, 0)")
    con.executemany(
        "INSERT INTO itens_catalogo(nome, descricao, tipo, unidade, preco, ativo) VALUES (?,?,?,?,?,1)",
        CATALOGO_EXEMPLO,
    )
