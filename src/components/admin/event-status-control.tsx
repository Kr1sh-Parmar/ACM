"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setEventStatus } from "@/lib/actions/events";
import type { Enums } from "@/lib/supabase/types";
import { NativeSelect } from "@/components/ui/native-select";

const STATUSES: Enums<"event_status">[] = ["draft", "open", "closed"];

const LABEL: Record<Enums<"event_status">, string> = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
};

/** Flip an event between draft/open/closed without opening the full form. */
export function EventStatusControl({
  eventId,
  status,
}: {
  eventId: string;
  status: Enums<"event_status">;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <>
      <label className="sr-only" htmlFor={`status-${eventId}`}>
        Event status
      </label>
      <NativeSelect
        id={`status-${eventId}`}
        defaultValue={status}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          const data = new FormData();
          data.set("event_id", eventId);
          data.set("status", next);
          startTransition(async () => {
            const result = await setEventStatus(data);
            if (result?.error) toast.error(result.error);
            else toast.success(`Event is now ${LABEL[next as Enums<"event_status">].toLowerCase()}.`);
          });
        }}
        className="h-8 w-auto px-2 text-xs"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {LABEL[s]}
          </option>
        ))}
      </NativeSelect>
    </>
  );
}
