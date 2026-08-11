import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { EventForm } from "@/components/admin/event-form";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Host an event" };

export default async function NewEventPage() {
  await requireAdmin();

  return (
    <div>
      <PageHeader
        title="Host an event"
        description="Starts as a draft. Members see nothing until you set it to open."
      />
      <div className="glass rim max-w-2xl rounded-2xl p-6 shadow-glow-md sm:p-7">
        <EventForm />
      </div>
    </div>
  );
}
