/* Service worker do Radar Fundiário.
   Estratégia: NETWORK-FIRST para o app e os dados (HTML, caixa-goiania.js,
   manifest) — o cache é só fallback offline, nunca congela versão.
   CACHE-FIRST apenas para bibliotecas de CDN e ícones (imutáveis), e para
   os assets estáticos versionados (bairros-goiania.json e, desde a Fase 7,
   logradouros-goiania.json — dataset CNEFE destilado para autocomplete de
   logradouro): o bump de CACHE abaixo é o que invalida a cópia antiga.
   Consultas ao ArcGIS (JSONP) e tiles do mapa (CARTO e, desde a Fase 4, os
   tiles de satélite/reference do Esri) NÃO passam por aqui: sempre rede,
   nunca cache — dado vivo, e tiles de satélite são pesados demais para
   inchar o storage do PWA. */
const CACHE = "radar-v9";
/* CORE precisa existir para a aplicação abrir. Dados auxiliares são best-effort: a ausência
   temporária de um JSON não pode abortar a instalação inteira do PWA. O app já trata degradação
   das camadas opcionais e volta a buscá-las na rede quando disponíveis. */
const CORE = [
  "./",
  "./radar-goiania.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];
const OPTIONAL = [
  "./caixa-goiania.js",
  "./bairros-goiania.json",
  "./logradouros-goiania.json",
  "./bairro-cdbairro.json"
];
const CDN = [
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.11.0/proj4.js"
];
const NETWORK_FIRST = /(\/$|\.html$|caixa-goiania\.js$|manifest\.json$)/;

self.addEventListener("install", e => {
  /* CORE é obrigatório. Dados auxiliares e CDN são best-effort: um único 404 não inutiliza o PWA. */
  e.waitUntil(caches.open(CACHE).then(c =>
    c.addAll(CORE).then(() => Promise.allSettled([
      ...OPTIONAL.map(u => fetch(u).then(r => {
        if(!r.ok)throw new Error("asset opcional indisponível: "+u);
        return c.put(u,r);
      })),
      ...CDN.map(u => fetch(u).then(r => {
        if(!r.ok)throw new Error("CDN indisponível: "+u);
        return c.put(u,r);
      }))
    ]))
  ).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === location.origin;
  const cdn = url.hostname === "cdnjs.cloudflare.com";
  if (!sameOrigin && !cdn) return; // consultas e tiles: sempre rede, sem cache

  const putCache = r => {
    if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  };

  if (sameOrigin && (e.request.mode === "navigate" || NETWORK_FIRST.test(url.pathname))) {
    const isNav = e.request.mode === "navigate";
    /* A-07 (20): no fallback de navegação, ignoreSearch — deep-link ?insc=… casa a cópia cacheada
       de ./radar-goiania.html (sem querystring) em vez de dar miss e cair pra rede offline. */
    const fallback = () => caches.match(e.request, isNav ? { ignoreSearch: true } : undefined);
    const net = fetch(e.request).then(putCache); // putCache continua em background mesmo se o cache vencer o race
    if (isNav) {
      /* D-10 (20): navegação corre a rede contra um timeout ~4s; estourou -> serve o cache (net
         segue em background). Se a rede falhar antes disso, cai no cache imediatamente. */
      const timeout = new Promise(res => setTimeout(res, 4000, "__t"));
      e.respondWith(
        Promise.race([net.catch(() => "__t"), timeout])
          .then(r => r === "__t" ? fallback().then(hit => hit || net) : r)
      );
    } else {
      e.respondWith(net.catch(() => fallback()));
    }
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(putCache)));
});
