"""Acesso a dados (CRUD) por entidade. Retorna dicts (prontos para o bridge JS)."""
from datetime import datetime

from . import db as dbmod
from . import services


def _now(stamp=None) -> str:
    return stamp or datetime.now().isoformat(timespec="seconds")


def _row(r):
    return dict(r) if r is not None else None


def _rows(rs):
    return [dict(r) for r in rs]


def _ano(s, fallback: int) -> int:
    try:
        return int(str(s)[:4])
    except (ValueError, TypeError):
        return fallback


# --------------------------------------------------------------------------- clientes
class _Clientes:
    FIELDS = ["nome", "apelido", "cpf_cnpj", "rg_ie", "telefone", "whatsapp", "email",
              "endereco", "numero", "bairro", "cidade", "uf", "cep"]

    def _next_codigo(self, con) -> str:
        n = con.execute("SELECT COUNT(*) FROM clientes").fetchone()[0] + 1
        return f"CLI-{n:04d}"

    def create(self, con, data, stamp=None):
        now = _now(stamp)
        cols = ["codigo_interno"] + self.FIELDS + ["criado_em", "atualizado_em"]
        vals = [self._next_codigo(con)] + [data.get(f) for f in self.FIELDS] + [now, now]
        cur = con.execute(f"INSERT INTO clientes({','.join(cols)}) VALUES({','.join('?'*len(cols))})", vals)
        con.commit()
        return self.get(con, cur.lastrowid)

    def update(self, con, cid, data, stamp=None):
        sets = ",".join(f"{f}=?" for f in self.FIELDS) + ",atualizado_em=?"
        con.execute(f"UPDATE clientes SET {sets} WHERE id=?",
                    [data.get(f) for f in self.FIELDS] + [_now(stamp), cid])
        con.commit()
        return self.get(con, cid)

    def get(self, con, cid):
        return _row(con.execute("SELECT * FROM clientes WHERE id=?", (cid,)).fetchone())

    def list(self, con):
        return _rows(con.execute("SELECT * FROM clientes ORDER BY nome COLLATE NOCASE").fetchall())

    def search(self, con, q):
        like = f"%{q}%"
        return _rows(con.execute(
            "SELECT * FROM clientes WHERE nome LIKE ? OR cpf_cnpj LIKE ? OR telefone LIKE ? "
            "ORDER BY nome COLLATE NOCASE", (like, like, like)).fetchall())

    def delete(self, con, cid):
        if con.execute("SELECT 1 FROM documentos WHERE cliente_id=? LIMIT 1", (cid,)).fetchone():
            raise services.EmVinculo("Cliente possui documentos vinculados e não pode ser excluído.")
        if con.execute("SELECT 1 FROM veiculos WHERE cliente_id=? LIMIT 1", (cid,)).fetchone():
            raise services.EmVinculo("Cliente possui veículos vinculados. Exclua-os primeiro.")
        con.execute("DELETE FROM clientes WHERE id=?", (cid,))
        con.commit()


