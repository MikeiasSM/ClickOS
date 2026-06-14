"""API exposta ao JavaScript (ponte pywebview). Cada método retorna {ok, data|erro}."""
import functools
import shutil
from datetime import datetime
from pathlib import Path

import webview

from . import db as dbmod
from . import paths
from . import printing
from . import repositories as repo
from . import services


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
                                    status=filtro.get("status") or None, q=filtro.get("q") or None)

    @_api
    def get_documento(self, did):
        return repo.documentos.get(self.con, did)

    @_api
    def save_documento(self, payload):
        if payload.get("id"):
            return repo.documentos.update(self.con, payload["id"], payload, stamp=_stamp())
        return repo.documentos.create(self.con, payload, stamp=_stamp())

    @_api
    def delete_documento(self, did):
        repo.documentos.delete(self.con, did)
        return True

    @_api
    def set_status(self, payload):
        repo.documentos.set_status(self.con, payload["id"], payload["status"], stamp=_stamp())
        return True

    @_api
    def converter_os(self, did):
        return services.convert_to_os(self.con, did, stamp=_stamp())

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
            return repo.clientes.update(self.con, payload["id"], payload, stamp=_stamp())
        return repo.clientes.create(self.con, payload, stamp=_stamp())

    @_api
    def delete_cliente(self, cid):
        repo.clientes.delete(self.con, cid)
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
            return repo.veiculos.update(self.con, payload["id"], payload, stamp=_stamp())
        return repo.veiculos.create(self.con, payload, stamp=_stamp())

    @_api
    def delete_veiculo(self, vid):
        repo.veiculos.delete(self.con, vid)
        return True

    # ----------------------------------------------------------------- itens catálogo
    @_api
    def list_itens(self, q=None):
        return repo.itens.search(self.con, q) if q else repo.itens.list(self.con)

    @_api
    def save_item(self, payload):
        if payload.get("id"):
            return repo.itens.update(self.con, payload["id"], payload)
        return repo.itens.create(self.con, payload, stamp=_stamp())

    @_api
    def delete_item(self, iid):
        repo.itens.delete(self.con, iid)
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
        sets = ",".join(f"{c}=?" for c in campos)
        self.con.execute(f"UPDATE empresa SET {sets} WHERE id=1", [payload.get(c) for c in campos])
        self.con.commit()
        return self._empresa_sem_logo()

    @_api
    def remover_logo(self):
        self.con.execute("UPDATE empresa SET logo=NULL WHERE id=1")
        self.con.commit()
        return {"has_logo": False}

    @_api
    def concluir_setup(self):
        """Marca o assistente de primeira execução como concluído."""
        self.con.execute("UPDATE empresa SET setup_concluido=1 WHERE id=1")
        self.con.commit()
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
        return {"has_logo": True}

    # ----------------------------------------------------------------- usuários / login
    @_api
    def login(self, payload):
        user = repo.usuarios.autenticar(self.con, (payload or {}).get("login"), (payload or {}).get("senha"))
        if not user:
            raise ValueError("Login ou senha inválidos.")
        # guarda a identidade no servidor (não confiar no cliente para autorização)
        self.usuario = {"id": user["id"], "login": user["login"], "is_suporte": user["is_suporte"]}
        return user

    @_api
    def logout(self):
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
            return repo.usuarios.update(self.con, payload["id"], payload, stamp=_stamp())
        return repo.usuarios.create(self.con, payload, stamp=_stamp())

    @_api
    def delete_usuario(self, uid):
        self._sessao()
        repo.usuarios.delete(self.con, uid)
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
        return repo.usuarios.reset_senha(self.con, alvo_id, sess["id"], payload.get("senha") or "")

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
        return repo.usuarios.definir_senha(self.con, sess["id"], payload.get("nova_senha") or "")

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
        return {"restaurado": True}
