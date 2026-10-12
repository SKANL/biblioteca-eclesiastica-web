/*
 * Hand-written service worker (registered in production by components/ServiceWorker.tsx).
 * - HTML navigations: network-first, cached copy or /offline when the network fails.
 * - /_next/static and icons: stale-while-revalidate.
 * - Page images from the API/R2 origin: cache-first, capped (LRU-ish).
 * - Never touched: non-GET (Server Actions), /api/*, /editor*, RSC payloads.
 * Bump VERSION to drop every old cache on activate.
 */
var VERSION = "v1";
var SHELL = "bve-" + VERSION + "-shell";
var PAGES = "bve-" + VERSION + "-pages";
var STATIC = "bve-" + VERSION + "-static";
var IMAGES = "bve-" + VERSION + "-images";
var CURRENT = [SHELL, PAGES, STATIC, IMAGES];
var OFFLINE = "/offline";
var MAX_PAGES = 60;
var MAX_IMAGES = 60;

/** "page" | "static" | "image" | null (null = let the browser handle it). */
function strategyFor(request) {
  if (request.method !== "GET") return null;
  var url = new URL(request.url);
  var sameOrigin = url.origin === self.location.origin;
  if (sameOrigin && (url.pathname.startsWith("/api/") || url.pathname.startsWith("/editor"))) return null;
  if (request.headers.get("RSC")) return null; // client navigation payloads
  if (request.mode === "navigate") return sameOrigin ? "page" : null;
  if (sameOrigin && (url.pathname.startsWith("/_next/static/") || /^\/(icon|apple-icon)[^/]*\.png$/.test(url.pathname) ||
    url.pathname === "/manifest.webmanifest")) return "static";
  if (!sameOrigin && request.destination === "image") return "image";
  return null;
}

/** Signed R2/S3 URLs change on every request: key images by origin + path. */
function imageKey(href) {
  var url = new URL(href);
  return url.origin + url.pathname;
}

/** Delete the oldest entries (Cache keys keep insertion order) beyond `max`. */
async function trimCache(cache, max) {
  var keys = await cache.keys();
  for (var i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function networkFirstPage(request) {
  var cache = await caches.open(PAGES);
  try {
    var response = await fetch(request);
    if (response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
      await trimCache(cache, MAX_PAGES);
    }
    return response;
  } catch {
    return (await caches.match(request)) || (await caches.match(OFFLINE)) || Response.error();
  }
}

async function staleWhileRevalidate(event) {
  var cache = await caches.open(STATIC);
  var cached = await cache.match(event.request);
  var refresh = fetch(event.request).then(function (response) {
    if (response.ok) return cache.put(event.request, response.clone()).then(function () { return response; });
    return response;
  });
  if (cached) {
    event.waitUntil(refresh.catch(function () {}));
    return cached;
  }
  return refresh;
}

async function cacheFirstImage(event) {
  var key = imageKey(event.request.url);
  var cache = await caches.open(IMAGES);
  var cached = await cache.match(key);
  var refresh = function () {
    return fetch(event.request).then(async function (response) {
      // Cross-origin <img> without CORS is opaque (status unknown): stored, but refreshed on every hit.
      if (response.ok || response.type === "opaque") {
        await cache.put(key, response.clone());
        await trimCache(cache, MAX_IMAGES);
      }
      return response;
    });
  };
  if (!cached) return refresh();
  if (cached.type === "opaque") {
    event.waitUntil(refresh().catch(function () {}));
  } else {
    // Re-insert so recently viewed pages are evicted last.
    event.waitUntil(cache.delete(key).then(function () { return cache.put(key, cached.clone()); }));
  }
  return cached;
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL).then(function (cache) {
      return cache.addAll([OFFLINE, "/manifest.webmanifest", "/icon-192.png"]).then(function () {
        return cache.add("/").catch(function () {}); // best effort: the home needs the API
      });
    }).then(function () { return self.skipWaiting(); }),
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.filter(function (name) {
        return name.startsWith("bve-") && CURRENT.indexOf(name) < 0;
      }).map(function (name) { return caches.delete(name); }));
    }).then(function () { return self.clients.claim(); }),
  );
});

self.addEventListener("fetch", function (event) {
  var strategy = strategyFor(event.request);
  if (strategy === "page") event.respondWith(networkFirstPage(event.request));
  else if (strategy === "static") event.respondWith(staleWhileRevalidate(event));
  else if (strategy === "image") event.respondWith(cacheFirstImage(event));
});
