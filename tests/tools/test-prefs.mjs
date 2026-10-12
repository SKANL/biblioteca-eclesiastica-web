import { test } from "node:test";
import assert from "node:assert/strict";
import { readPref, stepScale, throttle, writePref } from "../../lib/prefs.ts";
import { motorLabel } from "../../lib/utils.ts";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
};
const broken = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("quota"); } };

test("prefs round-trip, reject unknown values and survive a throwing storage", () => {
  const s = memory();
  assert.equal(readPref("k", ["a", "b"], "a", s), "a");
  writePref("k", "b", s);
  assert.equal(readPref("k", ["a", "b"], "a", s), "b");
  s.setItem("k", "zzz");
  assert.equal(readPref("k", ["a", "b"], "a", s), "a");
  assert.equal(readPref("k", ["a", "b"], "a", broken), "a");
  assert.doesNotThrow(() => writePref("k", "a", broken));
  assert.equal(readPref("k", ["a"], "a", undefined), "a");
  s.setItem("p", "12");
  assert.equal(readPref("p", /^\d+$/, "", s), "12");
  s.setItem("p", "12x");
  assert.equal(readPref("p", /^\d+$/, "", s), "");
});

test("throttle writes at most once per interval, keeping the latest value", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const calls = [];
  const save = throttle((v) => calls.push(v), 1000);
  save(1);
  save(2);
  save(3);
  assert.deepEqual(calls, [1]);
  t.mock.timers.tick(999);
  assert.deepEqual(calls, [1]);
  t.mock.timers.tick(1);
  assert.deepEqual(calls, [1, 3]);
  t.mock.timers.tick(5000);
  save(4);
  assert.deepEqual(calls, [1, 3, 4]);
});

test("text scale steps stay within bounds", () => {
  assert.equal(stepScale("1", 1), "1.125");
  assert.equal(stepScale("1", -1), "0.875");
  assert.equal(stepScale("0.875", -1), "0.875");
  assert.equal(stepScale("1.5", 1), "1.5");
  assert.equal(stepScale("bogus", 1), "1.125");
});

test("motor labels are honest about the text source", () => {
  assert.match(motorLabel("mistral"), /OCR/);
  assert.match(motorLabel("pypdfium2"), /nativo/);
  assert.equal(motorLabel(null), null);
  assert.equal(motorLabel("otro"), "Motor: otro");
});
