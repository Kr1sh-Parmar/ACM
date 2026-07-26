"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { disbandTeam, leaveTeam } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";

/**
 * Leave / remove / disband.
 *
 * A lead can't simply leave — that would orphan the team — so their row offers
 * "Disband team" instead. The database enforces this too; this is just the
 * version of the rule people can see.
 */
export function TeamMemberActions({
  teamId,
  eventId,
  memberId,
  memberName,
  isSelf,
  isLeadRow,
  viewerIsLead,
}: {
  teamId: string;
  eventId: string;
  memberId: string;
  memberName: string;
  isSelf: boolean;
  isLeadRow: boolean;
  viewerIsLead: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ error?: string } | void>, success: string) =>
    startTransition(async () => {
      const result = await fn();
      if (result && "error" in result && result.error) toast.error(result.error);
      else toast.success(success);
    });

  const payload = () => {
    const data = new FormData();
    data.set("team_id", teamId);
    data.set("event_id", eventId);
    data.set("member_id", memberId);
    return data;
  };

  if (isSelf && isLeadRow) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        disabled={pending}
        onClick={() => {
          if (!confirm("Disband this team? Everyone on it will be removed.")) return;
          run(() => disbandTeam(payload()), "Team disbanded.");
        }}
      >
        Disband team
      </Button>
    );
  }

  if (isSelf) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run(() => leaveTeam(payload()), "You left the team.")}
      >
        Leave team
      </Button>
    );
  }

  if (viewerIsLead) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        disabled={pending}
        onClick={() => run(() => leaveTeam(payload()), `Removed ${memberName}.`)}
      >
        Remove
      </Button>
    );
  }

  return null;
}
