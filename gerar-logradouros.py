# -*- coding: utf-8 -*-
"""
Gera logradouros-goiania.json a partir do CNEFE 2022 (IBGE), destilando os
logradouros unicos de Goiania com dicas de localidade/CEP para autocomplete
offline (consumido pela Fase 8 — busca).

Uso:  python gerar-logradouros.py

Script de build OFFLINE (nunca roda no app). Refresh do CNEFE e OCASIONAL/
RARO (o Censo 2022 nao muda; um re-run so faz sentido se o IBGE republicar
o dataset ou se o app trocar de fonte). Etapas:

 1. Download do `52_GO.zip` (~120MB, ESTADO INTEIRO — nao existe download
    por-municipio, tem que filtrar localmente) via streaming para um arquivo
    temporario (NUNCA carrega em memoria de uma vez). Mesmo padrao de
    retry/backoff do `http()` de gerar-bairros.py/atualizar-caixa.py.
 2. Extrai + filtra + destila SEM materializar o CSV inteiro (671MB
    descompactado): abre o CSV de dentro do zip com `zipfile.ZipFile` +
    `io.TextIOWrapper` + `csv.DictReader`, processa linha-a-linha. Filtro
    obrigatorio: COD_MUNICIPIO=="5208707" (Goiania). Colunas lidas: SO
    NOM_TIPO_SEGLOGR, NOM_TITULO_SEGLOGR, NOM_SEGLOGR, DSC_LOCALIDADE, CEP —
    NUNCA nenhuma coluna pessoal/domiciliar (ex. responsavel, morador,
    dtnascimento) mesmo que existam no CSV. Parse defensivo: linha
    malformada e pulada (contabilizada), nunca aborta o processamento todo.
 3. Agrega por logradouro (tipo+nome normalizado), acumulando ate 5
    DSC_LOCALIDADE e ate 3 prefixos de CEP distintos por logradouro.
    Normalizacao: mesmo `norm()` do app (radar-goiania.html:1020, accent-
    strip NFD + upper + collapse espaco) + strip de espaco antes do sufixo
    alfanumerico final (drift de tokenizacao CNEFE "228 A" vs cadastro
    "228A" — DATA-NAMES.md 2.4).
 4. Escreve logradouros-goiania.json (lista de {nome, tipo, localidades,
    ceps}), ~9,8k entradas, ~117KB gz (variante "nomes + hints" recomendada
    em DATA-NAMES.md 2.3). Imprime contagem + tamanho gz pra conferencia.
 5. Limpa o zip/csv temporario (nunca deixa 120MB de lixo no repo/scratch).

NAO embute chave/segredo. NAO roda o download no runtime do app. NAO le/
grava nenhum campo pessoal/domiciliar.
"""
import csv, gzip, io, json, os, shutil, sys, tempfile, time, unicodedata, zipfile
import urllib.request, urllib.error

# ---------------------------------------------------------------------------
# Reaproveitado verbatim do padrao de gerar-bairros.py/atualizar-caixa.py —
# nao re-resolver backoff/erro; mesmo UA + retry 429/502/503 com Retry-After.
# ---------------------------------------------------------------------------
UA = {"User-Agent": "Mozilla/5.0 (RadarFundiario; uso pessoal; contato do dono do repo)"}

CNEFE_URL = (
    "https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/"
    "Censo_Demografico_2022/Arquivos_CNEFE/CSV/UF/52_GO.zip"
)
GOIANIA_COD_MUNICIPIO = "5208707"

OUT_PATH = "logradouros-goiania.json"
MAX_LOCALIDADES = 5
MAX_CEPS = 3
MAX_GZIP_KB = 200  # orcamento (T-07-08); alvo real ~117KB


