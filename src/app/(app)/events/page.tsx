import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays } from "lucide-react";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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
      <h1 className="font-heading text-3xl font-bold tracking-tight">Events</h1>
      <p className="mt-2 text-muted-foreground">
        Hackathons and projects you can build a team for.
      </p>

      {open.length === 0 && closed.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed py-16 text-center">
          <CalendarDays className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-heading text-lg font-semibold">Nothing running right now</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When an admin opens a hackathon or project, it shows up here.
          </p>
        </div>
      ) : (
        <>
          {open.length > 0 && <EventGrid events={open} className="mt-8" />}

          {closed.length > 0 && (
            <section className="mt-14">
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
            className={`group block overflow-hidden rounded-2xl border bg-card transition-colors hover:border-acm-300 ${
              muted ? "opacity-75" : ""
            }`}
          >
            {event.banner_url ? (
              <div className="relative h-32 w-full bg-muted">
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
              <div
                className="h-32 w-full"
                style={{
                  background:
                    "radial-gradient(24rem 12rem at 20% 0%, var(--mesh-1), transparent 70%)," +
                    "radial-gradient(18rem 10rem at 90% 100%, var(--mesh-2), transparent 70%)",
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

              <h2 className="mt-3 font-heading text-lg font-semibold group-hover:text-acm-600 dark:group-hover:text-acm-300">
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
