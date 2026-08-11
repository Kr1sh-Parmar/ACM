import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays } from "lucide-react";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage() {
  await requireApproved();
  const supabase = await createClient();

  // Drafts are filtered out by RLS, not by this query.
  const { data: events } = await supabase
    .from("events")
    .select("id, title, type, status, description, banner_url, start_date, team_max, teams(id)")
    .order("status")
    .order("start_date", { ascending: false, nullsFirst: false });

  const open = (events ?? []).filter((e) => e.status === "open");
  const closed = (events ?? []).filter((e) => e.status === "closed");

  return (
    <div>
      <PageHeader
        eyebrow="Build a team"
        title="Events"
        description="Hackathons and projects you can build a team for."
      />

      {open.length === 0 && closed.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Nothing running right now">
          When an admin opens a hackathon or project, it shows up here.
        </EmptyState>
      ) : (
        <>
          {open.length > 0 && <EventGrid events={open} />}

          {closed.length > 0 && (
            <section className="mt-16">
              <h2 className="font-heading text-xl font-semibold">Finished</h2>
              <EventGrid events={closed} className="mt-5" muted />
            </section>
          )}
        </>
      )}
    </div>
  );
}

type EventRow = {
  id: string;
  title: string;
  type: "hackathon" | "project";
  status: "draft" | "open" | "closed";
  description: string | null;
  banner_url: string | null;
  start_date: string | null;
  teams: { id: string }[];
};

function EventGrid({
  events,
  className,
  muted,
}: {
  events: EventRow[];
  className?: string;
  muted?: boolean;
}) {
  return (
    <ul className={`grid gap-5 sm:grid-cols-2 ${className ?? ""}`}>
      {events.map((event) => (
        <li key={event.id}>
          <Link
            href={`/events/${event.id}`}
            className={`glass rim group block overflow-hidden rounded-2xl shadow-glow-md transition-colors hover:bg-surface-2 ${
              muted ? "opacity-70" : ""
            }`}
          >
            {event.banner_url ? (
              <div className="relative h-32 w-full bg-white/5">
                <Image
                  src={event.banner_url}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              // A slice of the same aurora the page sits on, so an event with
              // no banner still belongs to the set.
              <div
                className="h-32 w-full"
                style={{
                  background:
                    "radial-gradient(24rem 12rem at 20% 0%, color-mix(in oklab, var(--acm-500) 45%, transparent), transparent 70%)," +
                    "radial-gradient(18rem 10rem at 90% 100%, color-mix(in oklab, var(--signal) 22%, transparent), transparent 70%)",
                }}
              />
            )}

            <div className="p-5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs capitalize">
                  {event.type}
                </Badge>
                {event.status === "closed" && <Badge variant="secondary">Closed</Badge>}
              </div>

              <h2 className="mt-3 font-heading text-lg font-semibold transition-colors group-hover:text-acm-200">
                {event.title}
              </h2>

              {event.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {event.description}
                </p>
              )}

              <p className="mt-4 font-mono text-xs text-muted-foreground">
                {event.teams.length} {event.teams.length === 1 ? "team" : "teams"}
                {event.start_date && ` · from ${event.start_date}`}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