# --------------------------------------------------------------------------- veiculos
class _Veiculos:
    FIELDS = ["placa", "cliente_id", "marca", "modelo", "versao", "ano_fab", "ano_modelo",
              "cor", "chassi", "renavam", "combustivel", "km_atual"]

    def create(self, con, data, stamp=None):
        if not (data.get("placa") or "").strip():
            raise ValueError("Placa é obrigatória.")
        now = _now(stamp)
        cols = self.FIELDS + ["criado_em", "atualizado_em"]
        vals = [data.get(f) for f in self.FIELDS] + [now, now]
        cur = con.execute(f"INSERT INTO veiculos({','.join(cols)}) VALUES({','.join('?'*len(cols))})", vals)
        con.commit()
        return self.get(con, cur.lastrowid)

    def update(self, con, vid, data, stamp=None):
        sets = ",".join(f"{f}=?" for f in self.FIELDS) + ",atualizado_em=?"
        con.execute(f"UPDATE veiculos SET {sets} WHERE id=?",
                    [data.get(f) for f in self.FIELDS] + [_now(stamp), vid])
        con.commit()
        return self.get(con, vid)

    def get(self, con, vid):
        return _row(con.execute(
            "SELECT v.*, c.nome AS cliente_nome FROM veiculos v "
            "LEFT JOIN clientes c ON c.id=v.cliente_id WHERE v.id=?", (vid,)).fetchone())

    def list(self, con):
        return _rows(con.execute(
            "SELECT v.*, c.nome AS cliente_nome FROM veiculos v "
            "LEFT JOIN clientes c ON c.id=v.cliente_id ORDER BY v.placa").fetchall())

    def by_cliente(self, con, cid):
        return _rows(con.execute("SELECT * FROM veiculos WHERE cliente_id=? ORDER BY placa", (cid,)).fetchall())

    def search(self, con, q):
        like = f"%{q}%"
        return _rows(con.execute(
            "SELECT v.*, c.nome AS cliente_nome FROM veiculos v LEFT JOIN clientes c ON c.id=v.cliente_id "
            "WHERE v.placa LIKE ? OR v.marca LIKE ? OR v.modelo LIKE ? ORDER BY v.placa",
            (like, like, like)).fetchall())

    def delete(self, con, vid):
        if con.execute("SELECT 1 FROM documentos WHERE veiculo_id=? LIMIT 1", (vid,)).fetchone():
            raise services.EmVinculo("Veículo possui documentos vinculados e não pode ser excluído.")
        con.execute("DELETE FROM veiculos WHERE id=?", (vid,))
        con.commit()


# --------------------------------------------------------------------------- itens_catalogo
class _Itens:
    FIELDS = ["nome", "descricao", "tipo", "unidade", "preco", "ativo"]

    def create(self, con, data, stamp=None):
        now = _now(stamp)
        cols = self.FIELDS + ["criado_em"]
        vals = [data.get(f) for f in self.FIELDS] + [now]
        cur = con.execute(f"INSERT INTO itens_catalogo({','.join(cols)}) VALUES({','.join('?'*len(cols))})", vals)
        con.commit()
        return self.get(con, cur.lastrowid)

    def update(self, con, iid, data):
        sets = ",".join(f"{f}=?" for f in self.FIELDS)
        con.execute(f"UPDATE itens_catalogo SET {sets} WHERE id=?",
                    [data.get(f) for f in self.FIELDS] + [iid])
        con.commit()
        return self.get(con, iid)

    def get(self, con, iid):
        return _row(con.execute("SELECT * FROM itens_catalogo WHERE id=?", (iid,)).fetchone())

    def list(self, con, somente_ativos=False):
        sql = "SELECT * FROM itens_catalogo"
        if somente_ativos:
            sql += " WHERE ativo=1"
        sql += " ORDER BY nome COLLATE NOCASE"
        return _rows(con.execute(sql).fetchall())

    def search(self, con, q):
        like = f"%{q}%"
        return _rows(con.execute(
            "SELECT * FROM itens_catalogo WHERE nome LIKE ? OR descricao LIKE ? ORDER BY nome COLLATE NOCASE",
            (like, like)).fetchall())

    def delete(self, con, iid):
        con.execute("UPDATE documento_itens SET item_catalogo_id=NULL WHERE item_catalogo_id=?", (iid,))
        con.execute("DELETE FROM itens_catalogo WHERE id=?", (iid,))
        con.commit()


