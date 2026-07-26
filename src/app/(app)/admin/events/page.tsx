import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EventStatusControl } from "@/components/admin/event-status-control";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Events" };

export default async function AdminEventsPage() {
  await requireStaff();
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, title, type, status, start_date, team_max, teams(id)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Events</h1>
          <p className="mt-2 text-muted-foreground">
            Hackathons and projects members can build teams for.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/events/new">
            <CalendarPlus className="size-4" aria-hidden />
            Host an event
          </Link>
        </Button>
      </div>

      {(events ?? []).length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed py-16 text-center">
          <p className="font-heading text-lg font-semibold">No events yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Host one and members can start forming teams.
          </p>
        </div>
      ) : (
        <ul className="mt-8 divide-y rounded-2xl border">
          {(events ?? []).map((event) => (
            <li key={event.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/events/${event.id}`}
                  className="font-heading font-semibold hover:underline"
                >
                  {event.title}
                </Link>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {event.type} · {event.teams.length}{" "}
                  {event.teams.length === 1 ? "team" : "teams"}
                  {event.start_date && ` · from ${event.start_date}`}
                </p>
              </div>

              <Badge
                variant={event.status === "open" ? "default" : "outline"}
                className={event.status === "open" ? "bg-acm-500" : ""}
              >
                {event.status}
              </Badge>

              <EventStatusControl eventId={event.id} status={event.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
