import { test } from "node:test";
import assert from "node:assert/strict";
import { markRanges, matchIndex } from "../../lib/reader-matches.ts";

test("code point offsets preserve emoji, NFD combining marks, ligatures and escaped HTML", () => {
  const text = "🙂 justificacio\u0301n oﬃce <script>";
  const ranges = [{ inicio: 2, fin: 16 }, { inicio: 17, fin: 21 }]; // API code point offsets
  const html = markRanges(text, ranges);
  assert.ok(html.includes('>justificacio\u0301n</mark>'));
  assert.ok(html.includes('>oﬃce</mark>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});

test("multiline phrase ranges mark only the active match as current", () => {
  const text = "gracia y fe; gracia\n fe, GRACIA fe";
  const phrases = [{ inicio: 13, fin: 23 }, { inicio: 25, fin: 34 }];
  const html = markRanges(text, phrases, 1);
  assert.ok(html.includes('id="coincidencia-1" aria-current="true">GRACIA fe'));
  assert.equal((html.match(/aria-current/g) || []).length, 1);
});

test("invalid offsets and selected indices are guarded", () => {
  assert.equal(markRanges('<fe>', [{inicio: -1, fin: 3}, {inicio: 2, fin: 9}]), '&lt;fe&gt;');
  assert.equal(matchIndex('9', 2), 0);
  assert.equal(matchIndex('-1', 2), 0);
  assert.equal(matchIndex('1', 2), 1);
});