# --------------------------------------------------------------------------- documentos
class _Documentos:
    HEAD = ["tipo", "status", "data_abertura", "cliente_id", "veiculo_id", "km_entrada",
            "desconto_geral", "acrescimo", "forma_pagamento", "prazo_execucao", "validade",
            "observacoes", "estado_geral", "nivel_combustivel", "obs_entrada",
            "item_chave_principal", "item_chave_reserva", "item_documento", "item_manual",
            "origem_orcamento_id"]

    def create(self, con, data, stamp=None):
        now = _now(stamp)
        data = {**data}
        data.setdefault("tipo", "orcamento")
        data.setdefault("status", "Aberta")
        data.setdefault("desconto_geral", 0)
        data.setdefault("acrescimo", 0)
        numero = services.next_number(con, data["tipo"], _ano(data.get("data_abertura"), _ano(now, 2026)))
        itens = data.get("itens") or []
        tot = services.compute_totals(itens, data.get("desconto_geral"), data.get("acrescimo"))
        cols = ["numero"] + self.HEAD + ["subtotal", "total", "criado_em", "atualizado_em"]
        vals = [numero] + [data.get(f) for f in self.HEAD] + [tot["subtotal"], tot["total"], now, now]
        cur = con.execute(f"INSERT INTO documentos({','.join(cols)}) VALUES({','.join('?'*len(cols))})", vals)
        did = cur.lastrowid
        self._save_children(con, did, itens, data.get("lataria"))
        con.commit()
        return self.get(con, did)

    def update(self, con, did, data, stamp=None):
        now = _now(stamp)
        itens = data.get("itens") or []
        tot = services.compute_totals(itens, data.get("desconto_geral"), data.get("acrescimo"))
        sets = ",".join(f"{f}=?" for f in self.HEAD) + ",subtotal=?,total=?,atualizado_em=?"
        vals = [data.get(f) for f in self.HEAD] + [tot["subtotal"], tot["total"], now, did]
        con.execute(f"UPDATE documentos SET {sets} WHERE id=?", vals)
        self._save_children(con, did, itens, data.get("lataria"))
        con.commit()
        return self.get(con, did)

    def _save_children(self, con, did, itens, lataria):
        con.execute("DELETE FROM documento_itens WHERE documento_id=?", (did,))
        for ordem, it in enumerate(itens or []):
            liq = services.line_liquido(it.get("quantidade"), it.get("valor_unitario"), it.get("desconto"))
            con.execute(
                "INSERT INTO documento_itens(documento_id,item_catalogo_id,descricao,tipo,quantidade,"
                "valor_unitario,desconto,valor_liquido,ordem) VALUES(?,?,?,?,?,?,?,?,?)",
                (did, it.get("item_catalogo_id"), it.get("descricao"), it.get("tipo"),
                 services._num(it.get("quantidade")), services._num(it.get("valor_unitario")),
                 services._num(it.get("desconto")), liq, ordem))
        con.execute("DELETE FROM documento_lataria WHERE documento_id=?", (did,))
        marcado = {p.get("peca"): p.get("estado", "") for p in (lataria or [])}
        for ordem, peca in enumerate(dbmod.LISTA_PECAS):
            con.execute("INSERT INTO documento_lataria(documento_id,peca,estado,ordem) VALUES(?,?,?,?)",
                        (did, peca, marcado.get(peca, ""), ordem))

    def set_status(self, con, did, status, stamp=None):
        con.execute("UPDATE documentos SET status=?, atualizado_em=? WHERE id=?", (status, _now(stamp), did))
        con.commit()

    def get(self, con, did):
        d = _row(con.execute(
            "SELECT d.*, c.nome AS cliente_nome, v.placa AS veiculo_placa "
            "FROM documentos d LEFT JOIN clientes c ON c.id=d.cliente_id "
            "LEFT JOIN veiculos v ON v.id=d.veiculo_id WHERE d.id=?", (did,)).fetchone())
        if d is None:
            return None
        d["itens"] = _rows(con.execute(
            "SELECT * FROM documento_itens WHERE documento_id=? ORDER BY ordem", (did,)).fetchall())
        d["lataria"] = _rows(con.execute(
            "SELECT * FROM documento_lataria WHERE documento_id=? ORDER BY ordem", (did,)).fetchall())
        return d

    def list(self, con, tipo=None, status=None, q=None):
        sql = ("SELECT d.*, c.nome AS cliente_nome, v.placa AS veiculo_placa "
               "FROM documentos d LEFT JOIN clientes c ON c.id=d.cliente_id "
               "LEFT JOIN veiculos v ON v.id=d.veiculo_id WHERE 1=1")
        args = []
        if tipo:
            sql += " AND d.tipo=?"; args.append(tipo)
        if status:
            sql += " AND d.status=?"; args.append(status)
        if q:
            like = f"%{q}%"
            sql += " AND (d.numero LIKE ? OR c.nome LIKE ? OR v.placa LIKE ?)"
            args += [like, like, like]
        sql += " ORDER BY d.id DESC"
        return _rows(con.execute(sql, args).fetchall())

    def delete(self, con, did):
        con.execute("DELETE FROM documentos WHERE id=?", (did,))
        con.commit()


clientes = _Clientes()
veiculos = _Veiculos()
itens = _Itens()
documentos = _Documentos()
