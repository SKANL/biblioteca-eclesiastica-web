import { test } from "node:test";
import assert from "node:assert/strict";
import { jwtVerify, decodeProtectedHeader } from "jose";
import { canEdit, mintApiToken } from "../../lib/server/api.ts";

const secret = "test-secret-at-least-32-bytes-long!!";

test("minted token has exactly the API contract claims", async () => {
  const token = await mintApiToken("Ana@Example.org", secret, 1_000_000);
  assert.equal(decodeProtectedHeader(token).alg, "HS256");
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
    issuer: "biblioteca-web",
    audience: "biblioteca-api",
    currentDate: new Date(1_000_000_000),
  });
  assert.deepEqual(Object.keys(payload).sort(), ["aud", "email", "exp", "iat", "iss", "sub"]);
  assert.equal(payload.sub, "ana@example.org");
  assert.equal(payload.email, "ana@example.org");
  assert.equal(payload.iat, 1_000_000);
  assert.equal(payload.exp - payload.iat, 300);
});

test("minting refuses a missing secret or email", async () => {
  await assert.rejects(mintApiToken("a@b.c", "", 1));
  await assert.rejects(mintApiToken("", secret, 1));
});

test("only editor and admin roles can edit", () => {
  assert.equal(canEdit("editor"), true);
  assert.equal(canEdit("admin"), true);
  assert.equal(canEdit(null), false);
  assert.equal(canEdit("lector"), false);
  assert.equal(canEdit(undefined), false);
});
