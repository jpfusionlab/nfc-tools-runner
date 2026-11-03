// Keeps a copy of the runner page on the phone so tags still work offline or when the site is down.
// Online, the newest page is used (and saved). Offline or after 4 seconds without an answer, the saved copy is used.
var KEY = new URL("run.html", self.registration.scope).href;
var CACHE = "runner-page";

self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener("fetch", function (e) {
  var req = e.request;
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
