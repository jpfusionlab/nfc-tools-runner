// Keeps a copy of the runner page on the phone so tags still work offline or when the site is down.
// Online, the newest page is used (and saved). Offline or after 4 seconds without an answer, the saved copy is used.
var KEY = new URL("run.html", self.registration.scope).href;
var CACHE = "runner-page";

self.addEventListener("install", function (e) {
  self.skipWaiting();
  // Save the page right away so the very next tap works with no internet.
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.add(KEY); }).catch(function () {}));
});
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener("fetch", function (e) {
  var req = e.request;
  // Customer pictures (docs/img): show the saved copy first, refresh it in the background, so they appear offline too.
  var ru = new URL(req.url);
  if (req.destination === "image" && ru.origin === self.location.origin && ru.pathname.indexOf("/img/") >= 0) {
    e.respondWith(caches.open("runner-img").then(async function (c) {
      var hit = await c.match(req);
      var net = fetch(req).then(function (r) { if (r && r.ok) c.put(req, r.clone()); return r; })
        .catch(function () { return hit || Response.error(); });
      return hit || net;
    }));
    return;
  }
  if (req.mode !== "navigate") return;
  if (new URL(req.url).pathname !== new URL(KEY).pathname) return;
  e.respondWith((async function () {
    try {
      var ctl = new AbortController();
      var t = setTimeout(function () { ctl.abort(); }, 4000);
      var res = await fetch(req, { signal: ctl.signal });
      clearTimeout(t);
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { return c.put(KEY, copy); });
        return res;
      }
    } catch (err) { /* fall through to the saved copy */ }
    var saved = await caches.match(KEY);
    return saved || fetch(req);
  })());
});
