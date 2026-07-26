import type { Metadata } from "next";
import Link from "next/link";
import { Cake } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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

  const stats = [
    { label: "Waiting on review", value: count(pending), href: "/admin/approvals" },
    { label: "Approved members", value: count(approved), href: "/admin/members" },
    { label: "Open events", value: count(openEvents), href: "/admin/events" },
    { label: "Teams formed", value: count(teams), href: "/admin/events" },
  ];

  const soon = birthdays.data ?? [];

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Overview</h1>

      <dl className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <div className="h-full rounded-2xl border bg-card p-5 transition-colors hover:border-acm-300">
              <dt className="text-sm text-muted-foreground">{stat.label}</dt>
              <dd className="mt-2 font-mono text-3xl font-medium">{stat.value}</dd>
            </div>
          </Link>
        ))}
      </dl>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
            <Cake className="size-5 text-jasmine-deep" aria-hidden />
            Birthdays this week
          </h2>

          {soon.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">None in the next 7 days.</p>
          ) : (
            <ul className="mt-4 divide-y rounded-2xl border">
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
            className="mt-3 inline-block text-sm text-acm-600 hover:underline dark:text-acm-300"
          >
            Open the birthday panel
          </Link>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold">Recent activity</h2>

          {(activity.data ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <ul className="mt-4 divide-y rounded-2xl border">
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
            className="mt-3 inline-block text-sm text-acm-600 hover:underline dark:text-acm-300"
          >
            See the full audit log
          </Link>
        </section>
      </div>
    </div>
  );
}
