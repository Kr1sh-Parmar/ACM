"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";
import { BRANCHES, DEPARTMENTS, DESIGNATIONS, PROFICIENCIES, YEARS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type FilterSkill = { id: string; name: string; category: string };

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function DirectoryFilters({ skills }: { skills: FilterSkill[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const selectedSkills = params.getAll("skill");

  const update = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    startTransition(() => router.push(`/directory?${next.toString()}`, { scroll: false }));
  };

  const set = (key: string, value: string) =>
    update((next) => (value ? next.set(key, value) : next.delete(key)));

  const skillName = (id: string) => skills.find((s) => s.id === id)?.name ?? id;

  const hasFilters = [...params.keys()].length > 0;

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const value = new FormData(e.currentTarget).get("q");
          set("q", String(value ?? "").trim());
        }}
      >
        <label htmlFor="q" className="text-sm font-medium">
          Search by name
        </label>
        <div className="mt-2 flex gap-2">
          <Input id="q" name="q" defaultValue={params.get("q") ?? ""} placeholder="Priya" />
          <Button type="submit" variant="outline" size="icon" aria-label="Search">
            <Search className="size-4" aria-hidden />
          </Button>
        </div>
      </form>

      <div>
        <label htmlFor="skill" className="text-sm font-medium">
          Has all of these skills
        </label>
        <select
          id="skill"
          className={`mt-2 ${SELECT_CLASS}`}
          value=""
          disabled={pending}
          onChange={(e) => {
            const id = e.target.value;
            if (id && !selectedSkills.includes(id)) update((next) => next.append("skill", id));
          }}
        >
          <option value="">Add a skill…</option>
          {skills
            .filter((s) => !selectedSkills.includes(s.id))
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>

        {selectedSkills.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {selectedSkills.map((id) => (
              <li key={id}>
                <Badge variant="secondary" className="gap-1 font-mono">
                  {skillName(id)}
                  <button
                    type="button"
                    aria-label={`Remove ${skillName(id)} filter`}
                    onClick={() =>
                      update((next) => {
                        const keep = selectedSkills.filter((s) => s !== id);
                        next.delete("skill");
                        keep.forEach((s) => next.append("skill", s));
                      })
                    }
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label htmlFor="prof" className="text-sm font-medium">
          At least
        </label>
        <select
          id="prof"
          className={`mt-2 ${SELECT_CLASS}`}
          value={params.get("prof") ?? ""}
          disabled={pending}
          onChange={(e) => set("prof", e.target.value)}
        >
          <option value="">Any level</option>
          {PROFICIENCIES.map((p) => (
            <option key={p} value={p}>
              {p[0].toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="department" className="text-sm font-medium">
          Department
        </label>
        <select
          id="department"
          className={`mt-2 ${SELECT_CLASS}`}
          value={params.get("department") ?? ""}
          disabled={pending}
          onChange={(e) => set("department", e.target.value)}
        >
          <option value="">Any department</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="designation" className="text-sm font-medium">
          Officer position
        </label>
        <select
          id="designation"
          className={`mt-2 ${SELECT_CLASS}`}
          value={params.get("designation") ?? ""}
          disabled={pending}
          onChange={(e) => set("designation", e.target.value)}
        >
          <option value="">Anyone</option>
          {DESIGNATIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="branch" className="text-sm font-medium">
          Branch
        </label>
        <select
          id="branch"
          className={`mt-2 ${SELECT_CLASS}`}
          value={params.get("branch") ?? ""}
          disabled={pending}
          onChange={(e) => set("branch", e.target.value)}
        >
          <option value="">Any branch</option>
          {BRANCHES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="year" className="text-sm font-medium">
          Year
        </label>
        <select
          id="year"
          className={`mt-2 ${SELECT_CLASS}`}
          value={params.get("year") ?? ""}
          disabled={pending}
          onChange={(e) => set("year", e.target.value)}
        >
          <option value="">Any year</option>
          {YEARS.map((y) => (
            <option key={y.value} value={y.value}>
              {y.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 rounded border-input accent-acm-500"
          checked={params.get("open") === "1"}
          disabled={pending}
          onChange={(e) => set("open", e.target.checked ? "1" : "")}
        />
        Open to team invites only
      </label>

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => startTransition(() => router.push("/directory", { scroll: false }))}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
