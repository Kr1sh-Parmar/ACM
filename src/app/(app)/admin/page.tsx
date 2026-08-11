import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, Cake, CalendarDays, Inbox, Users } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatTile } from "@/components/shell/stat-tile";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Admin overview" };

const ACTION_LABEL: Record<string, string> = {
  "profiles.status_changed": "reviewed a profile",
  "events.created": "created an event",
  "events.updated": "updated an event",
  "events.deleted": "deleted an event",
  "announcements.created": "posted an announcement",
  "announcements.updated": "edited an announcement",
  "announcements.deleted": "deleted an announcement",
};

const count = (q: { count: number | null }) => q.count ?? 0;

export default async function AdminOverviewPage() {
  await requireStaff();
  const supabase = await createClient();

  const [pending, approved, openEvents, teams, birthdays, activity] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("teams").select("id", { count: "exact", head: true }),
    supabase.rpc("upcoming_birthdays", { days_ahead: 7 }),
    supabase
      .from("audit_log")
      .select("id, action, meta, created_at, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const soon = birthdays.data ?? [];
  const waiting = count(pending);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Overview</h1>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Only the queue gets the jasmine treatment — it is the one number
            here that is a backlog rather than a fact. */}
        <StatTile
          href="/admin/approvals"
          label="Waiting on review"
          value={waiting}
          icon={Inbox}
          attention={waiting > 0}
          hint={waiting > 0 ? "Nobody gets in until you look" : "Queue is clear"}
        />
        <StatTile
          href="/admin/members"
          label="Approved members"
          value={count(approved)}
          icon={Users}
        />
        <StatTile
          href="/admin/events"
          label="Open events"
          value={count(openEvents)}
          icon={CalendarDays}
        />
        <StatTile
          href="/admin/events"
          label="Teams formed"
          value={count(teams)}
          icon={Boxes}
        />
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="flex items-center gap-2.5 font-heading text-lg font-semibold">
            <Cake className="size-[1.1rem] text-jasmine" aria-hidden />
            Birthdays this week
          </h2>

          {soon.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">None in the next 7 days.</p>
          ) : (
            <ul className="solid rim mt-4 divide-y divide-white/7 overflow-hidden rounded-2xl">
              {soon.map((person) => (
                <li key={person.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1 truncate font-medium">{person.full_name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {person.days_away === 0
                      ? "today"
                      : person.days_away === 1
                        ? "tomorrow"
                        : `in ${person.days_away} days`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/admin/birthdays"
            className="mt-3 inline-block text-sm text-acm-300 hover:underline"
          >
            Open the birthday panel
          </Link>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold">Recent activity</h2>

          {(activity.data ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <ul className="solid rim mt-4 divide-y divide-white/7 overflow-hidden rounded-2xl">
              {(activity.data ?? []).map((entry) => {
                const meta = (entry.meta ?? {}) as { to?: string };
                return (
                  <li key={entry.id} className="flex flex-wrap items-baseline gap-2 px-5 py-3 text-sm">
                    <span className="font-medium">{entry.profiles?.full_name ?? "System"}</span>
                    <span className="text-muted-foreground">
                      {ACTION_LABEL[entry.action] ?? entry.action}
                    </span>
                    {meta.to && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {meta.to}
                      </Badge>
                    )}
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href="/admin/audit"
            className="mt-3 inline-block text-sm text-acm-300 hover:underline"
          >
            See the full audit log
          </Link>
        </section>
      </div>
    </div>
  );
}
