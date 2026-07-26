"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { addSkill, removeSkill } from "@/lib/actions/skills";
import { PROFICIENCIES, type Proficiency } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type SkillOption = { id: string; name: string; category: string };
export type MemberSkill = { skill_id: string; name: string; proficiency: Proficiency };

const PROFICIENCY_LABEL: Record<Proficiency, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function SkillEditor({
  memberSkills,
  allSkills,
}: {
  memberSkills: MemberSkill[];
  allSkills: SkillOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const held = useMemo(
    () => new Set(memberSkills.map((s) => s.skill_id)),
    [memberSkills],
  );

  const byCategory = useMemo(() => {
    const groups = new Map<string, SkillOption[]>();
    for (const skill of allSkills) {
      if (held.has(skill.id)) continue;
      const list = groups.get(skill.category) ?? [];
      list.push(skill);
      groups.set(skill.category, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [allSkills, held]);

  // Only offer to coin a tag when nothing already matches what they typed.
  const trimmed = query.trim();
  const exactExists = allSkills.some(
    (s) => s.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const canCreate = trimmed.length > 0 && trimmed.length <= 40 && !exactExists;

  const run = (fn: () => Promise<{ error?: string }>, success?: string) => {
    startTransition(async () => {
      const result = await fn();
      if (result?.error) toast.error(result.error);
      else if (success) toast.success(success);
    });
  };

  const attach = (payload: { skill_id?: string; custom_name?: string }, label: string) => {
    const data = new FormData();
    if (payload.skill_id) data.set("skill_id", payload.skill_id);
    if (payload.custom_name) data.set("custom_name", payload.custom_name);
    data.set("proficiency", "beginner");

    setOpen(false);
    setQuery("");
    run(() => addSkill(data), `Added ${label}.`);
  };

  return (
    <div className="space-y-4">
      {memberSkills.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <Sparkles className="mx-auto size-6 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm font-medium">No skills listed yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Teams search by skill. Add a few and they can find you.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-xl border">
          {memberSkills.map((skill) => (
            <li key={skill.skill_id} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1 truncate font-mono text-sm">{skill.name}</span>

              <label className="sr-only" htmlFor={`prof-${skill.skill_id}`}>
                Proficiency in {skill.name}
              </label>
              <select
                id={`prof-${skill.skill_id}`}
                defaultValue={skill.proficiency}
                disabled={pending}
                onChange={(e) => {
                  const data = new FormData();
                  data.set("skill_id", skill.skill_id);
                  data.set("proficiency", e.target.value);
                  run(() => addSkill(data));
                }}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {PROFICIENCIES.map((p) => (
                  <option key={p} value={p}>
                    {PROFICIENCY_LABEL[p]}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                disabled={pending}
                aria-label={`Remove ${skill.name}`}
                onClick={() => {
                  const data = new FormData();
                  data.set("skill_id", skill.skill_id);
                  run(() => removeSkill(data), `Removed ${skill.name}.`);
                }}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" disabled={pending}>
            <Plus className="size-4" aria-hidden />
            Add a skill
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-0" align="start">
          <Command shouldFilter>
            <CommandInput
              placeholder="Search skills…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                {canCreate ? (
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => attach({ custom_name: trimmed }, trimmed)}
                  >
                    Add <span className="font-mono font-medium">{trimmed}</span> as a new tag
                  </button>
                ) : (
                  "No skills found."
                )}
              </CommandEmpty>

              {byCategory.map(([category, skills]) => (
                <CommandGroup key={category} heading={category}>
                  {skills.map((skill) => (
                    <CommandItem
                      key={skill.id}
                      value={skill.name}
                      onSelect={() => attach({ skill_id: skill.id }, skill.name)}
                    >
                      <Check className="size-4 opacity-0" aria-hidden />
                      {skill.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
