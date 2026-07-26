/**
 * Deterministic identicon data for a member id: a hue and 15 cells (5 rows ×
 * the 3 left-hand columns, which get mirrored when drawn).
 *
 * Kept apart from the component so it can be tested without a DOM. That is not
 * ceremony — the first two attempts at this produced checkerboards for every
 * member and looked completely reasonable in review. See the note on bit
 * selection below.
 */

/** FNV-1a over the whole id. Long input, so this avalanches fine as a seed. */
function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * splitmix32. Every returned bit is well mixed, which is the point.
 *
 * The tempting shortcut — hashing `${id}:${x}:${y}` once per cell and taking
 * `% 2` — is broken twice over. FNV's multiplier is odd, so `h * prime`
 * preserves the low bit exactly and the final bit collapses to the XOR-parity
 * of the input bytes: for `id:x:y` that is just `x XOR y`, i.e. a checkerboard,
 * the same for everyone. Moving to a high bit is not enough either, because
 * fifteen inputs differing only in a 4-character suffix don't diverge in four
 * more FNV rounds. Seed once, then advance a real mixer.
 */
function splitmix32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return (t ^ (t >>> 15)) >>> 0;
  };
}

export type Identicon = {
  hue: number;
  /** 15 cells, row-major: index `y * 3 + x` for x in 0..2. */
  cells: boolean[];
};

export function identiconFor(id: string): Identicon {
  const next = splitmix32(fnv1a(id));
  const hue = next() % 360;
  const cells: boolean[] = [];
  for (let i = 0; i < 15; i++) cells.push((next() & 1) === 1);
  return { hue, cells };
}
