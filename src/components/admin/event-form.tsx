"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { saveEvent, type EventFormState } from "@/lib/actions/events";
import type { Event } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export function EventForm({ event }: { event?: Event }) {
  const [state, formAction, pending] = useActionState<EventFormState, FormData>(saveEvent, {});

  return (
    <form action={formAction} className="space-y-6">
      {event && <input type="hidden" name="event_id" value={event.id} />}

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          minLength={3}
          maxLength={120}
          defaultValue={event?.title}
          placeholder="Hack the Campus 2026"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <NativeSelect
            id="type"
            name="type"
            required
            defaultValue={event?.type ?? "hackathon"}
          >
            <option value="hackathon">Hackathon</option>
            <option value="project">Project</option>
          </NativeSelect>
          <p className="text-xs text-muted-foreground">
            In a hackathon a member can only be on one team. Projects allow several.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect id="status" name="status" defaultValue={event?.status ?? "draft"}>
            <option value="draft">Draft — only staff can see it</option>
            <option value="open">Open — members can form teams</option>
            <option value="closed">Closed — no new teams or joins</option>
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={event?.description ?? ""}
          placeholder="What it is, who it's for, what to bring."
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="start_date">Starts</Label>
          <Input id="start_date" name="start_date" type="date" defaultValue={event?.start_date ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">Ends</Label>
          <Input id="end_date" name="end_date" type="date" defaultValue={event?.end_date ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="registration_deadline">Registration closes</Label>
          <Input
            id="registration_deadline"
            name="registration_deadline"
            type="date"
            defaultValue={event?.registration_deadline ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="team_min">Smallest team</Label>
          <Input
            id="team_min"
            name="team_min"
            type="number"
            min={1}
            max={20}
            defaultValue={event?.team_min ?? 1}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="team_max">Largest team</Label>
          <Input
            id="team_max"
            name="team_max"
            type="number"
            min={1}
            max={20}
            defaultValue={event?.team_max ?? 4}
          />
          <p className="text-xs text-muted-foreground">
            Open slots on a team are worked out from this.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tracks">Tracks</Label>
        <Input
          id="tracks"
          name="tracks"
          defaultValue={(event?.tracks ?? []).join(", ")}
          placeholder="Fintech, Health, Open innovation"
        />
        <p className="text-xs text-muted-foreground">Separate with commas. Leave empty for none.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="banner">Banner</Label>
        <Input
          id="banner"
          name="banner"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="cursor-pointer"
        />
        <p className="text-xs text-muted-foreground">
          JPEG, PNG or WebP, up to 4 MB. {event?.banner_url && "Leave empty to keep the current one."}
        </p>
      </div>

      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-destructive/12 px-3 py-2.5 text-sm text-destructive ring-1 ring-destructive/25 ring-inset"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : event ? "Save changes" : "Create event"}
      </Button>
    </form>
  );
}
