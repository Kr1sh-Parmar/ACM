/**
 * Coverage as colour.
 *
 * Feeds `--rim-hue` on a card representing a set with gaps. A fully covered
 * set keeps the brand blue rim everything else in the app wears; as slots go
 * unfilled the rim warms toward jasmine, which means the same thing here as
 * it does on `.slot-open` — something still needs a person.
 *
 * The point is that a short-staffed team reads as short-staffed from across
 * the room, before you parse "3 of 5".
 */
export function coverageRim(covered: number, total: number): React.CSSProperties {
  const open = total > 0 ? (total - covered) / total : 0;
  // 210deg (brand blue) → 45deg (jasmine) as coverage drops to nothing.
  return { "--rim-hue": `${Math.round(210 - 165 * open)}deg` } as React.CSSProperties;
}
