"use client";

import { useState } from "react";
import { roleLabel } from "@/lib/constants";
import { MemberAvatar } from "@/components/shell/member-avatar";
import { Cake, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type Birthday = {
  id: string;
  full_name: string;
  designation: string | null;
  department: string | null;
  branch: string | null;
  birth_date: string;
  days_away: number;
};

const RANGES = [
  { key: "today", label: "Today", within: 0 },
  { key: "week", label: "This week", within: 7 },
  { key: "month", label: "This month", within: 30 },
] as const;

const formatDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

/** What an admin actually pastes into the chapter's Instagram story. */
const caption = (person: Birthday) =>
  `Happy birthday, ${person.full_name}! 🎉\n\n` +
  `From all of us at the ACM Student Chapter — have a brilliant one.\n\n` +
  `#ACM #StudentChapter #Birthday`;

export function BirthdayPanel({ birthdays }: { birthdays: Birthday[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (person: Birthday) => {
    try {
      await navigator.clipboard.writeText(caption(person));
      setCopied(person.id);
      toast.success(`Caption for ${person.full_name.split(" ")[0]} copied.`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Your browser wouldn't let us copy. Select the text instead.");
    }
  };

  return (
    <Tabs defaultValue="today" className="mt-8">
      <TabsList>
        {RANGES.map((range) => {
          const count = birthdays.filter((b) => b.days_away <= range.within).length;
          return (
            <TabsTrigger key={range.key} value={range.key}>
              {range.label}
              {count > 0 && (
                <span className="ml-1.5 font-mono text-xs text-muted-foreground">{count}</span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {RANGES.map((range) => {
        const list = birthdays.filter((b) => b.days_away <= range.within);
        return (
          <TabsContent key={range.key} value={range.key}>
            {list.length === 0 ? (
              <div className="rounded-2xl border border-dashed py-14 text-center">
                <Cake className="mx-auto size-7 text-muted-foreground" aria-hidden />
                <p className="mt-3 text-sm text-muted-foreground">
                  No birthdays {range.label.toLowerCase()}.
                </p>
              </div>
            ) : (
              <ul className="divide-y rounded-2xl border">
                {list.map((person) => (
                  <li key={person.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <MemberAvatar
                      id={person.id}
                      name={person.full_name}
                      className="size-11 border"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{person.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {roleLabel(person.designation, person.department)}
                        {person.branch && ` · ${person.branch}`}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-mono text-sm">{formatDay(person.birth_date)}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {person.days_away === 0
                          ? "today"
                          : person.days_away === 1
                            ? "tomorrow"
                            : `in ${person.days_away} days`}
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant={copied === person.id ? "default" : "outline"}
                      onClick={() => copy(person)}
                    >
                      <Copy className="size-4" aria-hidden />
                      {copied === person.id ? "Copied" : "Copy caption"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
