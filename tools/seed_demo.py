"""Popula a base com dados de demonstração (6 meses) para validar os indicadores do dashboard.

Mantém usuários, empresa e configurações; limpa apenas os dados transacionais (pessoas,
veículos e documentos) e recria um conjunto realista de Ordens de Serviço e Orçamentos
distribuídos pelos últimos 6 meses, com status variados (Aberta, Em Execução, Concluída,
Entregue, Cancelada / Aberto, Aprovado, Recusado).

Uso:  python tools/seed_demo.py        (use --backup para também gerar um .db de backup)
"""
import os
import random
import shutil
import sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))

from clickos import db as dbmod          # noqa: E402
from clickos import paths                # noqa: E402
from clickos import repositories as repo  # noqa: E402

random.seed(42)

PESSOAS = [
    ("Amauri Alves", "ALVES", "077.111.222-33", "(77) 99154-3326", "Luís Eduardo Magalhães", "BA"),
    ("Grazieli Alves dos Santos", "Gra", "022.333.444-55", "(77) 99812-7744", "Barreiras", "BA"),
    ("Miqueias dos Santos Medrado", "Miqueias", "859.386.935-19", "(77) 99876-1020", "Luís Eduardo Magalhães", "BA"),
    ("João Pereira da Silva", "João", "144.255.366-77", "(77) 99701-3322", "São Desidério", "BA"),
    ("Maria Oliveira Costa", "Maria", "255.366.477-88", "(77) 99655-9090", "Luís Eduardo Magalhães", "BA"),
    ("Carlos Souza Lima", "Carlos", "366.477.588-99", "(77) 99744-1212", "Riachão das Neves", "BA"),
    ("Ana Beatriz Nascimento", "Ana", "477.588.699-00", "(77) 99633-4545", "Barreiras", "BA"),
    ("Roberto Dias Moreira", "Roberto", "588.699.700-11", "(77) 99522-8787", "Luís Eduardo Magalhães", "BA"),
    ("Fernanda Gomes Rocha", "Fernanda", "699.700.811-22", "(77) 99411-3636", "Catolândia", "BA"),
    ("Pedro Henrique Barbosa", "Pedro", "700.811.922-33", "(77) 99300-2525", "Baianópolis", "BA"),
]

VEICULOS = [
    ("ABC1D23", "Chevrolet", "S10 LTZ", "Manual Flex", "2012", "Bege", "Flex", 0),
    ("FEC5C92", "Hyundai", "2.0 GLS", "Automático", "2012", "Preto", "Gasolina", 2),
    ("KLM2A11", "Volkswagen", "Gol", "1.6", "2018", "Branco", "Flex", 1),
    ("PQR3B45", "Fiat", "Strada", "Working", "2020", "Vermelho", "Flex", 3),
    ("STU4C67", "Toyota", "Corolla", "XEi", "2019", "Prata", "Flex", 4),
    ("VWX5D89", "Ford", "Ranger", "XLT", "2017", "Cinza", "Diesel", 5),
    ("YZA6E12", "Honda", "Civic", "EXL", "2021", "Preto", "Gasolina", 6),
    ("BCD7F34", "Jeep", "Renegade", "Longitude", "2022", "Azul", "Flex", 7),
    ("EFG8G56", "Renault", "Duster", "Iconic", "2021", "Branco", "Flex", 8),
    ("HIJ9H78", "Mitsubishi", "L200", "Triton", "2016", "Prata", "Diesel", 9),
    ("KLM0I90", "Volkswagen", "Saveiro", "Robust", "2020", "Branco", "Flex", 0),
    ("NOP1J23", "Chevrolet", "Onix", "LTZ", "2023", "Grafite", "Flex", 4),
]

