"use client";

import { useTransition } from "react";
import { MemberAvatar } from "@/components/shell/member-avatar";
import { Check, Inbox, X } from "lucide-react";
import { toast } from "sonner";
import { respondToRequest } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";

export type PendingRequest = {
  id: string;
  message: string | null;
  requester: { id: string; full_name: string };
};

export function JoinRequestList({
  eventId,
  teamId,
  requests,
  teamIsFull,
}: {
  eventId: string;
  teamId: string;
  requests: PendingRequest[];
  teamIsFull: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (requests.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed py-10 text-center">
        <Inbox className="mx-auto size-6 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-sm text-muted-foreground">
          Nobody has asked to join yet.
        </p>
      </div>
    );
  }

  const respond = (requestId: string, approve: boolean, name: string) => {
    const data = new FormData();
    data.set("request_id", requestId);
    data.set("approve", String(approve));
    data.set("team_id", teamId);
    data.set("event_id", eventId);

    startTransition(async () => {
      const result = await respondToRequest(data);
      // The database function raises messages written for humans — "this team is
      // already full", "they already joined another team in this hackathon" —
      // so they go straight to the toast.
      if (result?.error) toast.error(result.error);
      else toast.success(approve ? `${name} is on the team.` : `Declined ${name}.`);
    });
  };

  return (
    <ul className="mt-4 divide-y rounded-2xl border">
      {requests.map((request) => (
        <li key={request.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
          <MemberAvatar
            id={request.requester.id}
            name={request.requester.full_name}
            className="size-10 border"
          />

          <div className="min-w-0 flex-1">
            <p className="font-medium">{request.requester.full_name}</p>
            {request.message && (
              <p className="mt-1 text-sm text-muted-foreground">{request.message}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={pending || teamIsFull}
              title={teamIsFull ? "The team is already full" : undefined}
              onClick={() => respond(request.id, true, request.requester.full_name)}
            >
              <Check className="size-4" aria-hidden />
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={pending}
              onClick={() => respond(request.id, false, request.requester.full_name)}
            >
              <X className="size-4" aria-hidden />
              Decline
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
