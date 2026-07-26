import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { EventForm } from "@/components/admin/event-form";

export const metadata: Metadata = { title: "Host an event" };

export default async function NewEventPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Host an event</h1>
      <p className="mt-2 text-muted-foreground">
        Starts as a draft. Members see nothing until you set it to open.
      </p>
      <div className="mt-8">
        <EventForm />
      </div>
    </div>
  );
}