# itens extras típicos de chapeação e pintura (nome, descrição, tipo, preço)
ITENS_EXTRA = [
    ("Funilaria (reparo)", "Reparo de funilaria por peça", "servico", 800),
    ("Pintura Completa", "Pintura geral do veículo", "servico", 3200),
    ("Pintura Parcial", "Pintura de peça/seção", "servico", 950),
    ("Polimento Técnico", "Polimento e cristalização", "servico", 380),
    ("Martelinho de Ouro", "Reparo sem pintura por mossa", "servico", 450),
    ("Troca de Para-choque", "Substituição de para-choque", "servico", 680),
    ("Massa e Lixamento", "Preparação de superfície", "servico", 420),
    ("Verniz Automotivo", "Aplicação de verniz (un.)", "produto", 160),
]

FORMAS = ["PIX", "Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Parcelado"]
# (qtde de OS, qtde de orçamentos) por mês, do mais antigo (5) ao atual (0)
PLANO_MES = {5: (4, 2), 4: (5, 2), 3: (5, 1), 2: (6, 2), 1: (6, 2), 0: (5, 3)}


def _mes_ano(now, i):
    y, mo = now.year, now.month - i
    while mo <= 0:
        mo += 12
        y -= 1
    return y, mo


def _data(y, mo, dia):
    return f"{y:04d}-{mo:02d}-{min(dia, 28):02d}"


def _dia(i, now):
    """Dia aleatório do mês; no mês corrente (i==0) nunca passa de hoje (evita datas no futuro)."""
    if i > 0:
        return random.randint(2, 27)
    return random.randint(1, max(1, now.day))


def limpar(con):
    for t in ("documento_lataria", "documento_itens", "documentos", "veiculos", "clientes"):
        con.execute(f"DELETE FROM {t}")
    con.execute("DELETE FROM contadores")
    con.execute("UPDATE empresa SET setup_concluido = 1 WHERE id = 1")  # base demo já configurada
    con.commit()


def garantir_catalogo(con):
    existentes = {r["nome"] for r in con.execute("SELECT nome FROM itens_catalogo")}
    for nome, desc, tipo, preco in ITENS_EXTRA:
        if nome not in existentes:
            con.execute("INSERT INTO itens_catalogo(nome, descricao, tipo, unidade, preco, ativo, criado_em) "
                        "VALUES (?,?,?,?,?,1,?)", (nome, desc, tipo, "Unidade", preco,
                                                   datetime.now().isoformat(timespec="seconds")))
    con.commit()
    return repo.itens.list(con)


def linha_item(cat):
    qtd = random.choice([1, 1, 1, 2])
    desconto = random.choice([0, 0, 0, 50, 100])
    return {"item_catalogo_id": cat["id"], "descricao": cat["nome"], "tipo": cat["tipo"],
            "quantidade": qtd, "valor_unitario": cat["preco"], "desconto": desconto}


