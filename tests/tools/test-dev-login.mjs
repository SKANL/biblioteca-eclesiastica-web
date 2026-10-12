import { test } from "node:test";
import assert from "node:assert/strict";

import { devLoginEmails } from "../../lib/auth-policy.ts";

test("dev login is off unless explicitly enabled with an email allowlist", () => {
  assert.deepEqual(devLoginEmails({}), []);
  assert.deepEqual(devLoginEmails({ AUTH_DEV_LOGIN: "true" }), []);
  assert.deepEqual(devLoginEmails({ AUTH_DEV_EMAILS: "a@x.com" }), []);
});

test("dev login never activates on Vercel", () => {
  assert.deepEqual(
    devLoginEmails({ AUTH_DEV_LOGIN: "true", AUTH_DEV_EMAILS: "a@x.com", VERCEL: "1" }),
    [],
  );
});

test("dev login returns the normalized allowlist when enabled locally", () => {
  assert.deepEqual(
    devLoginEmails({ AUTH_DEV_LOGIN: "true", AUTH_DEV_EMAILS: " A@x.com, b@y.org ,," }),
    ["a@x.com", "b@y.org"],
  );
});
