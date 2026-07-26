import { test } from "node:test";
import assert from "node:assert/strict";
import { identiconFor } from "./identicon.ts";

test("the same id always gives the same avatar", () => {
  const a = identiconFor("2a1b9f00-0000-4000-8000-000000000001");
  const b = identiconFor("2a1b9f00-0000-4000-8000-000000000001");
  assert.deepEqual(a, b);
});

test("different ids give different avatars", () => {
  const a = identiconFor("2a1b9f00-0000-4000-8000-000000000001");
  const b = identiconFor("2a1b9f00-0000-4000-8000-000000000002");
  assert.notDeepEqual(a, b);
});

test("shape is 15 cells and a hue in range", () => {
  const { hue, cells } = identiconFor("shape-check");
  assert.equal(cells.length, 15);
  assert.ok(hue >= 0 && hue < 360, `hue ${hue} out of range`);
});

/**
 * The regression that matters. Two earlier versions produced a checkerboard for
 * every member — visually plausible one at a time, obviously broken side by
 * side. Distinctness and fill ratio are what actually catch that, so they are
 * asserted over a population rather than a single sample.
 */
test("500 ids produce near-unique, well-balanced patterns", () => {
  const ids = Array.from({ length: 500 }, (_, i) => `member-${i}-${i * 7919}`);
  const seen = new Set<string>();
  let filled = 0;

  for (const id of ids) {
    const { cells } = identiconFor(id);
    seen.add(cells.map((c) => (c ? "1" : "0")).join(""));
    filled += cells.filter(Boolean).length;
  }

  // 15 bits is 32768 possibilities, so a handful of birthday collisions among
  // 500 is expected. Anything under 480 means the generator is degenerate.
  assert.ok(seen.size >= 480, `only ${seen.size} distinct patterns from 500 ids`);

  const ratio = filled / (500 * 15);
  assert.ok(ratio > 0.4 && ratio < 0.6, `fill ratio ${ratio} is lopsided`);
});

test("no member gets a blank or completely solid avatar", () => {
  for (let i = 0; i < 500; i++) {
    const { cells } = identiconFor(`blank-check-${i}`);
    assert.ok(cells.some(Boolean), `id ${i} rendered blank`);
    assert.ok(!cells.every(Boolean), `id ${i} rendered solid`);
  }
});