def download_with_retry(url, dest_path, tries=5, timeout=180):
    """Baixa `url` via streaming (chunks) para `dest_path`, com retry/backoff
    exponencial (429/502/503 honrando Retry-After, igual ao `http()` de
    gerar-bairros.py). NUNCA materializa o corpo em memoria — grava direto
    em disco (arquivo de ~120MB). Timeout generoso (servidor do IBGE pode
    ser lento) — build-time only, paciencia e barata aqui."""
    delay = 2
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as resp, open(dest_path, "wb") as f:
                total = resp.headers.get("Content-Length")
                total = int(total) if total and total.isdigit() else None
                downloaded = 0
                chunk_size = 1024 * 1024  # 1MB
                last_pct = -1
                while True:
                    chunk = resp.read(chunk_size)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        pct = int(downloaded * 100 / total)
                        if pct != last_pct and pct % 10 == 0:
                            print(f"    download: {pct}% ({downloaded/1e6:.1f}MB / {total/1e6:.1f}MB)")
                            last_pct = pct
            return  # sucesso
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503):
                ra = e.headers.get("Retry-After")
                wait = int(ra) if ra and ra.isdigit() else delay
                if i + 1 == tries:
                    raise
                print(f"    HTTP {e.code} — retry em {wait}s ({i+1}/{tries})…")
                time.sleep(wait); delay *= 4
            elif 400 <= e.code < 500:
                raise
            else:
                if i + 1 == tries:
                    raise
                print(f"    HTTP {e.code} — retry em {delay}s ({i+1}/{tries})…")
                time.sleep(delay); delay *= 4
        except Exception as e:
            if i + 1 == tries:
                raise
            print(f"    erro de rede ({type(e).__name__}: {e}) — retry em {delay}s ({i+1}/{tries})…")
            time.sleep(delay); delay *= 4


def norm(s):
    """Mesmo `norm()` do app (radar-goiania.html:1020) — accent-strip (NFD)
    + uppercase + collapse de espacos. Usado pra chave de agregacao (nao
    fabrica nome novo, so normaliza o que vem do CNEFE)."""
    if not s:
        return ""
    stripped = "".join(
        c for c in unicodedata.normalize("NFD", s) if not unicodedata.combining(c)
    )
    return " ".join(stripped.upper().split())


def strip_suffix_space(s):
    """Normalizacao adicional (DATA-NAMES.md 2.4): remove o espaco entre o
    numero e o sufixo alfanumerico final — CNEFE escreve "228 A", o
    cadastro escreve "228A" (mesmo logradouro, tokenizacao diferente).
    So afeta o FINAL da string (ex. "RUA 228 A" -> "RUA 228A"); nao toca
    espacos em outras posicoes."""
    import re
    return re.sub(r"(\d)\s+([A-Z])$", r"\1\2", s)


def build_nome(tipo, titulo, nome):
    """Monta o nome do logradouro = NOM_TIPO_SEGLOGR + (opcional
    NOM_TITULO_SEGLOGR) + NOM_SEGLOGR, normalizado."""
    partes = [p for p in (tipo, titulo, nome) if p]
    bruto = " ".join(partes)
    return strip_suffix_space(norm(bruto))


def extract_and_distill(zip_path):
    """Abre o zip com streaming (zipfile + TextIOWrapper + DictReader),
    processa linha-a-linha SEM materializar o CSV (671MB) inteiro em
    memoria. Filtra COD_MUNICIPIO==GOIANIA_COD_MUNICIPIO. Le SO as colunas
    de logradouro/localidade/CEP — nunca campo pessoal/domiciliar. Parse
    defensivo: linha malformada e pulada (contabilizada), nunca aborta.

    Retorna (LOG, stats) onde LOG = {chave_normalizada: {"nome","tipo",
    "localidades": set, "ceps": set}}."""
    LOG = {}
    stats = {"total_lidas": 0, "goiania": 0, "malformadas": 0}

    with zipfile.ZipFile(zip_path) as zf:
        csv_names = [n for n in zf.namelist() if n.lower().endswith(".csv")]
        if not csv_names:
            raise SystemExit(f"ERRO: nenhum .csv encontrado dentro de {zip_path} — zip corrompido/inesperado?")
        csv_name = csv_names[0]
        print(f"    lendo {csv_name} de dentro do zip (streaming, sem materializar 671MB)…")

        with zf.open(csv_name, "r") as raw:
            # CNEFE vem em latin-1 (achado documentado no precedente
            # atualizar-caixa.py, que decodifica CSVs do governo em latin-1);
            # errors="replace" evita abortar em byte invalido isolado.
            text = io.TextIOWrapper(raw, encoding="latin-1", errors="replace", newline="")
            reader = csv.DictReader(text, delimiter=";")
            for row in reader:
                stats["total_lidas"] += 1
                try:
                    cod_mun = (row.get("COD_MUNICIPIO") or "").strip()
                    if cod_mun != GOIANIA_COD_MUNICIPIO:
                        continue
                    stats["goiania"] += 1

                    tipo = (row.get("NOM_TIPO_SEGLOGR") or "").strip()
                    titulo = (row.get("NOM_TITULO_SEGLOGR") or "").strip()
                    nome_seglogr = (row.get("NOM_SEGLOGR") or "").strip()
                    localidade = (row.get("DSC_LOCALIDADE") or "").strip()
                    cep = (row.get("CEP") or "").strip()

                    if not nome_seglogr:
                        continue  # sem nome de logradouro, nada a destilar

                    chave = build_nome(tipo, titulo, nome_seglogr)
                    if not chave:
                        continue

                    entry = LOG.get(chave)
                    if entry is None:
                        entry = {"nome": chave, "tipo": norm(tipo) if tipo else "", "localidades": set(), "ceps": set()}
                        LOG[chave] = entry

                    if localidade and len(entry["localidades"]) < MAX_LOCALIDADES:
                        loc_norm = norm(localidade)
                        if loc_norm:
                            entry["localidades"].add(loc_norm)

                    if cep and len(entry["ceps"]) < MAX_CEPS:
                        cep_digits = "".join(c for c in cep if c.isdigit())
                        if len(cep_digits) >= 5:
                            entry["ceps"].add(cep_digits[:5])  # prefixo (5 digitos, sem o sufixo -XXX)

                except Exception:
                    # parse defensivo: linha malformada nao aborta o build inteiro
                    stats["malformadas"] += 1
                    continue

                if stats["total_lidas"] % 2_000_000 == 0:
                    print(f"    progresso: {stats['total_lidas']:,} linhas lidas, {stats['goiania']:,} de Goiania, {len(LOG):,} logradouros unicos ate agora…")

    return LOG, stats


