// Garde le carnet disponible hors ligne après une première visite.
const CACHE = "carnet-go-v2";
const PRECACHE = [
  "index.html",
  "quete-1.html",
  "quete-2.html",
  "quete-3.html",
  "quete-4.html",
  "antiseche.html",
  "quiz-jury.html",
  "404.html",
  "manifest.webmanifest",
  "assets/css/style.css",
  "assets/js/data.js",
  "assets/js/app.js",
  "assets/favicon.svg",
  "assets/icon-180.png",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/verif/worker.js",
  "assets/verif/wasm_exec.js"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);
  // Seulement les fichiers du site (le vérificateur WebAssembly est mis en cache à sa première utilisation)
  if (req.method !== "GET" || url.origin !== location.origin) return;
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, {ignoreSearch: true})
        .then(hit => hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error())))
  );
});
