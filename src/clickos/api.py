"""API exposta ao JavaScript (ponte pywebview). Cada método retorna {ok, data|erro}."""
import functools
from datetime import datetime

from . import backup as bk
from . import db as dbmod
from . import paths
from . import printing
from . import repositories as repo
from . import services


def _stamp() -> str:
    return datetime.now().isoformat(timespec="seconds")


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

    # ----------------------------------------------------------------- bootstrap / dashboard
    @_api
    def bootstrap(self):
        return {
            "empresa": self._empresa_sem_logo(),
            "status_lista": dbmod.STATUS_LISTA,
            "formas_pagamento": dbmod.FORMAS_PAGAMENTO,
            "niveis_combustivel": dbmod.NIVEIS_COMBUSTIVEL,
            "estado_geral": dbmod.ESTADO_GERAL_LISTA,
            "pecas": dbmod.LISTA_PECAS,
        }

    @_api
    def dashboard(self):
        con = self.con
        total = con.execute("SELECT COUNT(*) FROM documentos").fetchone()[0]
        abertas = con.execute("SELECT COUNT(*) FROM documentos WHERE status='Aberta'").fetchone()[0]
        clientes = con.execute("SELECT COUNT(*) FROM clientes").fetchone()[0]
        mes = datetime.now().strftime("%Y-%m")
        fat = con.execute(
            "SELECT COALESCE(SUM(total),0) FROM documentos WHERE tipo='os' AND substr(data_abertura,1,7)=?",
            (mes,)).fetchone()[0]
        return {"total": total, "abertas": abertas, "clientes": clientes,
                "faturamento_mes": fat, "recentes": repo.documentos.list(con)[:5]}

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

    @_api
    def print_documento(self, did):
        doc = repo.documentos.get(self.con, did)
        if not doc:
            raise ValueError("Documento não encontrado.")
        cliente = repo.clientes.get(self.con, doc["cliente_id"]) if doc.get("cliente_id") else {}
        veiculo = repo.veiculos.get(self.con, doc["veiculo_id"]) if doc.get("veiculo_id") else {}
        empresa = dict(self.con.execute("SELECT * FROM empresa WHERE id=1").fetchone())
        html = printing.render_documento(
            doc, empresa, cliente, veiculo,
            gerado_em=datetime.now().strftime("%d/%m/%Y às %H:%M"))
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
    def save_empresa(self, payload):
        campos = ["razao_social", "nome_fantasia", "cnpj", "ie", "endereco", "bairro", "cidade",
                  "uf", "cep", "telefone", "whatsapp", "email", "site", "slogan", "termos_padrao"]
        sets = ",".join(f"{c}=?" for c in campos)
        self.con.execute(f"UPDATE empresa SET {sets} WHERE id=1", [payload.get(c) for c in campos])
        self.con.commit()
        return self._empresa_sem_logo()

    @_api
    def update_logo(self, payload):
        from pathlib import Path
        data = Path(payload["path"]).read_bytes()
        self.con.execute("UPDATE empresa SET logo=? WHERE id=1", (data,))
        self.con.commit()
        return {"has_logo": True}

    # ----------------------------------------------------------------- backup
    @_api
    def backup(self):
        self.con.commit()
        arquivo = bk.backup(paths.db_path(), paths.backups_dir(),
                            datetime.now().strftime("%Y%m%d-%H%M%S"))
        return {"arquivo": arquivo}
