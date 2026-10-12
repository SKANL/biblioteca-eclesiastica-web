import { test } from "node:test";
import assert from "node:assert/strict";
import { snippetToSafeHtml } from "../../lib/utils.ts";

test("snippet keeps the API's escaping and <mark> without double-escaping", () => {
  assert.equal(snippetToSafeHtml("Fe &amp; <mark>obras</mark>"), "Fe &amp; <mark>obras</mark>");
  assert.equal(snippetToSafeHtml("&lt;script&gt;x&lt;/script&gt;"), "&lt;script&gt;x&lt;/script&gt;");
  assert.equal(snippetToSafeHtml("&quot;a&quot; &#x27;b&#x27;"), "&quot;a&quot; &#x27;b&#x27;");
});

test("snippet sanitizer escapes any raw markup or stray ampersand (defense in depth)", () => {
  assert.equal(snippetToSafeHtml("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.equal(snippetToSafeHtml('<mark onclick="x">a</mark>'), '&lt;mark onclick="x"&gt;a</mark>');
  assert.equal(snippetToSafeHtml("a & b &copy; &#106;"), "a &amp; b &amp;copy; &amp;#106;");
  assert.equal(snippetToSafeHtml("<img src=x onerror=alert(1)>"), "&lt;img src=x onerror=alert(1)&gt;");
});
