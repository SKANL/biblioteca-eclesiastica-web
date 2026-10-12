import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBookPatch } from "../../lib/editor.ts";

const form = (o) => new Map(Object.entries(o));

test("parseBookPatch trims, clears empty optional fields and splits temas", () => {
  const { errors, patch } = parseBookPatch(
    form({ titulo: " Confesiones ", autor: "", anio_publicacion: "397", temas: " gracia, , fe ", idioma: "es" }),
  );
  assert.deepEqual(errors, {});
  assert.deepEqual(patch, { titulo: "Confesiones", autor: null, anio_publicacion: 397, temas: ["gracia", "fe"], idioma: "es" });
});

test("parseBookPatch only sends fields present in the form and validates", () => {
  assert.deepEqual(parseBookPatch(form({ genero: "Teología" })).patch, { genero: "Teología" });
  assert.ok(parseBookPatch(form({ titulo: "  " })).errors.titulo);
  assert.ok(parseBookPatch(form({ anio_publicacion: "19a" })).errors.anio_publicacion);
  assert.ok(parseBookPatch(form({ anio_publicacion: "3001" })).errors.anio_publicacion);
  assert.ok(parseBookPatch(form({ idioma: "e" })).errors.idioma);
  assert.deepEqual(parseBookPatch(form({ anio_publicacion: "" })).patch, { anio_publicacion: null });
  assert.deepEqual(parseBookPatch(form({ desconocido: "x" })).patch, {});
});
