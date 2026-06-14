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
            raise services.EmVinculo("Pessoa possui documentos vinculados e não pode ser excluída.")
        if con.execute("SELECT 1 FROM veiculos WHERE cliente_id=? LIMIT 1", (cid,)).fetchone():
            raise services.EmVinculo("Pessoa possui veículos vinculados. Exclua-os primeiro.")
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
    # "unidade" removido da UI; mantém o default do schema e não é mais sobrescrito.
    FIELDS = ["nome", "descricao", "tipo", "preco", "ativo"]

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


# --------------------------------------------------------------------------- preferências
from datetime import timedelta

PREF_DEFAULTS = {
    "orc_validade_qtd": "15",
    "orc_validade_unidade": "dias",
    "os_atraso_qtd": "1",
    "os_atraso_unidade": "dias",
}


def get_preferencias(con) -> dict:
    """Preferências do sistema (mescla os padrões com o que estiver salvo)."""
    out = dict(PREF_DEFAULTS)
    for r in con.execute("SELECT chave, valor FROM preferencias"):
        if r[1] is not None:
            out[r[0]] = r[1]
    return out


def save_preferencias(con, data) -> dict:
    for chave, valor in (data or {}).items():
        if chave in PREF_DEFAULTS:
            con.execute(
                "INSERT INTO preferencias(chave, valor) VALUES (?, ?) "
                "ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor",
                (chave, "" if valor is None else str(valor)))
    con.commit()
    return get_preferencias(con)


def _anota_situacao(d, prefs, agora):
    """Anota campos derivados no documento (não persistidos):
    desconto_valor (R$ resolvido), expirado (orçamento), atrasado (O.S.) e situacao (status p/ exibir)."""
    sub, tot = services._num(d.get("subtotal")), services._num(d.get("total"))
    acr = services._num(d.get("acrescimo"))
    d["desconto_valor"] = round(sub + acr - tot, 2)  # deriva do que já foi gravado
    d["expirado"] = False
    d["atrasado"] = False
    d["situacao"] = d.get("status")
    if d.get("tipo") == "orcamento" and d.get("status") == "Aberto":
        dt = services.parse_dt(d.get("data_abertura"))
        if dt is not None:
            limite = dt + timedelta(seconds=services.duracao_segundos(
                prefs.get("orc_validade_qtd"), prefs.get("orc_validade_unidade")))
            if agora > limite:
                d["expirado"] = True
                d["situacao"] = "Expirado"
    elif d.get("tipo") == "os" and d.get("status") in ("Aberta", "Em Execução", "Concluída"):
        pv = services.parse_dt(d.get("previsao"))
        if pv is not None:
            limite = pv + timedelta(seconds=services.duracao_segundos(
                prefs.get("os_atraso_qtd"), prefs.get("os_atraso_unidade")))
            if agora > limite:
                d["atrasado"] = True
    return d


