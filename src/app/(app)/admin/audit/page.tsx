import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  const rows = entries ?? [];

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Who did what. Written by the database itself, so nothing can skip it."
      />

      {rows.length === 0 ? (
        <EmptyState icon={ScrollText} title="Nothing recorded yet">
          Actions appear here the moment an admin takes one.
        </EmptyState>
      ) : (
        // Solid, not glass: two hundred rows of dense text is exactly where
        // translucency stops helping and starts costing legibility.
        <div className="solid rim overflow-hidden rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[9.5rem]">When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="text-right">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((entry) => {
                const meta = (entry.meta ?? {}) as Meta;
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>

                    <TableCell className="font-medium">
                      {entry.profiles?.full_name ?? "System"}
                    </TableCell>

                    <TableCell className="whitespace-normal text-muted-foreground">
                      {ACTION_LABEL[entry.action] ?? entry.action}
                      {meta.note && (
                        <span className="mt-1 block max-w-prose text-xs text-jasmine/80 italic">
                          &ldquo;{meta.note}&rdquo;
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {meta.to && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {meta.from} → {meta.to}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
