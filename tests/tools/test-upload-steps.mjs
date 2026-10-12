import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultTitle, minutesLeft, splitsIntoBooks, stepsFor } from "../../lib/upload-steps.ts";

const job = (etapa, extra = {}) => ({ etapa, progreso: null, libro_id: null, error: null, ...extra });
const states = (steps) => steps.map((s) => s.state).join(",");

test("defaultTitle drops the extension and turns _ and - into spaces", () => {
  assert.equal(defaultTitle("Suma_teologica-tomo-1.pdf"), "Suma teologica tomo 1");
  assert.equal(defaultTitle("  libro.final.txt"), "libro.final");
  assert.equal(defaultTitle("sin_extension"), "sin extension");
});

test("splitsIntoBooks: documents are one book each, images are one book", () => {
  assert.equal(splitsIntoBooks(["application/pdf", "text/plain"]), true);
  assert.equal(splitsIntoBooks(["image/jpeg", "image/png"]), false);
  assert.equal(splitsIntoBooks([]), false);
});

test("stepsFor: browser upload is the current step with its percent", () => {
  const steps = stepsFor(null, 0.42);
  assert.deepEqual(steps.map((s) => s.label), [
    "Subiendo archivo", "En espera", "Leyendo páginas", "Preparando la búsqueda", "Disponible para leer",
  ]);
  assert.equal(states(steps), "current,pending,pending,pending,pending");
  assert.equal(steps[0].detail, "42 %");
});

test("stepsFor maps each etapa to done/current/pending", () => {
  assert.equal(states(stepsFor(job("subiendo"))), "current,pending,pending,pending,pending");
  assert.equal(states(stepsFor(job("en_espera"))), "done,current,pending,pending,pending");
  const reading = stepsFor(job("leyendo_paginas", { progreso: { paginas_hechas: 12, paginas_total: 82 } }));
  assert.equal(states(reading), "done,done,current,pending,pending");
  assert.equal(reading[2].detail, "12 de 82");
  assert.equal(states(stepsFor(job("preparando_busqueda"))), "done,done,done,current,pending");
  assert.equal(states(stepsFor(job("disponible", { libro_id: "b1" }))), "done,done,done,done,done");
});

test("stepsFor marks the step that failed", () => {
  assert.equal(states(stepsFor(job("fallido"))), "done,done,failed,pending,pending");
  const late = job("fallido", { progreso: { paginas_hechas: 5, paginas_total: 5 } });
  assert.equal(states(stepsFor(late)), "done,done,done,failed,pending");
});

test("minutesLeft needs >=3 pages done and an observed rate", () => {
  const first = { at: 0, done: 0 };
  assert.equal(minutesLeft(first, { at: 60_000, done: 2, total: 82 }), null);
  assert.equal(minutesLeft(first, { at: 60_000, done: 4, total: 82 }), 20); // 4 pages/min, 78 left -> 19.5 -> 20
  assert.equal(minutesLeft(first, { at: 60_000, done: 82, total: 82 }), null);
  assert.equal(minutesLeft({ at: 0, done: 10 }, { at: 1000, done: 10, total: 82 }), null);
  assert.equal(minutesLeft(first, { at: 6_000, done: 3, total: 5 }), 1); // under a minute rounds up to 1
});