# --------------------------------------------------------------------------- documentos
class _Documentos:
    HEAD = ["tipo", "status", "prioridade", "data_abertura", "previsao", "cliente_id", "veiculo_id",
            "km_entrada", "desconto_geral", "desconto_tipo", "acrescimo", "forma_pagamento",
            "prazo_execucao", "validade", "observacoes", "estado_geral", "nivel_combustivel",
            "obs_entrada", "item_chave_principal", "item_chave_reserva", "item_documento", "item_manual",
            "origem_orcamento_id", "usuario_id",
            "ocorrencia", "parecer_mecanico", "mecanico"]  # faturado_em é carimbado pelo sistema

    def create(self, con, data, stamp=None):
        now = _now(stamp)
        data = {**data}
        data.setdefault("tipo", "orcamento")
        data.setdefault("status", "Aberta" if data["tipo"] == "os" else "Aberto")
        data.setdefault("prioridade", "Normal")
        data.setdefault("desconto_geral", 0)
        data.setdefault("desconto_tipo", "valor")
        data.setdefault("acrescimo", 0)
        numero = services.next_number(con, data["tipo"], _ano(data.get("data_abertura"), _ano(now, 2026)))
        itens = data.get("itens") or []
        tot = services.compute_totals(itens, data.get("desconto_geral"), data.get("acrescimo"),
                                      data.get("desconto_tipo"))
        cols = ["numero"] + self.HEAD + ["subtotal", "total", "criado_em", "atualizado_em"]
        vals = [numero] + [data.get(f) for f in self.HEAD] + [tot["subtotal"], tot["total"], now, now]
        cur = con.execute(f"INSERT INTO documentos({','.join(cols)}) VALUES({','.join('?'*len(cols))})", vals)
        did = cur.lastrowid
        if data.get("status") == "Faturada":  # O.S. lançada já faturada: data de faturamento = abertura (editável)
            fat = (data.get("faturado_em") or "").strip() or data.get("data_abertura") or now
            con.execute("UPDATE documentos SET faturado_em=? WHERE id=?", (fat, did))
        self._save_children(con, did, itens, data.get("lataria"))
        con.commit()
        return self.get(con, did)

    def update(self, con, did, data, stamp=None):
        now = _now(stamp)
        itens = data.get("itens") or []
        if data.get("status") == "Faturada" and not itens:
            raise ValueError("Não é possível faturar uma O.S. sem nenhum serviço.")
        tot = services.compute_totals(itens, data.get("desconto_geral"), data.get("acrescimo"),
                                      data.get("desconto_tipo"))
        # só grava as colunas presentes no payload (preserva as demais — evita zerar campos não enviados)
        campos = [f for f in self.HEAD if f in data]
        sets = ",".join(f"{f}=?" for f in campos) + ",subtotal=?,total=?,atualizado_em=?"
        vals = [data.get(f) for f in campos] + [tot["subtotal"], tot["total"], now, did]
        con.execute(f"UPDATE documentos SET {sets} WHERE id=?", vals)
        if data.get("status") == "Faturada":
            fat = (data.get("faturado_em") or "").strip()
            if fat:  # data de faturamento editável (inclusive O.S. lançada já faturada)
                con.execute("UPDATE documentos SET faturado_em=? WHERE id=?", (fat, did))
            else:    # senão, carimba agora se ainda não houver
                con.execute("UPDATE documentos SET faturado_em=? WHERE id=? AND (faturado_em IS NULL OR faturado_em='')",
                            (now, did))
        elif "status" in data:  # saiu de Faturada: a marca de faturamento deixa de valer
            con.execute("UPDATE documentos SET faturado_em=NULL WHERE id=?", (did,))
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
        now = _now(stamp)
        if status == "Faturada":  # faturar exige ao menos um serviço (vale também p/ o arrastar do kanban)
            if not con.execute("SELECT COUNT(*) FROM documento_itens WHERE documento_id=?", (did,)).fetchone()[0]:
                raise ValueError("Não é possível faturar uma O.S. sem nenhum serviço.")
        con.execute("UPDATE documentos SET status=?, atualizado_em=? WHERE id=?", (status, now, did))
        if status == "Faturada":  # carimba a data de faturamento se ainda não houver
            con.execute("UPDATE documentos SET faturado_em=? WHERE id=? AND (faturado_em IS NULL OR faturado_em='')",
                        (now, did))
        else:  # saiu de Faturada (reabertura/cancelamento): limpa a marca de faturamento
            con.execute("UPDATE documentos SET faturado_em=NULL WHERE id=?", (did,))
        con.commit()

    def get(self, con, did):
        d = _row(con.execute(
            "SELECT d.*, c.nome AS cliente_nome, v.placa AS veiculo_placa, "
            "v.marca AS veiculo_marca, v.modelo AS veiculo_modelo, u.nome AS usuario_nome "
            "FROM documentos d LEFT JOIN clientes c ON c.id=d.cliente_id "
            "LEFT JOIN veiculos v ON v.id=d.veiculo_id "
            "LEFT JOIN usuarios u ON u.id=d.usuario_id WHERE d.id=?", (did,)).fetchone())
        if d is None:
            return None
        d["itens"] = _rows(con.execute(
            "SELECT * FROM documento_itens WHERE documento_id=? ORDER BY ordem", (did,)).fetchall())
        d["lataria"] = _rows(con.execute(
            "SELECT * FROM documento_lataria WHERE documento_id=? ORDER BY ordem", (did,)).fetchall())
        _anota_situacao(d, get_preferencias(con), datetime.now())
        return d

    def list(self, con, tipo=None, status=None, q=None, data_ini=None, data_fim=None):
        sql = ("SELECT d.*, c.nome AS cliente_nome, v.placa AS veiculo_placa, "
               "v.marca AS veiculo_marca, v.modelo AS veiculo_modelo, u.nome AS usuario_nome "
               "FROM documentos d LEFT JOIN clientes c ON c.id=d.cliente_id "
               "LEFT JOIN veiculos v ON v.id=d.veiculo_id "
               "LEFT JOIN usuarios u ON u.id=d.usuario_id WHERE 1=1")
        args = []
        if tipo:
            sql += " AND d.tipo=?"; args.append(tipo)
        if status:
            sql += " AND d.status=?"; args.append(status)
        if data_ini:
            sql += " AND substr(COALESCE(d.data_abertura,''),1,10) >= ?"; args.append(str(data_ini)[:10])
        if data_fim:
            sql += " AND substr(COALESCE(d.data_abertura,''),1,10) <= ?"; args.append(str(data_fim)[:10])
        if q:
            like = f"%{q}%"
            sql += " AND (d.numero LIKE ? OR c.nome LIKE ? OR v.placa LIKE ?)"
            args += [like, like, like]
        sql += " ORDER BY d.id DESC"
        rows = _rows(con.execute(sql, args).fetchall())
        prefs, agora = get_preferencias(con), datetime.now()
        for d in rows:
            _anota_situacao(d, prefs, agora)
        return rows

    def delete(self, con, did):
        con.execute("DELETE FROM documentos WHERE id=?", (did,))
        con.commit()


