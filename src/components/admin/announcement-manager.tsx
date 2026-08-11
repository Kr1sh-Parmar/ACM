"use client";

import { useActionState, useRef, useTransition } from "react";
import { AlertCircle, Pin, PinOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteAnnouncement,
  postAnnouncement,
  togglePinned,
  type AnnouncementState,
} from "@/lib/actions/announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
};

export function AnnouncementManager({ announcements }: { announcements: AnnouncementRow[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  const [state, formAction, posting] = useActionState<AnnouncementState, FormData>(
    async (prev, formData) => {
      const result = await postAnnouncement(prev, formData);
      if (result.saved) formRef.current?.reset();
      return result;
    },
    {},
  );

  const run = (fn: () => Promise<AnnouncementState>, success: string) =>
    startTransition(async () => {
      const result = await fn();
      if (result?.error) toast.error(result.error);
      else toast.success(success);
    });

  return (
    <div className="space-y-12">
      <form ref={formRef} action={formAction} className="max-w-2xl space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            required
            minLength={3}
            maxLength={120}
            placeholder="Registration closes Friday"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Message</Label>
          <Textarea
            id="body"
            name="body"
            required
            rows={4}
            maxLength={4000}
            placeholder="Teams for Hack the Campus must be finalised by 6pm on Friday."
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="pinned" className="size-4 rounded border-input accent-acm-500" />
          Pin to the top of everyone&apos;s dashboard
        </label>

        {state.error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={posting}>
          {posting ? "Posting…" : "Post announcement"}
        </Button>
      </form>

      <section>
        <h2 className="font-heading text-lg font-semibold">Posted</h2>

        {announcements.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nothing posted yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {announcements.map((note) => (
              <li
                key={note.id}
                className={`rounded-2xl border p-5 ${
                  note.pinned ? "border-jasmine/25 bg-accent" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-heading font-semibold">{note.title}</h3>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {new Date(note.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        const data = new FormData();
                        data.set("id", note.id);
                        data.set("pinned", String(!note.pinned));
                        run(
                          () => togglePinned(data),
                          note.pinned ? "Unpinned." : "Pinned to the top.",
                        );
                      }}
                    >
                      {note.pinned ? (
                        <>
                          <PinOff className="size-4" aria-hidden />
                          Unpin
                        </>
                      ) : (
                        <>
                          <Pin className="size-4" aria-hidden />
                          Pin
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={pending}
                      onClick={() => {
                        if (!confirm(`Delete "${note.title}"?`)) return;
                        const data = new FormData();
                        data.set("id", note.id);
                        run(() => deleteAnnouncement(data), "Announcement deleted.");
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                  {note.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
