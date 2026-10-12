import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

// Load the classic worker script in a sandbox; top-level functions become globals.
const handlers = {};
const sw = vm.createContext({
  self: { location: { origin: "https://web.example" }, addEventListener: (t, f) => (handlers[t] = f) },
  URL,
});
vm.runInContext(fs.readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8"), sw);

const req = (url, o = {}) => ({ url, method: "GET", mode: "cors", destination: "", headers: new Headers(), ...o });

test("routing: HTML navigations network-first, private routes and writes untouched", () => {
  assert.equal(sw.strategyFor(req("https://web.example/libro/a/pagina/2", { mode: "navigate" })), "page");
  assert.equal(sw.strategyFor(req("https://web.example/editor/libros", { mode: "navigate" })), null);
  assert.equal(sw.strategyFor(req("https://web.example/api/auth/session")), null);
  assert.equal(sw.strategyFor(req("https://web.example/buscar", { method: "POST", mode: "navigate" })), null);
  const rsc = req("https://web.example/buscar?q=fe", { headers: new Headers({ RSC: "1" }) });
  assert.equal(sw.strategyFor(rsc), null);
});

test("routing: static assets stale-while-revalidate, remote page images cache-first", () => {
  assert.equal(sw.strategyFor(req("https://web.example/_next/static/chunks/a.js")), "static");
  assert.equal(sw.strategyFor(req("https://web.example/icon-192.png", { destination: "image" })), "static");
  assert.equal(sw.strategyFor(req("https://api.example/media/x/1.png", { destination: "image" })), "image");
  assert.equal(sw.strategyFor(req("https://api.example/api/v1/search?q=x")), null);
});

test("image cache key drops the signature query; trim keeps the newest N", async () => {
  assert.equal(sw.imageKey("https://r2.example/b/1.png?X-Amz-Signature=abc"), "https://r2.example/b/1.png");
  const keys = Array.from({ length: 65 }, (_, i) => ({ url: String(i) }));
  const cache = { keys: async () => [...keys], delete: async (k) => keys.splice(keys.indexOf(k), 1) };
  await sw.trimCache(cache, 60);
  assert.equal(keys.length, 60);
  assert.equal(keys[0].url, "5");
});

test("activate keeps only the current version's caches", () => {
  assert.ok(handlers.install && handlers.activate && handlers.fetch);
  assert.ok(sw.CURRENT.every((name) => name.startsWith(`bve-${sw.VERSION}-`)));
});