# --------------------------------------------------------------------------- usuarios
SUPORTE_LOGIN = "SUPORTE"  # conta mestre: nunca pode ser excluída


def _norm_login(login) -> str:
    return (login or "").strip().upper()  # logins são sempre em MAIÚSCULAS


def _decode_avatar(b64):
    if not b64:
        return None
    import base64
    return base64.b64decode(str(b64).split(",", 1)[-1])  # tolera prefixo data:


class _Usuarios:
    def _public(self, row):
        """Dict seguro para a UI: nunca inclui senha_hash/salt; embute avatar como data URI."""
        if row is None:
            return None
        return {
            "id": row["id"], "login": row["login"], "nome": row["nome"],
            "ativo": row["ativo"], "criado_em": row["criado_em"],
            "must_change": row["must_change"] if "must_change" in row.keys() else 0,
            "avatar_uri": services.image_data_uri(row["avatar"] if "avatar" in row.keys() else None),
            "is_suporte": _norm_login(row["login"]) == SUPORTE_LOGIN,
        }

    def list(self, con):
        rows = con.execute("SELECT * FROM usuarios ORDER BY login COLLATE NOCASE").fetchall()
        return [self._public(r) for r in rows]

    def get(self, con, uid):
        return self._public(con.execute("SELECT * FROM usuarios WHERE id=?", (uid,)).fetchone())

    def by_login(self, con, login):
        return _row(con.execute(
            "SELECT * FROM usuarios WHERE login=? COLLATE NOCASE", (_norm_login(login),)).fetchone())

    def create(self, con, data, stamp=None):
        login = _norm_login(data.get("login"))
        senha = data.get("senha") or ""
        if not login:
            raise ValueError("Login é obrigatório.")
        if login == SUPORTE_LOGIN:
            raise ValueError("Este login é reservado pelo sistema.")
        if len(senha) < 4:
            raise ValueError("A senha deve ter ao menos 4 caracteres.")
        if self.by_login(con, login):
            raise ValueError("Já existe um usuário com esse login.")
        salt, senha_hash = services.hash_senha(senha)
        cur = con.execute(
            "INSERT INTO usuarios(login, nome, senha_hash, salt, ativo, criado_em, avatar, must_change) "
            "VALUES (?,?,?,?,?,?,?,0)",
            (login, (data.get("nome") or login).strip(), senha_hash, salt,
             1 if data.get("ativo", 1) else 0, _now(stamp), _decode_avatar(data.get("avatar_b64"))))
        con.commit()
        return self.get(con, cur.lastrowid)

    def update(self, con, uid, data, stamp=None):
        row = con.execute("SELECT * FROM usuarios WHERE id=?", (uid,)).fetchone()
        if row is None:
            raise ValueError("Usuário não encontrado.")
        e_suporte = _norm_login(row["login"]) == SUPORTE_LOGIN
        # o login do SUPORTE é fixo (conta mestre); demais podem ser renomeados (sempre MAIÚSCULO)
        login = row["login"] if e_suporte else (_norm_login(data.get("login")) or row["login"])
        if not e_suporte and login == SUPORTE_LOGIN:
            raise ValueError("Este login é reservado pelo sistema.")
        if con.execute("SELECT 1 FROM usuarios WHERE login=? COLLATE NOCASE AND id<>?",
                       (login, uid)).fetchone():
            raise ValueError("Já existe um usuário com esse login.")
        nome = (data.get("nome") or row["nome"] or login).strip()
        ativo = 1 if (data.get("ativo", row["ativo"]) or e_suporte) else 0  # SUPORTE nunca inativa
        sets = ["login=?", "nome=?", "ativo=?"]
        vals = [login, nome, ativo]
        senha = (data.get("senha") or "").strip()
        if senha:
            if len(senha) < 4:
                raise ValueError("A senha deve ter ao menos 4 caracteres.")
            salt, senha_hash = services.hash_senha(senha)
            sets += ["senha_hash=?", "salt=?", "must_change=0"]
            vals += [senha_hash, salt]
        if data.get("avatar_remove"):
            sets += ["avatar=?"]; vals += [None]
        elif data.get("avatar_b64"):
            sets += ["avatar=?"]; vals += [_decode_avatar(data.get("avatar_b64"))]
        con.execute(f"UPDATE usuarios SET {','.join(sets)} WHERE id=?", vals + [uid])
        con.commit()
        return self.get(con, uid)

    def delete(self, con, uid):
        row = con.execute("SELECT login FROM usuarios WHERE id=?", (uid,)).fetchone()
        if row is None:
            return
        if _norm_login(row["login"]) == SUPORTE_LOGIN:
            raise services.EmVinculo("O usuário SUPORTE não pode ser excluído.")
        if con.execute("SELECT COUNT(*) FROM usuarios").fetchone()[0] <= 1:
            raise services.EmVinculo("Não é possível excluir o único usuário do sistema.")
        con.execute("DELETE FROM usuarios WHERE id=?", (uid,))
        con.commit()

    def autenticar(self, con, login, senha):
        row = self.by_login(con, login)
        if row is None or not row["ativo"]:
            return None
        if services.verifica_senha(senha, row["salt"], row["senha_hash"]):
            return self._public(row)
        return None

    def reset_senha(self, con, alvo_id, solicitante_id, senha_solicitante):
        """Redefine a senha de `alvo_id` para a padrão (1234), exigindo a senha do solicitante.
        O alvo deverá obrigatoriamente trocar a senha no próximo login (must_change=1)."""
        solic = con.execute("SELECT * FROM usuarios WHERE id=?", (solicitante_id,)).fetchone()
        if solic is None or not services.verifica_senha(senha_solicitante, solic["salt"], solic["senha_hash"]):
            raise ValueError("Sua senha está incorreta. Redefinição cancelada.")
        alvo = con.execute("SELECT * FROM usuarios WHERE id=?", (alvo_id,)).fetchone()
        if alvo is None:
            raise ValueError("Usuário não encontrado.")
        salt, senha_hash = services.hash_senha(services.SENHA_RESET)
        con.execute("UPDATE usuarios SET senha_hash=?, salt=?, must_change=1 WHERE id=?",
                    (senha_hash, salt, alvo_id))
        con.commit()
        return {"login": alvo["login"], "senha_padrao": services.SENHA_RESET}

    def definir_senha(self, con, uid, nova_senha):
        """Define uma nova senha (troca obrigatória do 1º login); recusa repetir a senha atual."""
        row = con.execute("SELECT * FROM usuarios WHERE id=?", (uid,)).fetchone()
        if row is None:
            raise ValueError("Usuário não encontrado.")
        nova = (nova_senha or "").strip()
        if len(nova) < 4:
            raise ValueError("A nova senha deve ter ao menos 4 caracteres.")
        if services.verifica_senha(nova, row["salt"], row["senha_hash"]):
            raise ValueError("A nova senha não pode ser igual à atual.")
        salt, senha_hash = services.hash_senha(nova)
        con.execute("UPDATE usuarios SET senha_hash=?, salt=?, must_change=0 WHERE id=?",
                    (senha_hash, salt, uid))
        con.commit()
        return self.get(con, uid)


