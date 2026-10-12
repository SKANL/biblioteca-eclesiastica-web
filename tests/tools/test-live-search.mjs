import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { createDebouncer, liveSearchHref } from "../../lib/live-search.ts";

test("liveSearchHref sets q, keeps other params, resets pagina", () => {
  assert.equal(
    liveSearchHref("/buscar", "?q=old&genero=Teolog%C3%ADa&autor=Ana&pagina=3", " gracia "),
    "/buscar?q=gracia&genero=Teolog%C3%ADa&autor=Ana",
  );
});

test("liveSearchHref: blank or 1-char input clears q / is ignored", () => {
  assert.equal(liveSearchHref("/buscar", "?q=old&genero=x", "  "), "/buscar?genero=x");
  assert.equal(liveSearchHref("/buscar", "?q=old", ""), "/buscar");
  assert.equal(liveSearchHref("/buscar", "?q=old", "a"), null);
});

test("debouncer fires once with the last value after the delay", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const calls = [];
  const d = createDebouncer((v) => calls.push(v), 300);
  d.call("g"); mock.timers.tick(200);
  d.call("gr"); mock.timers.tick(200);
  d.call("gra"); mock.timers.tick(299);
  assert.deepEqual(calls, []);
  mock.timers.tick(1);
  assert.deepEqual(calls, ["gra"]);
  d.call("x"); d.cancel(); mock.timers.tick(1000);
  assert.deepEqual(calls, ["gra"]);
  mock.timers.reset();
});
