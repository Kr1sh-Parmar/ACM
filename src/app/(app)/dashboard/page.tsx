import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Megaphone, Pin, Users } from "lucide-react";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WithdrawRequestButton } from "@/components/teams/withdraw-request-button";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

/** Section heads on this page all carry an icon, so they share one shape. */
function SectionHeading({
  icon: Icon,
  children,
}: {
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2.5 font-heading text-xl font-semibold">
      <Icon className="size-[1.1rem] text-acm-300" aria-hidden />
      {children}
    </h2>
  );
}

export default async function DashboardPage() {
  const profile = await requireApproved();
  const supabase = await createClient();

  const [{ data: myTeams }, { data: myRequests }, { data: announcements }, { data: openEvents }] =
    await Promise.all([
      supabase
        .from("team_members")
        .select("team_id, teams(id, name, event_id, lead_id, events(title, type))")
        .eq("member_id", profile.id),
      supabase
        .from("join_requests")
        .select("id, status, created_at, teams(id, name, event_id, events(title))")
        .eq("requester_id", profile.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("announcements")
        .select("id, title, body, pinned, created_at")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("events")
        .select("id, title, type")
        .eq("status", "open")
        .order("start_date", { nullsFirst: false })
        .limit(4),
    ]);

  const teams = (myTeams ?? []).filter((t) => t.teams);
  const requests = myRequests ?? [];

  return (
    <div className="space-y-14">
      <PageHeader
        eyebrow={`Signed in as ${profile.full_name}`}
        title={`Welcome back, ${profile.full_name.split(" ")[0]}.`}
        description={
          !profile.open_to_invites ? (
            <>
              You&apos;re marked as not open to team invites.{" "}
              <Link href="/profile" className="text-acm-300 underline underline-offset-2">
                Change that
              </Link>
              .
            </>
          ) : undefined
        }
        // Matches the wrapper's space-y-14. PageHeader's own mb-8 outranks the
        // space-y rule in the cascade, so the gap has to be stated here.
        className="mb-14"
      />

      {(announcements ?? []).length > 0 && (
        <section>
          <SectionHeading icon={Megaphone}>Announcements</SectionHeading>
          <ul className="mt-5 space-y-3">
            {(announcements ?? []).map((note) => (
              <li
                key={note.id}
                className={cn(
                  "rim rounded-2xl p-5 shadow-glow-md",
                  note.pinned ? "border border-jasmine/25 bg-accent" : "glass",
                )}
                style={
                  note.pinned ? ({ "--rim-hue": "45deg" } as React.CSSProperties) : undefined
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-heading font-semibold">{note.title}</h3>
                  {note.pinned && (
                    <Pin className="size-4 shrink-0 text-jasmine" aria-hidden />
                  )}
                </div>
                <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
                  {note.body}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionHeading icon={Users}>Your teams</SectionHeading>

        {teams.length === 0 ? (
          <EmptyState
            className="mt-5"
            title="You're not on a team yet"
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/events">Browse events</Link>
              </Button>
            }
          >
            Teams form around open events. Find one that needs what you do.
          </EmptyState>
        ) : (
          <ul className="solid rim mt-5 divide-y divide-white/7 overflow-hidden rounded-2xl">
            {teams.map((row) => (
              <li
                key={row.team_id}
                className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-white/3"
              >
                <Link
                  href={`/events/${row.teams!.event_id}/teams/${row.teams!.id}`}
                  className="font-medium hover:text-acm-200 hover:underline"
                >
                  {row.teams!.name}
                </Link>
                {row.teams!.lead_id === profile.id && (
                  <Badge variant="outline" className="text-xs">
                    You lead
                  </Badge>
                )}
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {row.teams!.events?.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {requests.length > 0 && (
        <section>
          <h2 className="font-heading text-xl font-semibold">Requests you&apos;ve sent</h2>
          <ul className="solid rim mt-5 divide-y divide-white/7 overflow-hidden rounded-2xl">
            {requests.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{request.teams?.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {request.teams?.events?.title} · waiting on the team lead
                  </p>
                </div>
                <WithdrawRequestButton requestId={request.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {(openEvents ?? []).length > 0 && (
        <section>
          <SectionHeading icon={CalendarDays}>Open now</SectionHeading>
          <ul className="mt-5 flex flex-wrap gap-3">
            {(openEvents ?? []).map((event) => (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}`}
                  className="glass rim inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm transition-colors hover:bg-surface-2"
                >
                  {event.title}
                  <span className="font-mono text-xs text-muted-foreground capitalize">
                    {event.type}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
