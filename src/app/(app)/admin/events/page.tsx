import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EventStatusControl } from "@/components/admin/event-status-control";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
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
      <PageHeader
        title="Events"
        description="Hackathons and projects members can build teams for."
        action={
          <Button asChild>
            <Link href="/admin/events/new">
              <CalendarPlus className="size-4" aria-hidden />
              Host an event
            </Link>
          </Button>
        }
      />

      {(events ?? []).length === 0 ? (
        <EmptyState icon={CalendarPlus} title="No events yet">
          Host one and members can start forming teams.
        </EmptyState>
      ) : (
        <ul className="solid rim divide-y divide-white/7 overflow-hidden rounded-2xl">
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

              <Badge variant={event.status === "open" ? "default" : "outline"}>
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
