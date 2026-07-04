/* Service worker do Radar Fundiário.
   Estratégia: NETWORK-FIRST para o app e os dados (HTML, caixa-goiania.js,
   manifest) — o cache é só fallback offline, nunca congela versão.
   CACHE-FIRST apenas para bibliotecas de CDN e ícones (imutáveis).
   Consultas ao ArcGIS (JSONP) e tiles do mapa NÃO passam por aqui: dado vivo. */
const CACHE = "radar-v4";
const LOCAL = [
  "./",
  "./radar-goiania.html",
  "./caixa-goiania.js",
  "./bairros-goiania.json",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];
const CDN = [
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.11.0/proj4.js"
];
const NETWORK_FIRST = /(\/$|\.html$|caixa-goiania\.js$|manifest\.json$)/;

self.addEventListener("install", e => {
  /* same-origin é obrigatório; CDN é best-effort (não deixa o install inteiro falhar se o cdnjs oscilar) */
  e.waitUntil(caches.open(CACHE).then(c =>
    c.addAll(LOCAL).then(() => Promise.allSettled(CDN.map(u => fetch(u).then(r => r.ok && c.put(u, r)))))
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
    e.respondWith(fetch(e.request).then(putCache).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(putCache)));
});
