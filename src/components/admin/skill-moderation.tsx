"use client";

import { useState, useTransition } from "react";
import { Merge, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { mergeSkillTags, retireSkillTag } from "@/lib/actions/skills";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type ModeratedSkill = {
  id: string;
  name: string;
  category: string;
  is_custom: boolean;
  holders: number;
};

/**
 * Merging is the whole point of this screen: "JS" and "JavaScript" are the same
 * skill, and a directory that treats them as two is a directory nobody trusts.
 * Retiring is for tags nobody uses at all.
 */
export function SkillModeration({ skills }: { skills: ModeratedSkill[] }) {
  const [pending, startTransition] = useTransition();
  const [source, setSource] = useState<ModeratedSkill | null>(null);

  const run = (fn: () => Promise<{ error?: string }>, success: string) =>
    startTransition(async () => {
      const result = await fn();
      if (result?.error) toast.error(result.error);
      else {
        toast.success(success);
        setSource(null);
      }
    });

  const merge = (target: ModeratedSkill) => {
    if (!source) return;
    const data = new FormData();
    data.set("source_id", source.id);
    data.set("target_id", target.id);
    run(
      () => mergeSkillTags(data),
      `Merged ${source.name} into ${target.name}. Members moved across.`,
    );
  };

  return (
    <div>
      {source && (
        <div className="sticky top-16 z-10 mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-acm-300 bg-acm-50 p-4 dark:bg-acm-900/40">
          <span className="text-sm">
            Merging <span className="font-mono font-medium">{source.name}</span> into… pick
            the tag to keep.
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setSource(null)}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>
      )}

      <ul className="divide-y rounded-2xl border">
        {skills.map((skill) => {
          const isSource = source?.id === skill.id;
          return (
            <li
              key={skill.id}
              className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
                isSource ? "bg-acm-50 dark:bg-acm-900/40" : ""
              }`}
            >
              <span className="font-mono text-sm">{skill.name}</span>

              <Badge variant="outline" className="text-xs">
                {skill.category}
              </Badge>
              {skill.is_custom && (
                <Badge className="bg-jasmine text-[#6b5410] hover:bg-jasmine">
                  Member-added
                </Badge>
              )}

              <span className="font-mono text-xs text-muted-foreground">
                {skill.holders} {skill.holders === 1 ? "member" : "members"}
              </span>

              <div className="ml-auto flex gap-2">
                {source ? (
                  !isSource && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={() => merge(skill)}
                    >
                      Keep this one
                    </Button>
                  )
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => setSource(skill)}
                    >
                      <Merge className="size-4" aria-hidden />
                      Merge
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={pending || skill.holders > 0}
                      title={
                        skill.holders > 0
                          ? "Members still use this tag — merge it instead"
                          : undefined
                      }
                      onClick={() => {
                        const data = new FormData();
                        data.set("skill_id", skill.id);
                        run(() => retireSkillTag(data), `Retired ${skill.name}.`);
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden />
                      Retire
                    </Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
