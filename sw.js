/* Service Worker: macht die Urlaubsplanung offline nutzbar.
   App-Dateien werden zwischengespeichert; Daten kommen verschlüsselt von GitHub
   (die API wird nie zwischengespeichert). Bei Änderungen an der App: VERSION erhöhen. */
const VERSION = "urlaub-v3";
const SHELL = ["./", "index.html", "css/style.css", "js/sync.js", "js/app.js", "js/urlaub.js", "js/karte.js", "data/packliste.js", "data/rezepte.js", "manifest.webmanifest", "icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname === "api.github.com") return; // Daten nie cachen
  const sameOrigin = url.origin === self.location.origin;
  const cdn = /fonts\.(googleapis|gstatic)\.com$|cdnjs\.cloudflare\.com$/.test(url.hostname);
  if (!sameOrigin && !cdn) return;
  if (sameOrigin) {
    // erst Netz (für Updates), sonst Cache
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("index.html"))));
  } else {
    // Schriften & Excel-Bibliothek: Cache zuerst
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res;
    })));
  }
});
