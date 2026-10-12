import { test } from "node:test";
import assert from "node:assert/strict";
import { pairUploads, pollJob } from "../../lib/upload.ts";
import { allowSignIn } from "../../lib/auth-policy.ts";

const flush = () => new Promise((r) => setImmediate(r));
const job = (estado) => ({ ok: true, data: { id: "j", estado, progreso: null, error: null, libro_id: null } });

test("pairUploads matches targets by name, keeps order for duplicate names, ignores array order", () => {
  const a1 = { name: "img.jpg", id: 1 };
  const a2 = { name: "img.jpg", id: 2 };
  const b = { name: "b.png", id: 3 };
  const targets = [{ nombre: "b.png" }, { nombre: "img.jpg" }, { nombre: "img.jpg" }];
  const pairs = pairUploads(targets, [a1, a2, b], (f) => f.name);
  assert.deepEqual(pairs.map(([t, f]) => [t.nombre, f.id]), [["b.png", 3], ["img.jpg", 1], ["img.jpg", 2]]);
  assert.throws(() => pairUploads([{ nombre: "x" }], [b], (f) => f.name), /x/);
});

test("pollJob: a rejected poll reports an error and retries with backoff", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const results = [];
  let calls = 0;
  const fetchJob = async () => {
    calls++;
    if (calls === 1) throw new Error("network");
    return job("completado");
  };
  pollJob(fetchJob, (r) => results.push(r), () => false);
  await flush();
  assert.equal(results[0].ok, false);
  assert.equal(results[0].status, 0);
  t.mock.timers.tick(1000);
  await flush();
  assert.equal(calls, 2);
  assert.equal(results[1].ok, true);
  t.mock.timers.tick(60_000);
  await flush();
  assert.equal(calls, 2, "terminal state stops polling");
});

test("pollJob: wake while a poll is in flight never starts a second chain", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0;
  let release;
  const fetchJob = () => {
    calls++;
    return new Promise((r) => (release = () => r(job("procesando"))));
  };
  const p = pollJob(fetchJob, () => {}, () => false);
  p.wake();
  p.wake();
  assert.equal(calls, 1);
  release();
  await flush();
  p.wake(); // timer pending: no extra request
  assert.equal(calls, 1);
  t.mock.timers.tick(1000);
  await flush();
  assert.equal(calls, 2);
  p.stop();
  release();
  await flush();
  t.mock.timers.tick(60_000);
  assert.equal(calls, 2, "stop cancels the chain");
});

test("pollJob: hidden tab pauses; wake resumes; 404 stops", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let hidden = true;
  let calls = 0;
  const p = pollJob(async () => (calls++, { ok: false, status: 404, error: "x" }), () => {}, () => hidden);
  assert.equal(calls, 0);
  hidden = false;
  p.wake();
  await flush();
  assert.equal(calls, 1);
  t.mock.timers.tick(60_000);
  p.wake();
  await flush();
  assert.equal(calls, 1);
});

test("sign-in refuses unverified Google emails", () => {
  assert.equal(allowSignIn({ account: { provider: "google" }, profile: { email_verified: false } }), false);
  assert.equal(allowSignIn({ account: { provider: "google" }, profile: {} }), false);
  assert.equal(allowSignIn({ account: { provider: "google" }, profile: { email_verified: true } }), true);
});
