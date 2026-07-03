# Radar Fundiário · Goiânia

**App no ar:** https://melo202.github.io/radar-fundiario/

Localizador de imóveis de Goiânia por **quadra+lote**, endereço, inscrição ou clique no mapa, sobre a camada pública de Cadastro Imobiliário da Prefeitura (ArcGIS). Além da busca, entrega:

- **Lotes desenhados** no mapa (zoom próximo) com identificação ao passar o mouse / tocar.
- **Análise de vizinhança**: faixa de preços por R$/m² dos comparáveis (mediana, quartis, sem outliers).
- **Estimativa de mercado** por bairro (tabela pública FipeZap com fator oferta 0,90 da NBR 14653-2; laudos da Caixa como reforço).
- **Oportunidades Caixa**: imóveis do banco à venda em Goiânia, plotados no mapa.
- **Laudo de avaliação (PTAM)** em PDF, gerado por um wizard passo a passo.
- **Titular** via CND da prefeitura (pré-preenchida) e exportação em **CSV**.

Sem IA embutida — toda a "inteligência" é estatística determinística sobre dados públicos.

## Rodar localmente

O app é um arquivo único; abra o [radar-goiania.html](radar-goiania.html) com dois cliques. Para testar o service worker (PWA/offline), sirva por HTTP:

```
python -m http.server 8137
# abra http://localhost:8137/radar-goiania.html
```

## Atualizar os imóveis da Caixa

A lista muda diariamente. Gere o arquivo de dados quando quiser:

```
python atualizar-caixa.py
```

## Publicar (GitHub Pages)

Deploy automático pelo GitHub Actions — ver [PUBLICAR.md](PUBLICAR.md). Cada `git push` no `master` republica o site.

## Arquitetura (por que arquivo único + JSONP)

O endpoint do ArcGIS da Prefeitura **não envia CORS**, então `fetch` do navegador é bloqueado. A saída é **JSONP** (`<script src>`), que funciona de qualquer origem — inclusive abrindo o HTML como arquivo local. Isso torna o app um único HTML sem build, com os dados da Caixa num `caixa-goiania.js` à parte (gerado pelo script Python) e o service worker para uso offline.

## Documentação interna

`PROJETO-radar.md` (briefing), `ROADMAP-radar.md` (roadmap), `INTELIGENCIA-radar.md` (fontes de dados), `AUDITORIA-2026-07-03.md` (auditoria em 10 lentes). Não são publicados no site.

---
Dados de imóvel são públicos; o app não coleta nome de titular (consulta manual na CND oficial). Valores de referência são estimativas, não avaliação oficial. Código para uso próprio.
