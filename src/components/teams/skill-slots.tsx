import { Check } from "lucide-react";

/**
 * The signature motif.
 *
 * A team is a set of skills it asked for, some already covered by the people on
 * it and some still missing. Filled slots are solid brand blue; open slots are
 * dashed jasmine. Wherever you meet a team — browser, team page, suggestions —
 * "what's still missing" looks identical, so it reads at a glance.
 */
export function SkillSlots({
  required,
  covered,
  limit,
}: {
  required: string[];
  /** Skill names held by at least one member currently on the team. */
  covered: Set<string>;
  limit?: number;
}) {
  if (required.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No specific skills listed — anyone can ask to join.
      </p>
    );
  }

  const shown = limit ? required.slice(0, limit) : required;
  const hidden = required.length - shown.length;

  return (
    <ul className="flex flex-wrap items-center gap-1.5">
      {shown.map((skill) => {
        const filled = covered.has(skill);
        return (
          <li key={skill}>
            <span
              className={`slot ${filled ? "slot-filled" : "slot-open"}`}
              title={filled ? `${skill} — covered` : `${skill} — still needed`}
            >
              {filled && <Check className="size-3" aria-hidden />}
              {skill}
              <span className="sr-only">{filled ? " (covered)" : " (still needed)"}</span>
            </span>
          </li>
        );
      })}
      {hidden > 0 && (
        <li className="font-mono text-xs text-muted-foreground">+{hidden}</li>
      )}
    </ul>
  );
}
