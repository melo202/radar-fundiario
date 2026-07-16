# -*- coding: utf-8 -*-
"""Carrega a tabela `indices_mercado` com a série FipeZap de Goiânia (dado ABERTO da
FIPE, atualizado mensalmente). Referência ROTULADA: aparece no card e no documento
como contexto — nunca entra no cálculo do valor.

Estrutura medida no arquivo real (15/07/2026), aba "Goiânia":
  linha 4 = cabeçalho; dados a partir da linha 5; col A = AAAAMM;
  bloco VENDA (Total): col C índice · col H var. mensal · col M var. 12m · col R preço m².
Uso: DATABASE_URL=... python3 gerar-indices.py   (systemd: radar-indices.timer mensal)
Requer: python3-openpyxl (apt).
"""
import os
import sys
import urllib.request

URL = "https://downloads.fipe.org.br/indices/fipezap/fipezap-serieshistoricas.xlsx"
ARQ = "/opt/radar/data/fipezap.xlsx"
ABA = "Goiânia"
# posições (0-based) do bloco VENDA/Total, medidas no arquivo real
COL_VAR_MES, COL_VAR_12M, COL_PRECO_M2 = 7, 12, 17


def num(v):
    try:
        f = float(v)
        return f
    except (TypeError, ValueError):
        return None


def main():
    print(f"Baixando {URL} ...", flush=True)
    # o servidor da FIPE responde 403 ao User-Agent padrão do urllib (curl passa) —
    # identificar-se como navegador comum resolve
    req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) CorretorInteligente/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r, open(ARQ + ".tmp", "wb") as f:
        f.write(r.read())
    os.replace(ARQ + ".tmp", ARQ)

    import openpyxl
    ws = openpyxl.load_workbook(ARQ, read_only=True)[ABA]

    import psycopg2
    from psycopg2.extras import execute_values
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    linhas = []
    for row in ws.iter_rows(values_only=True):
        aaaamm = str(row[0] or "")
        if not (aaaamm.isdigit() and len(aaaamm) == 6):
            continue
        vm, v12, pm2 = num(row[COL_VAR_MES]), num(row[COL_VAR_12M]), num(row[COL_PRECO_M2])
        if vm is None and v12 is None and pm2 is None:
            continue  # meses "." (sem dado) ficam de fora
        linhas.append((f"{aaaamm[:4]}-{aaaamm[4:]}-01", vm, v12, pm2))
    execute_values(cur,
        """INSERT INTO indices_mercado (fonte, cidade, operacao, referencia, variacao_mensal, variacao_12m, preco_m2_medio)
           VALUES %s
           ON CONFLICT (fonte, cidade, operacao, referencia) DO UPDATE
           SET variacao_mensal=EXCLUDED.variacao_mensal, variacao_12m=EXCLUDED.variacao_12m,
               preco_m2_medio=EXCLUDED.preco_m2_medio, coletado_em=now()""",
        linhas, template="('fipezap','Goiânia','venda',%s,%s,%s,%s)", page_size=500)
    conn.commit()
    cur.execute("SELECT referencia, variacao_mensal, variacao_12m, preco_m2_medio FROM indices_mercado WHERE fonte='fipezap' ORDER BY referencia DESC LIMIT 1")
    print(f"OK: {len(linhas)} meses carregados; mais recente: {cur.fetchone()}")
    conn.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"FALHA: {e}", file=sys.stderr)
        sys.exit(1)