def sugestoes(con):
    """Listas de autocomplete (seed + valores já cadastrados pelo usuário)."""
    def distinct(table, col):
        return [r[0] for r in con.execute(
            f"SELECT DISTINCT {col} FROM {table} WHERE {col} IS NOT NULL AND TRIM({col})<>'' "
            f"ORDER BY {col} COLLATE NOCASE")]

    def custom(tipo):
        return [r[0] for r in con.execute(
            "SELECT valor FROM valores_custom WHERE tipo=? ORDER BY valor COLLATE NOCASE", (tipo,))]

    def merge(seed, *extras):
        seen, out = set(), []
        combined = list(seed)
        for e in extras:
            combined += list(e)
        for v in combined:
            k = (v or "").strip().lower()
            if v and k not in seen:
                seen.add(k)
                out.append(v)
        return out

    return {
        "marcas": merge(dbmod.SUG_MARCAS, distinct("veiculos", "marca"), custom("marca")),
        "cores": merge(dbmod.SUG_CORES, distinct("veiculos", "cor"), custom("cor")),
        "combustiveis": merge(dbmod.SUG_COMBUSTIVEIS, distinct("veiculos", "combustivel"), custom("combustivel")),
        "cidades": merge(dbmod.SUG_CIDADES, distinct("clientes", "cidade")),
    }


clientes = _Clientes()
veiculos = _Veiculos()
itens = _Itens()
documentos = _Documentos()
usuarios = _Usuarios()