def to_serializable(LOG):
    """Converte sets em listas ordenadas (determinismo — mesmo dict produz
    sempre o mesmo JSON byte-a-byte, facilita diff/auditoria)."""
    out = []
    for chave in sorted(LOG.keys()):
        entry = LOG[chave]
        out.append({
            "nome": entry["nome"],
            "tipo": entry["tipo"],
            "localidades": sorted(entry["localidades"]),
            "ceps": sorted(entry["ceps"]),
        })
    return out


# termos pessoais/domiciliares que NUNCA devem aparecer no asset final —
# assert anti-PII (T-07-05); mesmo vocabulario do smoke check da Task 2.
_PII_TERMS = ("dtnasc", "cpf", "responsavel", "morador")


def assert_no_pii(data):
    blob = json.dumps(data, ensure_ascii=False).lower()
    achados = [t for t in _PII_TERMS if t in blob]
    if achados:
        raise SystemExit(
            f"ERRO anti-PII: termo(s) pessoal/domiciliar encontrado(s) no asset destilado: "
            f"{achados} — abortado sem gravar arquivo com possivel PII."
        )


def main():
    scratch_dir = tempfile.mkdtemp(prefix="cnefe_")
    zip_path = os.path.join(scratch_dir, "52_GO.zip")
    try:
        print("1/4 baixando 52_GO.zip do IBGE (~120MB, estado inteiro — filtro local)…")
        print(f"    URL: {CNEFE_URL}")
        print(f"    destino temporario (scratch, NAO na raiz do repo): {zip_path}")
        try:
            download_with_retry(CNEFE_URL, zip_path)
        except Exception as e:
            raise SystemExit(
                "ERRO: download do CNEFE (IBGE) falhou persistentemente apos retries — "
                f"{type(e).__name__}: {e}. URL tentada: {CNEFE_URL}. "
                "NAO gravando nenhum logradouros-goiania.json fabricado/placeholder. "
                "Tente novamente mais tarde (servidor do IBGE pode estar lento/instavel)."
            )
        tamanho_mb = os.path.getsize(zip_path) / 1e6
        print(f"    download completo: {tamanho_mb:.1f}MB em {zip_path}")

        print("2/4 filtrando Goiania (COD_MUNICIPIO=5208707) + destilando logradouros (streaming)…")
        LOG, stats = extract_and_distill(zip_path)
        print(
            f"    {stats['total_lidas']:,} linhas lidas no total, {stats['goiania']:,} de Goiania, "
            f"{stats['malformadas']:,} malformadas/puladas, {len(LOG):,} logradouros unicos destilados"
        )

        print("3/4 serializando + assert anti-PII…")
        data = to_serializable(LOG)
        assert_no_pii(data)

        raw_bytes = json.dumps(data, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        gz_kb = len(gzip.compress(raw_bytes)) / 1024
        with open(OUT_PATH, "wb") as f:
            f.write(raw_bytes)
        status = "OK" if gz_kb <= MAX_GZIP_KB else "AVISO: excede orcamento"
        print(f"    gravado {OUT_PATH}: {len(data):,} logradouros unicos, {gz_kb:.1f}KB gz — {status}")

        print("4/4 limpando temporario…")
    finally:
        shutil.rmtree(scratch_dir, ignore_errors=True)
        print(f"    scratch removido: {scratch_dir}")


if __name__ == "__main__":
    main()
