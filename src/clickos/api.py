"""API exposta ao JavaScript (ponte pywebview). Cada método retorna {ok, data|erro}."""
import functools
import shutil
from datetime import datetime
from pathlib import Path

import webview

from . import audit
from . import db as dbmod
from . import paths
from . import printing
from . import repositories as repo
from . import services


def _doc_label(doc) -> str:
    """Rótulo amigável do documento para mensagens de auditoria."""
    if not doc:
        return "Documento"
    return "O.S." if doc.get("tipo") == "os" else "Orçamento"


def _stamp() -> str:
    return datetime.now().isoformat(timespec="seconds")


_CIDADES = None  # cache da base IBGE [[cidade, uf], ...]


def _api(fn):
    @functools.wraps(fn)
    def wrapper(self, *args, **kwargs):
        try:
            return {"ok": True, "data": fn(self, *args, **kwargs)}
        except services.EmVinculo as e:
            return {"ok": False, "erro": str(e)}
        except Exception as e:  # erro amigável para a UI
            return {"ok": False, "erro": str(e)}
    return wrapper


class Api:
    def __init__(self, con):
        self.con = con
        self.usuario = None  # sessão server-side do usuário autenticado: {id, login, is_suporte}

    def _sessao(self):
        if not self.usuario:
            raise ValueError("Sessão expirada. Faça login novamente.")
        return self.usuario

    def _audit(self, acao, entidade=None, entidade_id=None, descricao="", detalhes=None, usuario=None):
        """Registra um evento de auditoria sem nunca quebrar a ação principal (já efetivada)."""
        try:
            audit.registrar(self.con, usuario if usuario is not None else self.usuario,
                            acao, entidade, entidade_id, descricao, detalhes)
        except Exception:
            pass

    def _win(self):
        # IMPORTANTE: não armazenar a janela como atributo de Api. O pywebview
        # percorre os atributos do objeto exposto para gerar a API JS e quebra
        # ao recursar na janela (objetos .NET). Buscamos a janela sob demanda.
        wins = webview.windows
        if wins:
            return wins[0]
        raise RuntimeError("Janela indisponível para abrir o diálogo.")

    # ----------------------------------------------------------------- bootstrap / dashboard
    @_api
    def sugestoes(self):
        return repo.sugestoes(self.con)

    @_api
    def cidades(self):
        """Base IBGE (todas as cidades do Brasil + UF) somada às cidades cadastradas pelo usuário."""
        global _CIDADES
        if _CIDADES is None:
            import json
            try:
                _CIDADES = json.loads(Path(paths.asset("assets", "cidades.json")).read_text(encoding="utf-8"))
            except Exception:
                _CIDADES = []
        custom = [[r[0], r[1]] for r in self.con.execute("SELECT nome, uf FROM cidades_custom ORDER BY nome")]
        return _CIDADES + custom

    @_api
    def add_cidade(self, payload):
        """Cadastra uma cidade nova; UF deve ser uma das existentes (nunca um novo estado)."""
        nome = (payload.get("nome") or "").strip()
        uf = (payload.get("uf") or "").strip().upper()
        if not nome:
            raise ValueError("Informe o nome da cidade.")
        if uf not in dbmod.UFS:
            raise ValueError("UF inválida.")
        self.con.execute("INSERT OR IGNORE INTO cidades_custom(nome, uf) VALUES (?, ?)", (nome, uf))
        self.con.commit()
        self._audit("criar", "parametro", None, f"Cidade cadastrada: {nome}/{uf}", {"nome": nome, "uf": uf})
        return {"nome": nome, "uf": uf}

    @_api
    def add_valor(self, payload):
        """Cadastra uma marca/cor/combustível personalizado (autocomplete persistente)."""
        tipo = (payload.get("tipo") or "").strip().lower()
        valor = (payload.get("valor") or "").strip()
        if tipo not in ("marca", "cor", "combustivel"):
            raise ValueError("Tipo inválido.")
        if not valor:
            raise ValueError("Informe o valor.")
        self.con.execute("INSERT OR IGNORE INTO valores_custom(tipo, valor) VALUES (?, ?)", (tipo, valor))
        self.con.commit()
        self._audit("criar", "parametro", None, f"{tipo.capitalize()} cadastrada: {valor}",
                    {"tipo": tipo, "valor": valor})
        return {"tipo": tipo, "valor": valor}

    @_api
    def bootstrap(self):
        return {
            "empresa": self._empresa_sem_logo(),
            "status_lista": dbmod.STATUS_LISTA,
            "status_orcamento": dbmod.STATUS_ORCAMENTO,
            "status_os": dbmod.STATUS_OS,
            "kanban_os_status": dbmod.KANBAN_OS_STATUS,
            "kanban_colunas": dbmod.KANBAN_COLUNAS,
            "prioridades": dbmod.PRIORIDADES,
            "ufs": dbmod.UFS,
            "formas_pagamento": dbmod.FORMAS_PAGAMENTO,
            "niveis_combustivel": dbmod.NIVEIS_COMBUSTIVEL,
            "estado_geral": dbmod.ESTADO_GERAL_LISTA,
            "pecas": dbmod.LISTA_PECAS,
            "preferencias": repo.get_preferencias(self.con),
            "unidades_tempo": list(services.UNIDADES_SEG.keys()),
            "audit_acoes": ["criar", "editar", "excluir", "status", "parametro",
                            "login", "logout", "login_falha", "backup", "restaurar"],
        }

    @_api
    def get_preferencias(self):
        return repo.get_preferencias(self.con)

    @_api
    def save_preferencias(self, payload):
        antes = repo.get_preferencias(self.con)
        saved = repo.save_preferencias(self.con, payload or {})
        mudou = audit.diff(antes, saved)
        if mudou:
            self._audit("parametro", "preferencias", None, "Preferências do sistema alteradas", {"diff": mudou})
        return saved

    # ----------------------------------------------------------------- auditoria (somente leitura)
    @_api
    def list_auditoria(self, filtro=None):
        self._sessao()  # exige usuário autenticado
        f = filtro or {}
        return {
            "registros": repo.auditoria.list(
                self.con, data_ini=f.get("data_ini") or None, data_fim=f.get("data_fim") or None,
                usuario=f.get("usuario") or None, acao=f.get("acao") or None,
                q=f.get("q") or None, limit=f.get("limit") or 500),
            "usuarios": repo.auditoria.usuarios(self.con),
            "total": repo.auditoria.total(self.con),
        }

    @_api
    def dashboard(self):
        con = self.con
        one = lambda q, a=(): con.execute(q, a).fetchone()[0]
        agora = datetime.now()
        mes = agora.strftime("%Y-%m")
        total = one("SELECT COUNT(*) FROM documentos")
        orcamentos = one("SELECT COUNT(*) FROM documentos WHERE tipo='orcamento'")
        os_count = one("SELECT COUNT(*) FROM documentos WHERE tipo='os'")
        abertas = one("SELECT COUNT(*) FROM documentos WHERE tipo='os' AND status='Aberta'")
        orc_abertos = one("SELECT COUNT(*) FROM documentos WHERE tipo='orcamento' AND status='Aberto'")
        clientes = one("SELECT COUNT(*) FROM clientes")
        veiculos = one("SELECT COUNT(*) FROM veiculos")
        # Faturamento = somente O.S. FATURADAS (status 'Faturada'), pela DATA DE FATURAMENTO
        # (faturado_em; cai para a data de abertura quando vazio). Eixo temporal = faturado_em.
        DATA_FAT = "substr(COALESCE(NULLIF(faturado_em,''), data_abertura),1,7)"
        FATURADAS = "tipo='os' AND status='Faturada'"
        fat_mes = one(f"SELECT COALESCE(SUM(total),0) FROM documentos WHERE {FATURADAS} AND {DATA_FAT}=?", (mes,))
        fat_total = one(f"SELECT COALESCE(SUM(total),0) FROM documentos WHERE {FATURADAS}")
        ticket = one(f"SELECT COALESCE(AVG(total),0) FROM documentos WHERE {FATURADAS} AND total>0")
        # pipeline de OS
        pipe = {s: 0 for s in dbmod.KANBAN_OS_STATUS}
        for r in con.execute("SELECT status, COUNT(*) FROM documentos WHERE tipo='os' GROUP BY status"):
            if r[0] in pipe:
                pipe[r[0]] = r[1]
        # faturamento dos últimos 6 meses (faturadas, por mês de faturamento)
        raw = {r[0]: r[1] for r in con.execute(
            f"SELECT {DATA_FAT} m, COALESCE(SUM(total),0) FROM documentos WHERE {FATURADAS} GROUP BY m")}
        mes_pt = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
        meses = []
        for i in range(5, -1, -1):
            y, mo = agora.year, agora.month - i
            while mo <= 0:
                mo += 12
                y -= 1
            meses.append({"label": mes_pt[mo - 1], "valor": round(raw.get(f"{y:04d}-{mo:02d}", 0) or 0, 2)})
        return {"total": total, "orcamentos": orcamentos, "os_count": os_count, "abertas": abertas,
                "orcamentos_abertos": orc_abertos, "clientes": clientes, "veiculos": veiculos,
                "faturamento_mes": fat_mes, "faturamento_total": fat_total, "ticket_medio": ticket,
                "pipeline": pipe, "fat_meses": meses, "recentes": repo.documentos.list(con)[:6]}

    # ----------------------------------------------------------------- documentos
    @_api
    def list_documentos(self, filtro=None):
        filtro = filtro or {}
        return repo.documentos.list(self.con, tipo=filtro.get("tipo") or None,
                                    status=filtro.get("status") or None, q=filtro.get("q") or None,
                                    data_ini=filtro.get("data_ini") or None,
                                    data_fim=filtro.get("data_fim") or None)

    @_api
    def get_documento(self, did):
        return repo.documentos.get(self.con, did)

    @_api
    def save_documento(self, payload):
        if payload.get("id"):
            antes = repo.documentos.get(self.con, payload["id"])
            saved = repo.documentos.update(self.con, payload["id"], payload, stamp=_stamp())
            self._audit("editar", "documento", saved["id"],
                        f"{_doc_label(saved)} {saved['numero']} editado",
                        {"diff": audit.diff(antes, saved)})
            return saved
        saved = repo.documentos.create(self.con, payload, stamp=_stamp())
        self._audit("criar", "documento", saved["id"],
                    f"{_doc_label(saved)} {saved['numero']} criado", {"snapshot": audit.snapshot(saved)})
        return saved

    @_api
    def delete_documento(self, did):
        antes = repo.documentos.get(self.con, did)
        repo.documentos.delete(self.con, did)
        self._audit("excluir", "documento", did,
                    f"{_doc_label(antes)} {(antes or {}).get('numero', did)} excluído",
                    {"snapshot": audit.snapshot(antes)})
        return True

    @_api
    def set_status(self, payload):
        antes = repo.documentos.get(self.con, payload["id"])
        repo.documentos.set_status(self.con, payload["id"], payload["status"], stamp=_stamp())
        self._audit("status", "documento", payload["id"],
                    f"{_doc_label(antes)} {(antes or {}).get('numero', payload['id'])}: status "
                    f"{(antes or {}).get('status', '?')} → {payload['status']}",
                    {"de": (antes or {}).get("status"), "para": payload["status"]})
        return True

    @_api
    def converter_os(self, did):
        orc = repo.documentos.get(self.con, did)  # estado do orçamento antes da conversão
        nova = services.convert_to_os(self.con, did, stamp=_stamp())
        self._audit("criar", "documento", nova["id"],
                    f"O.S. {nova['numero']} criada a partir de orçamento",
                    {"origem_orcamento_id": did, "snapshot": audit.snapshot(nova)})
        # convert_to_os marca o orçamento de origem como Aprovado: audita também essa mudança
        self._audit("status", "documento", did,
                    f"{_doc_label(orc)} {(orc or {}).get('numero', did)}: status "
                    f"{(orc or {}).get('status', '?')} → Aprovado",
                    {"de": (orc or {}).get("status"), "para": "Aprovado"})
        return nova

    def _render(self, did, renderer):
        doc = repo.documentos.get(self.con, did)
        if not doc:
            raise ValueError("Documento não encontrado.")
        cliente = repo.clientes.get(self.con, doc["cliente_id"]) if doc.get("cliente_id") else {}
        veiculo = repo.veiculos.get(self.con, doc["veiculo_id"]) if doc.get("veiculo_id") else {}
        empresa = dict(self.con.execute("SELECT * FROM empresa WHERE id=1").fetchone())
        html = renderer(doc, empresa, cliente, veiculo, gerado_em=datetime.now().strftime("%d/%m/%Y às %H:%M"))
        return doc, html

    @_api
    def print_documento(self, did):
        doc, html = self._render(did, printing.render_documento)
        return {"html": html, "numero": doc["numero"]}

    @_api
    def print_recebimento(self, did):
        doc, html = self._render(did, printing.render_recebimento)
        return {"html": html, "numero": doc["numero"]}

    # ----------------------------------------------------------------- clientes
    @_api
    def list_clientes(self, q=None):
        return repo.clientes.search(self.con, q) if q else repo.clientes.list(self.con)

    @_api
    def save_cliente(self, payload):
        if payload.get("id"):
            antes = repo.clientes.get(self.con, payload["id"])
            saved = repo.clientes.update(self.con, payload["id"], payload, stamp=_stamp())
            self._audit("editar", "cliente", saved["id"], f"Pessoa {saved.get('nome', '')} editada",
                        {"diff": audit.diff(antes, saved)})
            return saved
        saved = repo.clientes.create(self.con, payload, stamp=_stamp())
        self._audit("criar", "cliente", saved["id"], f"Pessoa {saved.get('nome', '')} cadastrada",
                    {"snapshot": audit.snapshot(saved)})
        return saved

    @_api
    def delete_cliente(self, cid):
        antes = repo.clientes.get(self.con, cid)
        repo.clientes.delete(self.con, cid)
        self._audit("excluir", "cliente", cid, f"Pessoa {(antes or {}).get('nome', cid)} excluída",
                    {"snapshot": audit.snapshot(antes)})
        return True

    # ----------------------------------------------------------------- veiculos
    @_api
    def list_veiculos(self, q=None):
        return repo.veiculos.search(self.con, q) if q else repo.veiculos.list(self.con)

    @_api
    def veiculos_cliente(self, cid):
        return repo.veiculos.by_cliente(self.con, cid)

    @_api
    def save_veiculo(self, payload):
        if payload.get("id"):
            antes = repo.veiculos.get(self.con, payload["id"])
            saved = repo.veiculos.update(self.con, payload["id"], payload, stamp=_stamp())
            self._audit("editar", "veiculo", saved["id"], f"Veículo {saved.get('placa', '')} editado",
                        {"diff": audit.diff(antes, saved)})
            return saved
        saved = repo.veiculos.create(self.con, payload, stamp=_stamp())
        self._audit("criar", "veiculo", saved["id"], f"Veículo {saved.get('placa', '')} cadastrado",
                    {"snapshot": audit.snapshot(saved)})
        return saved

    @_api
    def delete_veiculo(self, vid):
        antes = repo.veiculos.get(self.con, vid)
        repo.veiculos.delete(self.con, vid)
        self._audit("excluir", "veiculo", vid, f"Veículo {(antes or {}).get('placa', vid)} excluído",
                    {"snapshot": audit.snapshot(antes)})
        return True

    # ----------------------------------------------------------------- itens catálogo
    @_api
    def list_itens(self, q=None):
        return repo.itens.search(self.con, q) if q else repo.itens.list(self.con)

    @_api
    def save_item(self, payload):
        if payload.get("id"):
            antes = repo.itens.get(self.con, payload["id"])
            saved = repo.itens.update(self.con, payload["id"], payload)
            self._audit("editar", "item", saved["id"], f"Produto/Serviço {saved.get('nome', '')} editado",
                        {"diff": audit.diff(antes, saved)})
            return saved
        saved = repo.itens.create(self.con, payload, stamp=_stamp())
        self._audit("criar", "item", saved["id"], f"Produto/Serviço {saved.get('nome', '')} cadastrado",
                    {"snapshot": audit.snapshot(saved)})
        return saved

    @_api
    def delete_item(self, iid):
        antes = repo.itens.get(self.con, iid)
        repo.itens.delete(self.con, iid)
        self._audit("excluir", "item", iid, f"Produto/Serviço {(antes or {}).get('nome', iid)} excluído",
                    {"snapshot": audit.snapshot(antes)})
        return True

    # ----------------------------------------------------------------- empresa
    def _empresa_sem_logo(self):
        row = dict(self.con.execute("SELECT * FROM empresa WHERE id=1").fetchone())
        row["has_logo"] = bool(row.pop("logo", None))
        return row

    @_api
    def get_empresa(self):
        return self._empresa_sem_logo()

    @_api
    def get_logo_uri(self):
        import base64
        row = self.con.execute("SELECT logo FROM empresa WHERE id=1").fetchone()
        logo = row[0] if row else None
        if not logo:
            return {"uri": ""}
        return {"uri": "data:image/png;base64," + base64.b64encode(logo).decode("ascii")}

    @_api
    def save_empresa(self, payload):
        if len(payload.get("termo_garantia") or "") > 15000:
            raise ValueError("O termo de garantia excede o limite de 15.000 caracteres.")
        campos = ["razao_social", "nome_fantasia", "cnpj", "ie", "endereco", "bairro", "cidade",
                  "uf", "cep", "telefone", "whatsapp", "email", "site", "slogan", "termos_padrao",
                  "termo_garantia"]
        antes = self._empresa_sem_logo()
        sets = ",".join(f"{c}=?" for c in campos)
        self.con.execute(f"UPDATE empresa SET {sets} WHERE id=1", [payload.get(c) for c in campos])
        self.con.commit()
        depois = self._empresa_sem_logo()
        mudou = audit.diff(antes, depois)
        if mudou:
            self._audit("editar", "empresa", 1, "Dados da empresa atualizados", {"diff": mudou})
        return depois

    @_api
    def remover_logo(self):
        self.con.execute("UPDATE empresa SET logo=NULL WHERE id=1")
        self.con.commit()
        self._audit("editar", "empresa", 1, "Logotipo da empresa removido")
        return {"has_logo": False}

    @_api
    def concluir_setup(self):
        """Marca o assistente de primeira execução como concluído."""
        self.con.execute("UPDATE empresa SET setup_concluido=1 WHERE id=1")
        self.con.commit()
        self._audit("parametro", "empresa", 1, "Configuração inicial concluída")
        return True

    @_api
    def escolher_logo(self):
        """Abre o diálogo nativo para escolher a imagem do logo e a salva no banco (BLOB)."""
        res = self._win().create_file_dialog(
            webview.OPEN_DIALOG, allow_multiple=False,
            file_types=("Imagens (*.png;*.jpg;*.jpeg;*.bmp)", "Todos os arquivos (*.*)"))
        if not res:
            return {"cancelado": True}
        path = res[0] if isinstance(res, (list, tuple)) else res
        self.con.execute("UPDATE empresa SET logo=? WHERE id=1", (Path(path).read_bytes(),))
        self.con.commit()
        self._audit("editar", "empresa", 1, "Logotipo da empresa atualizado")
        return {"has_logo": True}

    # ----------------------------------------------------------------- usuários / login
    @_api
    def login(self, payload):
        tentado = ((payload or {}).get("login") or "").strip().upper()
        user = repo.usuarios.autenticar(self.con, (payload or {}).get("login"), (payload or {}).get("senha"))
        if not user:
            self._audit("login_falha", "usuario", None, f"Tentativa de login malsucedida: {tentado or '(vazio)'}",
                        usuario={"id": None, "login": tentado or None})
            raise ValueError("Login ou senha inválidos.")
        # guarda a identidade no servidor (não confiar no cliente para autorização)
        self.usuario = {"id": user["id"], "login": user["login"], "is_suporte": user["is_suporte"]}
        self._audit("login", "usuario", user["id"], f"Login de {user['login']}")
        return user

    @_api
    def logout(self):
        if self.usuario:
            self._audit("logout", "usuario", self.usuario.get("id"), f"Logout de {self.usuario.get('login')}")
        self.usuario = None
        return True

    @_api
    def list_usuarios(self):
        self._sessao()
        return repo.usuarios.list(self.con)

    @_api
    def save_usuario(self, payload):
        sess = self._sessao()
        if payload.get("id"):
            alvo = repo.usuarios.get(self.con, payload["id"])
            if alvo and alvo.get("is_suporte") and not sess.get("is_suporte"):
                raise ValueError("Apenas o SUPORTE pode editar a conta SUPORTE.")
            saved = repo.usuarios.update(self.con, payload["id"], payload, stamp=_stamp())
            det = {"diff": audit.diff(alvo, saved)}
            if (payload.get("senha") or "").strip():
                det["senha_alterada"] = True
            self._audit("editar", "usuario", saved["id"], f"Usuário {saved.get('login', '')} editado", det)
            return saved
        saved = repo.usuarios.create(self.con, payload, stamp=_stamp())
        self._audit("criar", "usuario", saved["id"], f"Usuário {saved.get('login', '')} criado",
                    {"snapshot": audit.snapshot(saved)})
        return saved

    @_api
    def delete_usuario(self, uid):
        self._sessao()
        alvo = repo.usuarios.get(self.con, uid)
        repo.usuarios.delete(self.con, uid)
        self._audit("excluir", "usuario", uid, f"Usuário {(alvo or {}).get('login', uid)} excluído",
                    {"snapshot": audit.snapshot(alvo)})
        return True

    @_api
    def reset_senha(self, payload):
        """Redefine a senha de outro usuário para a padrão. A identidade do solicitante vem da
        SESSÃO (não do cliente); valida-se a senha do solicitante e protege-se a conta SUPORTE."""
        sess = self._sessao()
        alvo_id = payload.get("alvo_id")
        if alvo_id == sess["id"]:
            raise ValueError("Para trocar a sua própria senha, edite o seu usuário.")
        alvo = repo.usuarios.get(self.con, alvo_id)
        if not alvo:
            raise ValueError("Usuário não encontrado.")
        if alvo.get("is_suporte") and not sess.get("is_suporte"):
            raise ValueError("Apenas o SUPORTE pode redefinir a senha do SUPORTE.")
        res = repo.usuarios.reset_senha(self.con, alvo_id, sess["id"], payload.get("senha") or "")
        self._audit("parametro", "usuario", alvo_id, f"Senha redefinida para o usuário {alvo.get('login', '')}")
        return res

    @_api
    def definir_senha(self, payload):
        """Troca obrigatória de senha: só o próprio usuário da sessão, e só quando marcado
        para troca (must_change). Impede uso fora do fluxo de 1º login pós-redefinição."""
        sess = self._sessao()
        if payload.get("id") != sess["id"]:
            raise ValueError("Operação não permitida.")
        atual = repo.usuarios.by_login(self.con, sess["login"])
        if not atual or not atual["must_change"]:
            raise ValueError("Troca de senha não solicitada.")
        saved = repo.usuarios.definir_senha(self.con, sess["id"], payload.get("nova_senha") or "")
        self._audit("parametro", "usuario", sess["id"], f"Senha alterada pelo usuário {sess.get('login', '')}")
        return saved

    @_api
    def pick_image(self):
        """Diálogo nativo para escolher uma imagem; devolve base64 + data URI (não grava nada)."""
        import base64
        res = self._win().create_file_dialog(
            webview.OPEN_DIALOG, allow_multiple=False,
            file_types=("Imagens (*.png;*.jpg;*.jpeg;*.bmp;*.gif;*.webp)", "Todos os arquivos (*.*)"))
        if not res:
            return {"cancelado": True}
        path = res[0] if isinstance(res, (list, tuple)) else res
        raw = Path(path).read_bytes()
        return {"b64": base64.b64encode(raw).decode("ascii"), "uri": services.image_data_uri(raw)}

    # ----------------------------------------------------------------- backup / restore
    @_api
    def backup(self):
        """Pergunta onde salvar (diálogo nativo) e copia o banco para lá."""
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        res = self._win().create_file_dialog(
            webview.SAVE_DIALOG, save_filename=f"clickos-backup-{stamp}.db",
            file_types=("Banco ClickOS (*.db)", "Todos os arquivos (*.*)"))
        if not res:
            return {"cancelado": True}
        dest = res if isinstance(res, str) else res[0]
        self.con.commit()
        shutil.copy2(str(dbmod.paths.db_path()), dest)
        self._audit("backup", None, None, "Backup do banco gerado", {"arquivo": dest})
        return {"arquivo": dest}

    @_api
    def restore(self):
        """Escolhe um arquivo de backup e substitui o banco atual (reabre a conexão)."""
        res = self._win().create_file_dialog(
            webview.OPEN_DIALOG, allow_multiple=False,
            file_types=("Banco ClickOS (*.db)", "Todos os arquivos (*.*)"))
        if not res:
            return {"cancelado": True}
        src = res[0] if isinstance(res, (list, tuple)) else res
        self.con.close()
        shutil.copy2(src, str(dbmod.paths.db_path()))
        self.con = dbmod.connect(dbmod.paths.db_path())
        # registra no banco recém-restaurado que houve uma restauração (a auditoria anterior veio do backup)
        self._audit("restaurar", None, None, "Banco restaurado a partir de backup", {"origem": str(src)})
        return {"restaurado": True}
