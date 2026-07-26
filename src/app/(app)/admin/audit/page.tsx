import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Audit log" };

/** Written by database triggers, so the wording is derived, not free text. */
const ACTION_LABEL: Record<string, string> = {
  "profiles.status_changed": "Reviewed a profile",
  "events.created": "Created an event",
  "events.updated": "Updated an event",
  "events.deleted": "Deleted an event",
  "announcements.created": "Posted an announcement",
  "announcements.updated": "Edited an announcement",
  "announcements.deleted": "Deleted an announcement",
};

type Meta = { from?: string; to?: string; note?: string | null };

export default async function AuditPage() {
  await requireStaff();
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("audit_log")
    .select("id, action, target_table, target_id, meta, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Audit log</h1>
      <p className="mt-2 text-muted-foreground">
        Who did what. Written by the database itself, so nothing can skip it.
      </p>

      {(entries ?? []).length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed py-16 text-center">
          <ScrollText className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="mt-4 text-sm text-muted-foreground">Nothing recorded yet.</p>
        </div>
      ) : (
        <ul className="mt-8 divide-y rounded-2xl border">
          {(entries ?? []).map((entry) => {
            const meta = (entry.meta ?? {}) as Meta;
            return (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3">
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>

                <span className="font-medium">
                  {entry.profiles?.full_name ?? "System"}
                </span>

                <span className="text-sm text-muted-foreground">
                  {ACTION_LABEL[entry.action] ?? entry.action}
                </span>

                {meta.to && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {meta.from} → {meta.to}
                  </Badge>
                )}

                {meta.note && (
                  <span className="w-full text-sm text-muted-foreground">
                    &ldquo;{meta.note}&rdquo;
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
