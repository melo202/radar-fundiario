# UI-SPEC — Phase 7 (Tuning da Malha de Bairros no mobile)

**Escopo UI desta fase:** só o refinamento visual da malha de bairros (MALHA-01). Nomes/CNEFE são dados (sem UI). Reusa a identidade e as constantes já existentes — zero hex novo. Choropleth (cor por valor) é Fase 9, NÃO aqui.

## Contrato — camada de bairros (`BAI_STYLE` / `BAI_HOVER`, hex já resolvido na Fase 3)

| Estado | Stroke (color) | weight | opacity (linha) | fill | Observação |
|--------|----------------|--------|-----------------|------|------------|
| Idle (ocioso) | `_BAI_LINE` (#c3b9a3) | fino (~0.5–1) | baixa (~0.35–0.5) | `_BAI_LINE` fillOpacity ~0.02 (near-transparent, mas clicável) | "sussurra": contexto, não conteúdo |
| Hover/1º-toque (highlight) | `_BAI_ACCENT` (#b5451f) | ~2.5 | 1 | fillOpacity ~0.08 | "grita": destaque claro vs idle + tooltip com o nome (corrigido) |

- **Contraste idle↔highlight** deve ser nítido (o idle atual competia demais). Idle bem mais fraco que hoje; highlight mantém/reforça o accent.
- **Densidade por zoom** (`zoomend`): idle `weight`/`opacity` sobem suavemente com o zoom (ex.: weight 0.5 em z≤12 → ~1.2 perto de z16), calmo na cidade, detalhado ao aproximar. Bairros continuam sumindo em z≥17 (dão lugar aos lotes — Fase 3).
- **Toque na ÁREA**: o `fill` (mesmo near-transparent) garante que tocar dentro do bairro seleciona — não exigir acertar a linha fina. Confirmar `bubblingMouseEvents:false` e que o handler está no polígono inteiro.
- **Nome no tooltip**: agora vem do `nm_bai` corrigido (pós-reconciliação); glebas → "Gleba não denominada".

## Acessibilidade / motion
- Sem `transition:` novo aqui (motion é Fase 6/coordenado); mudanças de estilo via `setStyle` (snap), como o resto.
- Preservar AA e o padrão hover(desktop)/tap(mobile) de função única já existente (Fase 3).

## Fora de escopo
- Choropleth / cor por R$/m² (Fase 9). Satélite (já existe). Busca (Fase 8).

## Verificação (preview, mobile 375 + desktop)
- Idle discreto (malha não "emaranha"); toque num bairro realça forte + mostra o nome correto; densidade de linha cresce ao dar zoom; tocar no meio do bairro (não na linha) seleciona; sem erro de console.
