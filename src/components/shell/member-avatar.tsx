import { cn } from "@/lib/utils";
import { identiconFor } from "@/components/shell/identicon";

/**
 * GitHub-style identicon: a 5×5 grid mirrored down the middle, derived from the
 * member's id.
 *
 * ponytail: this is DOM, not an image. No upload path, no storage bucket, no
 * bandwidth, and nothing to resize — which is the whole reason photos were
 * dropped. It also cannot 404 or go stale, so there is no fallback chain and no
 * cache-busting query string to get wrong.
 *
 * Pure and deterministic, so the server render and the client hydrate produce
 * byte-identical markup and React stays quiet.
 */
export function MemberAvatar({
  id,
  name,
  className,
}: {
  id: string;
  name?: string | null;
  className?: string;
}) {
  const { hue, cells: bits } = identiconFor(id);
  const colour = `hsl(${hue} 62% 45%)`;

  // Only the left three columns are generated; columns 3 and 4 mirror 1 and 0.
  // That symmetry is what makes an identicon read as a face rather than noise.
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if (bits[y * 3 + x]) {
        cells.push({ x, y });
        if (x < 2) cells.push({ x: 4 - x, y });
      }
    }
  }

  return (
    <svg
      viewBox="0 0 7 7"
      shapeRendering="crispEdges"
      role="img"
      aria-label={name ? `${name}'s avatar` : "Member avatar"}
      className={cn("shrink-0 overflow-hidden rounded-full", className)}
    >
      {/* Same hue at low opacity, so the tint works on a light or a dark card
          without needing a second theme-specific colour. */}
      <rect width="7" height="7" fill={colour} opacity="0.14" />
      {cells.map((c) => (
        // Inset by 1 so the corners of the grid stay inside the circle.
        <rect
          key={`${c.x}-${c.y}`}
          x={c.x + 1}
          y={c.y + 1}
          width="1"
          height="1"
          fill={colour}
        />
      ))}
    </svg>
  );
}
