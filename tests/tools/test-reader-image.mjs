// Run with Node 22.18+ or 24: node --test tests/tools/test-reader-image.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { imageGeometry, retryImageSource, scrollToHighlight, targetIdentity, validHighlight } from "../../lib/reader-image.ts";

test("same block on a different page, source or geometry has a new target identity", () => {
  const identity = (page = 1, src = "a.png", box = [0, .8, .2, .1], width = 600) =>
    targetIdentity("book", page, src, 0, box, width, 800);
  assert.notEqual(identity(), identity(2));
  assert.notEqual(identity(), identity(1, "b.png"));
  assert.notEqual(identity(), identity(1, "a.png", [0, .1, .2, .1]));
  assert.notEqual(identity(), identity(1, "a.png", [0, .8, .2, .1], 700));
  assert.equal(identity(), identity());
});

test("legacy and invalid dimensions reserve an explicitly approximate ratio", () => {
  for (const dimensions of [[null, null], [0, 800], [600, NaN], [Infinity, 800], [-1, 800]]) {
    assert.deepEqual(imageGeometry(...dimensions), { exact: false, ratio: .75 });
  }
  assert.deepEqual(imageGeometry(600, 800), { exact: true, ratio: .75 });
  assert.deepEqual(imageGeometry(800, 200), { exact: true, ratio: 4 });
});

test("only finite in-page rectangles can become scroll targets", () => {
  for (const box of [null, [], [0, 0, NaN, 1], [0, 0, 0, 1], [-.1, 0, .2, .2], [.9, 0, .2, .2]]) {
    assert.equal(validHighlight(box), null);
  }
  assert.deepEqual(validHighlight([0, .8, .2, .1]), [0, .8, .2, .1]);
});

test("retry keeps the query and fragment and does not change the initial source", () => {
  assert.equal(retryImageSource("page.png?token=value#page", 0), "page.png?token=value#page");
  assert.equal(retryImageSource("page.png?token=value#page", 1), "page.png?token=value&retry=1#page");
  assert.equal(retryImageSource("page.png", 2), "page.png?retry=2");
});

test("scroll uses the matched element and disables animation for reduced motion", () => {
  const calls = [];
  const target = { scrollIntoView: (options) => calls.push(options) };
  scrollToHighlight(target, true);
  scrollToHighlight(target, false);
  assert.deepEqual(calls, [
    { block: "center", inline: "nearest", behavior: "instant" },
    { block: "center", inline: "nearest", behavior: "smooth" },
  ]);
});