def main(fazer_backup):
    con = dbmod.connect(paths.db_path())
    now = datetime.now()
    print("Banco:", paths.db_path())
    limpar(con)
    catalogo = garantir_catalogo(con)
    servicos = [c for c in catalogo if c["tipo"] == "servico"]

    # usuário responsável (qualquer um existente; preferir SUPORTE)
    urow = con.execute("SELECT id FROM usuarios ORDER BY (login='SUPORTE') DESC, id LIMIT 1").fetchone()
    uid = urow["id"] if urow else None

    # pessoas e veículos
    pids = []
    for nome, apelido, doc, tel, cidade, uf in PESSOAS:
        p = repo.clientes.create(con, {"nome": nome, "apelido": apelido, "cpf_cnpj": doc,
                                       "telefone": tel, "cidade": cidade, "uf": uf})
        pids.append(p["id"])
    vids = []
    for placa, marca, modelo, versao, ano, cor, comb, idx in VEICULOS:
        v = repo.veiculos.create(con, {"placa": placa, "marca": marca, "modelo": modelo, "versao": versao,
                                       "ano_fab": ano, "cor": cor, "combustivel": comb,
                                       "km_atual": str(random.randint(20000, 180000)),
                                       "cliente_id": pids[idx % len(pids)]})
        vids.append((v["id"], v["cliente_id"]))

    os_status_antigos = ["Concluída", "Entregue", "Entregue", "Concluída"]
    os_status_recentes = ["Aberta", "Em Execução", "Concluída", "Aberta", "Em Execução", "Entregue"]
    total_os = total_orc = 0

    for i in range(5, -1, -1):
        y, mo = _mes_ano(now, i)
        n_os, n_orc = PLANO_MES[i]
        for k in range(n_os):
            vid, cli = random.choice(vids)
            itens = [linha_item(random.choice(servicos)) for _ in range(random.randint(1, 3))]
            if i >= 3:
                status = random.choice(os_status_antigos)
            elif i == 0:
                status = random.choice(["Aberta", "Aberta", "Em Execução", "Concluída", "Em Execução"])
            else:
                status = random.choice(os_status_recentes)
            if random.random() < 0.06:
                status = "Cancelada"
            dia = _dia(i, now)
            repo.documentos.create(con, {
                "tipo": "os", "status": status, "prioridade": random.choice(["Normal", "Normal", "Alta", "Urgente"]),
                "data_abertura": _data(y, mo, dia), "cliente_id": cli, "veiculo_id": vid,
                "km_entrada": str(random.randint(20000, 180000)), "desconto_geral": random.choice([0, 0, 100, 150]),
                "acrescimo": 0, "forma_pagamento": random.choice(FORMAS), "nivel_combustivel": random.choice(["1/4", "1/2", "3/4", "Cheio"]),
                "item_chave_principal": 1, "item_documento": 1, "usuario_id": uid, "itens": itens, "lataria": [],
            }, stamp=_data(y, mo, dia) + "T10:00:00")
            total_os += 1
        for k in range(n_orc):
            vid, cli = random.choice(vids)
            itens = [linha_item(random.choice(servicos)) for _ in range(random.randint(1, 2))]
            status = random.choice(["Aberto", "Aberto", "Aprovado", "Recusado"])
            dia = _dia(i, now)
            repo.documentos.create(con, {
                "tipo": "orcamento", "status": status, "prioridade": "Normal",
                "data_abertura": _data(y, mo, dia), "cliente_id": cli, "veiculo_id": vid,
                "forma_pagamento": random.choice(FORMAS), "usuario_id": uid, "itens": itens, "lataria": [],
            }, stamp=_data(y, mo, dia) + "T11:00:00")
            total_orc += 1

    con.commit()

    # resumo dos indicadores
    one = lambda q, a=(): con.execute(q, a).fetchone()[0]
    mes = now.strftime("%Y-%m")
    print(f"Pessoas: {one('SELECT COUNT(*) FROM clientes')}  Veículos: {one('SELECT COUNT(*) FROM veiculos')}")
    print(f"OS: {total_os}  Orçamentos: {total_orc}")
    print("Faturamento do mês:", round(one("SELECT COALESCE(SUM(total),0) FROM documentos WHERE tipo='os' AND substr(data_abertura,1,7)=?", (mes,)), 2))
    print("Faturamento total (OS):", round(one("SELECT COALESCE(SUM(total),0) FROM documentos WHERE tipo='os'"), 2))
    print("OS em aberto:", one("SELECT COUNT(*) FROM documentos WHERE tipo='os' AND status='Aberta'"))
    print("Orçamentos abertos:", one("SELECT COUNT(*) FROM documentos WHERE tipo='orcamento' AND status='Aberto'"))
    print("Ticket médio:", round(one("SELECT COALESCE(AVG(total),0) FROM documentos WHERE tipo='os' AND total>0"), 2))
    print("Faturamento por mês:")
    for r in con.execute("SELECT substr(data_abertura,1,7) m, ROUND(SUM(total),2) FROM documentos WHERE tipo='os' GROUP BY m ORDER BY m"):
        print("  ", r[0], r[1])

    if fazer_backup:
        dest = os.path.join(os.path.expanduser("~"), "Desktop", "Amauri",
                            f"ClickOS-demo-{now.strftime('%Y%m%d')}.db")
        shutil.copy2(str(paths.db_path()), dest)
        print("Backup de demonstração:", dest)
    con.close()


if __name__ == "__main__":
    main("--backup" in sys.argv)
