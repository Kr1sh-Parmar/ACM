"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { addGuest, removeGuest } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * A team can carry people who aren't in the committee. The lead types a name
 * and that is the whole record — they hold a slot, nothing else. Kept next to
 * the remove button because the two only ever make sense together.
 */
export function AddGuestDialog({ teamId, eventId }: { teamId: string; eventId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="size-4" aria-hidden />
          Add external member
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add someone from outside ACM</DialogTitle>
          <DialogDescription>
            They take a slot on this team. No account is created — they
            won&apos;t appear in the directory, and they don&apos;t count toward
            the skills the team asked for.
          </DialogDescription>
        </DialogHeader>

        <form
          action={(formData) => {
            startTransition(async () => {
              const result = await addGuest(formData);
              if (result?.error) toast.error(result.error);
              else {
                toast.success("Added to the team.");
                setOpen(false);
              }
            });
          }}
        >
          <input type="hidden" name="team_id" value={teamId} />
          <input type="hidden" name="event_id" value={eventId} />

          <Input
            name="full_name"
            required
            minLength={2}
            maxLength={80}
            placeholder="Full name"
            aria-label="Full name"
          />

          <DialogFooter className="mt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add to team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RemoveGuestButton({
  guestId,
  teamId,
  eventId,
  name,
}: {
  guestId: string;
  teamId: string;
  eventId: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      disabled={pending}
      onClick={() => {
        const data = new FormData();
        data.set("guest_id", guestId);
        data.set("team_id", teamId);
        data.set("event_id", eventId);
        startTransition(async () => {
          const result = await removeGuest(data);
          if (result?.error) toast.error(result.error);
          else toast.success(`Removed ${name}.`);
        });
      }}
    >
      Remove
    </Button>
  );
}
