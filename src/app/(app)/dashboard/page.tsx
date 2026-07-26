import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Megaphone, Pin, Users } from "lucide-react";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WithdrawRequestButton } from "@/components/teams/withdraw-request-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

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
    <div className="space-y-12">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Welcome back, {profile.full_name.split(" ")[0]}.
        </h1>
        {!profile.open_to_invites && (
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;re marked as not open to team invites.{" "}
            <Link href="/profile" className="underline underline-offset-2">
              Change that
            </Link>
            .
          </p>
        )}
      </div>

      {(announcements ?? []).length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 font-heading text-xl font-semibold">
            <Megaphone className="size-5 text-muted-foreground" aria-hidden />
            Announcements
          </h2>
          <ul className="mt-4 space-y-3">
            {(announcements ?? []).map((note) => (
              <li
                key={note.id}
                className={`rounded-2xl border p-5 ${
                  note.pinned
                    ? "border-jasmine-deep bg-jasmine-soft dark:bg-jasmine-deep/10"
                    : "bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-heading font-semibold">{note.title}</h3>
                  {note.pinned && (
                    <Pin className="size-4 shrink-0 text-jasmine-deep" aria-hidden />
                  )}
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                  {note.body}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="flex items-center gap-2 font-heading text-xl font-semibold">
          <Users className="size-5 text-muted-foreground" aria-hidden />
          Your teams
        </h2>

        {teams.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed py-10 text-center">
            <p className="text-sm text-muted-foreground">
              You&apos;re not on a team yet.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/events">Browse events</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-4 divide-y rounded-2xl border">
            {teams.map((row) => (
              <li key={row.team_id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <Link
                  href={`/events/${row.teams!.event_id}/teams/${row.teams!.id}`}
                  className="font-medium hover:underline"
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
          <ul className="mt-4 divide-y rounded-2xl border">
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
          <h2 className="flex items-center gap-2 font-heading text-xl font-semibold">
            <CalendarDays className="size-5 text-muted-foreground" aria-hidden />
            Open now
          </h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {(openEvents ?? []).map((event) => (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm transition-colors hover:border-acm-300"
                >
                  {event.title}
                  <span className="font-mono text-xs capitalize text-muted-foreground">
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
