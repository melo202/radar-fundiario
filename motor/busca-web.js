/* Fonte A (decisão de 15/07/2026, MOTOR-PRECO.md §C): pesquisa sobre conteúdo PÚBLICO
   INDEXADO via Brave Search API. O que entra no funil é o que o buscador já indexou e
   expõe publicamente (título + descrição + URL) — não fazemos scraping dos portais.
   Tier gratuito: 1 req/s, ~2000/mês — quem chama pagina com parcimônia. */
export async function buscarWeb(consulta, { count = 20, offset = 0 } = {}) {
  if (!process.env.BRAVE_API_KEY) throw new Error("BRAVE_API_KEY ausente no env");
  const u = new URL("https://api.search.brave.com/res/v1/web/search");
  u.searchParams.set("q", consulta);
  u.searchParams.set("count", String(Math.min(count, 20)));
  u.searchParams.set("offset", String(offset));
  u.searchParams.set("country", "BR");
  u.searchParams.set("search_lang", "pt-br");
  const r = await fetch(u, {
    headers: { "X-Subscription-Token": process.env.BRAVE_API_KEY, Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`brave http ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return (d.web?.results || [])
    .filter(x => x.url && (x.description || x.title))
    .map(x => ({
      url: x.url,
      titulo: x.title || "",
      descricao: x.description || "",
      portal: new URL(x.url).hostname.replace(/^www\./, ""),
    }));
}
