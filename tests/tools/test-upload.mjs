import { test } from "node:test";
import assert from "node:assert/strict";
import {
  apiErrorMessage,
  backoffDelay,
  isTerminal,
  moveItem,
  nextPollDelay,
  sha256Hex,
  shouldRetry,
  validateMetadata,
} from "../../lib/upload.ts";

test("sha256Hex hashes a Blob like the API expects (lowercase hex)", async () => {
  assert.equal(
    await sha256Hex(new Blob(["abc"])),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("moveItem reorders without mutating and ignores out-of-range moves", () => {
  const src = ["a", "b", "c"];
  assert.deepEqual(moveItem(src, 0, 1), ["b", "a", "c"]);
  assert.deepEqual(moveItem(src, 2, 1), ["a", "c", "b"]);
  assert.deepEqual(moveItem(src, 0, -1), src);
  assert.deepEqual(moveItem(src, 2, 3), src);
  assert.deepEqual(src, ["a", "b", "c"]);
});

test("validateMetadata requires titulo, checks anio and trims", () => {
  assert.deepEqual(validateMetadata({ titulo: "  ", autor: "", genero: "", anio: "" }).errors, {
    titulo: "El título es obligatorio.",
  });
  assert.ok(validateMetadata({ titulo: "X", anio: "19a5" }).errors.anio);
  assert.ok(validateMetadata({ titulo: "X", anio: "3000" }).errors.anio);
  const ok = validateMetadata({ titulo: " Confesiones ", autor: " Agustín ", genero: "", anio: "397" });
  assert.deepEqual(ok.errors, {});
  assert.deepEqual(ok.metadatos, { titulo: "Confesiones", autor: "Agustín", anio_publicacion: 397 });
});

test("retry only network failures and 5xx; backoff grows, is capped and jittered", () => {
  assert.equal(shouldRetry(0), true);
  assert.equal(shouldRetry(503), true);
  assert.equal(shouldRetry(403), false);
  assert.equal(shouldRetry(200), false);
  assert.equal(backoffDelay(0, () => 0), 500);
  assert.equal(backoffDelay(2, () => 0), 2000);
  assert.equal(backoffDelay(2, () => 0.999) < 4000, true);
  assert.equal(backoffDelay(20, () => 0), 8000);
});

test("polling delay doubles from 1s to a 10s cap; terminal states stop it", () => {
  assert.equal(nextPollDelay(undefined), 1000);
  assert.equal(nextPollDelay(1000), 2000);
  assert.equal(nextPollDelay(8000), 10000);
  assert.equal(nextPollDelay(10000), 10000);
  assert.equal(isTerminal("completado"), true);
  assert.equal(isTerminal("fallido"), true);
  assert.equal(isTerminal("procesando"), false);
});

test("API errors map to Spanish messages", () => {
  assert.match(apiErrorMessage(401), /sesión/i);
  assert.match(apiErrorMessage(403), /editor/i);
  assert.equal(apiErrorMessage(413, "Archivo grande."), "Archivo grande.");
  assert.equal(apiErrorMessage(422, "Tipo no soportado."), "Tipo no soportado.");
  assert.match(apiErrorMessage(429, null, "30"), /30 s/);
  assert.match(apiErrorMessage(501), /almacenamiento/i);
  assert.match(apiErrorMessage(500), /500/);
});
