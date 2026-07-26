import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EventForm } from "@/components/admin/event-form";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: event }, { data: teams }] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("teams")
      .select("id, name, lead_id, team_members(member_id), profiles!teams_lead_id_fkey(full_name)")
      .eq("event_id", id)
      .order("created_at"),
  ]);

  if (!event) notFound();

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">{event.title}</h1>
      <p className="mt-2 text-muted-foreground">
        <Link href="/admin/events" className="hover:underline">
          All events
        </Link>
      </p>

      <div className="mt-8">
        <EventForm event={event} />
      </div>

      <section className="mt-14 max-w-2xl border-t pt-10">
        <h2 className="font-heading text-xl font-bold tracking-tight">
          Teams ({(teams ?? []).length})
        </h2>

        {(teams ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No teams yet. They appear here as members create them.
          </p>
        ) : (
          <ul className="mt-5 divide-y rounded-2xl border">
            {(teams ?? []).map((team) => {
              const size = team.team_members.length;
              const openSlots = Math.max(0, event.team_max - size);
              return (
                <li key={team.id} className="flex items-center gap-4 px-5 py-3">
                  <Link
                    href={`/events/${event.id}/teams/${team.id}`}
                    className="min-w-0 flex-1 truncate font-medium hover:underline"
                  >
                    {team.name}
                  </Link>
                  <span className="font-mono text-xs text-muted-foreground">
                    led by {team.profiles?.full_name ?? "—"}
                  </span>
                  <span className="font-mono text-xs">
                    {size}/{event.team_max}
                    {openSlots > 0 && (
                      <span className="ml-2 text-jasmine-deep">
                        {openSlots} open
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
