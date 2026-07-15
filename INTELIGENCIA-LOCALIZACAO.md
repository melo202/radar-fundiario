# Inteligência de Localização — Exploração + Parecer (Fase 0)

> Registrado em 15/07/2026 a partir da especificação do usuário ("Exploração Técnica de
> Inteligência de Localização"). Contém (A) o resumo fiel do plano, (B) o parecer técnico
> com a PROVA DE COBERTURA já executada em Goiânia, e (C) o MVP recomendado adaptado aos
> ativos que o projeto já tem. Nada de integração definitiva foi feita — como a spec manda.

## A. O plano, em essência

Módulo que recebe a coordenada de um imóvel e mede o entorno com DADOS OBJETIVOS
(contagens e distâncias por categoria: conveniência, educação/saúde, mobilidade, qualidade
urbana, externalidades negativas), em faixas de raio POR CATEGORIA (padaria ≠ hospital ≠
aeroporto). **Princípio idêntico ao do motor de preço: a IA nunca inventa se a localização
é boa — só explica números coletados.** Índice multidimensional configurável por tipo de
imóvel (família ≠ comercial ≠ galpão), com confiança dos dados declarada. Impacto no valor
NUNCA por regra arbitrária ("parque = +5%") — só por correlação medida nos comparáveis com
modelo explicável, quando houver base. Análise visual de rua (arborização, calçada,
fiação) sempre com fonte/data/confiança; proibido inferir segurança ou perfil dos
moradores pela aparência. Arquitetura por interfaces (POIProvider/RoutingProvider/
StreetImageryProvider) para nunca acoplar a uma fonte única.

## B. Parecer técnico + prova de cobertura (executada em 15/07/2026)

**A ideia é excelente e encaixa no projeto como luva** — três razões:
1. **Já temos metade da infraestrutura**: PostGIS no VPS (raio/distância nativos), a cadeia
   de IA com guard-rails, o padrão peneira→score→explicação do motor, o dossiê Território
   no app (lugar natural da UI §13) e o CNEFE (endereços com coordenada).
2. **Alimenta o §7 do motor de preço** (microrregiões/pontuação de localização dos
   comparáveis) — as `locationMetrics` viram variáveis do peso de comparabilidade.
3. **Zero custo no Cenário A** (aberto), que é o certo para começar.

**Prova de cobertura OSM (Overpass, raio 1 km, 15/07/2026):**

| Região | Resultado | Leitura |
|---|---|---|
| Setor Bueno | 7 supermercados | cobertura densa ✓ |
| Parque Amazônia | 4 super, 3 escolas, 3 farmácias, 5 parques (13/15 com nome) | cobertura boa e nomeada ✓ |
| Vera Cruz (periferia) | 1 POI, sem nome | **cobertura fraca — confirma a suspeita da spec** |
| Jd. Goiás / Marista | timeout no servidor público | ver achado abaixo |

**Achados operacionais decisivos:**
- `overpass-api.de` funciona mas **congestiona** (timeouts frequentes em horário de pico);
- o espelho `overpass.kumi.systems` **devolveu vazio em silêncio** para consultas válidas —
  um "zero falso" que, sem contraprova, viraria "não há nada perto" no laudo. É exatamente o
  risco que a spec teme (§19: "não inventar dados ausentes" inclui não inventar AUSÊNCIA).
- Conclusão: **Overpass público é inadequado para produção.** O caminho certo é baixar o
  extrato de Goiás (Geofabrik, ~100 MB, atualizado semanalmente, licença ODbL com
  atribuição) e consultar LOCALMENTE no VPS — sem rate limit, sem timeout, dados
  versionados com data, e o PostGIS que já temos faz raio/vizinho-mais-próximo nativos.

**Sobre as demais fontes (avaliação preliminar, aprofundar na Fase 1 do módulo):**
- **Google Places**: qualidade máxima, mas custa por requisição, PROÍBE armazenamento
  prolongado e exige atribuição — só faz sentido como validação amostral do OSM, nunca como
  fonte primária armazenada. Scraping de Google Maps: fora, como a spec já veta.
- **OSRM** roda no VPS (perfil foot+car de Goiás cabe em RAM) → tempo caminhando/carro
  reais. Segunda etapa do MVP.
- **Mapillary/KartaView em Goiânia**: cobertura historicamente irregular — medir de verdade
  antes de prometer análise visual; Street View tem metadados baratos mas imagem paga e
  restrições de armazenamento. Análise visual fica para fase posterior, sob demanda.
- **Dados públicos**: IBGE/CNEFE (já no repo), zoneamento (já integrado via ArcGIS da
  prefeitura!), escolas/saúde públicas (INEP/CNES têm CSVs nacionais com coordenadas — boa
  correção para a periferia onde o OSM falha).

**Riscos a respeitar:** ODbL exige atribuição "© OpenStreetMap contributors" no app e no
laudo; dados derivados de OSM herdam share-alike quando redistribuídos como banco; nunca
misturar dado armazenado de Google com o banco aberto.

## C. MVP recomendado (Cenário A adaptado — custo ~zero) — **ENTREGUE em 15/07/2026**

**Passos 1–5 no ar:** `gerar-pois.py` carregou **6.734 POIs** do extrato Geofabrik de
15/07 (recarga mensal via `radar-pois.timer`); `GET /motor/localizacao` público com raio
por categoria, cache e `dataQuality` honesto; card "Localização — entorno mapeado (beta)"
no Território com skeleton, pontos de atenção separados e atribuição ODbL. Aceite nas 5
regiões da spec: Bueno 211 POIs (supermercado a 100 m), Marista 232, Jd. Goiás 108,
Pq. Amazônia 63, Vera Cruz 14 — e a lição de honestidade aprendida no próprio aceite: a
confiança de cobertura passou a contar só amenidades ESSENCIAIS (ônibus/indústria
inflavam a periferia para "alta"). Falta do MVP: resumo curto por IA (passo 6 — entra no
pipeline do parecer §17) e, depois, OSRM/INEP/CNES/correlação com comparáveis (§10).

1. **`gerar-pois.py`** (padrão dos gerar-*.py): baixa o PBF de Goiás da Geofabrik, filtra as
   ~20 categorias internas (mapa tag OSM → `LocationCategory` próprio, §7 da spec), grava
   tabela `pois` no PostGIS com data do extrato. Atualização mensal via timer (como a
   varredura).
2. **`motor/localizacao.js`**: recebe {lat, lon}, consulta o PostGIS por categoria com RAIO
   POR CATEGORIA (§8), devolve o JSON objetivo da spec (§6) com `dataQuality` honesto
   (periferia → coverageConfidence "low" pelo próprio density check).
3. **Endpoint `GET /motor/localizacao?lat&lon`** público com rate limit + cache (mesma
   receita do /motor/avaliar).
4. **Card "Localização" no Território** do app (padrão do card Mercado): contagens e
   distâncias com fonte+data; SEM nota geral na v1 (o índice §9 só entra quando os pesos
   forem configuráveis e explicados).
5. **IA explica por último** (mesmo pipeline do parecer §17: placeholders para números).
6. Depois: OSRM (tempos reais), INEP/CNES (corrigir periferia), locationMetrics nos
   comparáveis do motor (§10 — hipóteses de correlação, nunca % chutado), imagens de rua.

**Critérios de aceite do MVP:** os da spec (§19) + dois nossos: prova de "zero falso"
(consulta em área sabidamente densa retornando vazio = erro, nunca resultado) e atribuição
ODbL visível onde o dado aparecer.
