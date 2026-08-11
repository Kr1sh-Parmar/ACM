"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Plus, X } from "lucide-react";
import { createTeam, type TeamFormState } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Skill = { id: string; name: string; category: string };

export function CreateTeamDialog({
  eventId,
  tracks,
  skills,
}: {
  eventId: string;
  tracks: string[];
  skills: Skill[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<TeamFormState, FormData>(createTeam, {});
  const [needed, setNeeded] = useState<Skill[]>([]);

  const remaining = skills.filter((s) => !needed.some((n) => n.id === s.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" aria-hidden />
          Start a team
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start a team</DialogTitle>
          <DialogDescription>
            You&apos;ll lead it. List the skills you still need and people can ask to join.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="event_id" value={eventId} />
          {needed.map((skill) => (
            <input key={skill.id} type="hidden" name="skill_id" value={skill.id} />
          ))}

          <div className="space-y-2">
            <Label htmlFor="name">Team name</Label>
            <Input id="name" name="name" required minLength={2} maxLength={60} placeholder="Northstar" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">What you&apos;re building</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              maxLength={1000}
              placeholder="A campus lost-and-found with image search."
            />
          </div>

          {tracks.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="track">Track</Label>
              <NativeSelect id="track" name="track" defaultValue="">
                <option value="">No track</option>
                {tracks.map((track) => (
                  <option key={track} value={track}>
                    {track}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="skill-picker">Skills you need</Label>
            <NativeSelect
              id="skill-picker"
              value=""
              onChange={(e) => {
                const skill = skills.find((s) => s.id === e.target.value);
                if (skill) setNeeded((prev) => [...prev, skill]);
              }}
            >
              <option value="">Add a skill…</option>
              {remaining.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </NativeSelect>

            {needed.length > 0 && (
              <ul className="flex flex-wrap gap-2 pt-1">
                {needed.map((skill) => (
                  <li key={skill.id}>
                    <Badge variant="secondary" className="gap-1 font-mono">
                      {skill.name}
                      <button
                        type="button"
                        aria-label={`Remove ${skill.name}`}
                        onClick={() => setNeeded((prev) => prev.filter((s) => s.id !== skill.id))}
                      >
                        <X className="size-3" aria-hidden />
                      </button>
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              Skills nobody on the team has yet show up as open slots.
            </p>
          </div>

          {state.error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {state.error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating…" : "Create team"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
