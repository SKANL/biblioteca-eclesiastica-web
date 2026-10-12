import { test } from "node:test";
import assert from "node:assert/strict";
import { literalRanges, markRanges, matchIndex } from "../../lib/reader-matches.ts";

test("code point offsets preserve emoji, NFD combining marks, ligatures and escaped HTML", () => {
  const text = "🙂 justificacio\u0301n oﬃce <script>";
  const ranges = literalRanges(text, "justificacion office");
  assert.equal(ranges.length, 2);
  assert.equal(ranges[0].inicio, 2);
  const html = markRanges(text, ranges);
  assert.ok(html.includes('>justificacio\u0301n</mark>'));
  assert.ok(html.includes('>oﬃce</mark>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});

test("quoted multiline phrases and independent terms have distinct repeated ranges", () => {
  const text = "gracia y fe; gracia\n fe, GRACIA fe";
  const phrases = literalRanges(text, '"gracia fe"');
  assert.equal(phrases.length, 2);
  assert.equal(literalRanges(text, 'gracia fe').length, 6);
  const html = markRanges(text, phrases, 1);
  assert.ok(html.includes('id="coincidencia-1" aria-current="true">GRACIA fe'));
  assert.equal((html.match(/aria-current/g) || []).length, 1);
});

test("invalid offsets and selected indices are guarded, cap is bounded", () => {
  assert.equal(markRanges('<fe>', [{inicio: -1, fin: 3}, {inicio: 2, fin: 9}]), '&lt;fe&gt;');
  assert.equal(matchIndex('9', 2), 0);
  assert.equal(matchIndex('-1', 2), 0);
  assert.equal(matchIndex('1', 2), 1);
  assert.equal(literalRanges('fe '.repeat(1000), 'fe').length, 100);
  assert.deepEqual(literalRanges('fe,', 'fe,'), [{inicio: 0, fin: 3}]);
});
