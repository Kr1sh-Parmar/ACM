"use client";

import { useActionState, useState } from "react";
import { roleLabel } from "@/lib/constants";
import { MemberAvatar } from "@/components/shell/member-avatar";
import { AlertCircle, Cake, Check, ExternalLink, X } from "lucide-react";
import { reviewMember, type ReviewResult } from "@/lib/actions/approvals";
import type { Profile } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const YEAR_LABEL = ["", "1st", "2nd", "3rd", "4th", "5th"];

/** Birthday, not age — the day is what the admins actually use. */
function formatBirthday(iso: string | null) {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function ReviewCard({ member }: { member: Profile }) {
  const [state, formAction, pending] = useActionState<ReviewResult, FormData>(
    reviewMember,
    {},
  );
  // Which decision is armed and waiting on a note. Approve needs no note, so it
  // submits straight away.
  const [armed, setArmed] = useState<"rejected" | "needs_info" | null>(null);

  return (
    <li className="rounded-2xl border bg-card p-5 shadow-sm">
      <form action={formAction}>
        <input type="hidden" name="member_id" value={member.id} />

        <div className="flex items-start gap-4">
          <MemberAvatar id={member.id} name={member.full_name} className="size-12 border" />

          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-lg font-semibold leading-tight">
              {member.full_name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {roleLabel(member.designation, member.department)}
            </p>
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
              {member.email}
            </p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Branch</dt>
            <dd>{member.branch ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Year</dt>
            <dd>{member.year ? `${YEAR_LABEL[member.year]} year` : "—"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Birthday</dt>
            <dd className="flex items-center gap-1.5">
              <Cake className="size-3.5 text-jasmine-deep" aria-hidden />
              <span className="font-mono">{formatBirthday(member.birth_date)}</span>
            </dd>
          </div>
        </dl>

        {member.bio && <p className="mt-4 text-sm text-muted-foreground">{member.bio}</p>}

        {(member.github_url || member.linkedin_url) && (
          <div className="mt-4 flex gap-3">
            {member.github_url && (
              <a
                href={member.github_url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="size-4" aria-hidden />
                GitHub
              </a>
            )}
            {member.linkedin_url && (
              <a
                href={member.linkedin_url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="size-4" aria-hidden />
                LinkedIn
              </a>
            )}
          </div>
        )}

        {armed && (
          <div className="mt-4 space-y-2">
            <label htmlFor={`note-${member.id}`} className="text-sm font-medium">
              {armed === "rejected"
                ? "Why aren't they approved?"
                : "What do you need from them?"}
            </label>
            <Textarea
              id={`note-${member.id}`}
              name="note"
              rows={2}
              required
              maxLength={500}
              autoFocus
              placeholder={
                armed === "rejected"
                  ? "Not on the committee list for this term."
                  : "Add your branch and the skills you actually work with."
              }
            />
            <p className="text-xs text-muted-foreground">{member.full_name} will see this.</p>
          </div>
        )}

        {state.error && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {state.error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {armed ? (
            <>
              <Button
                type="submit"
                name="decision"
                value={armed}
                variant={armed === "rejected" ? "destructive" : "default"}
                size="sm"
                disabled={pending}
              >
                {pending
                  ? "Saving…"
                  : armed === "rejected"
                    ? "Reject profile"
                    : "Send the question"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setArmed(null)}
                disabled={pending}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                type="submit"
                name="decision"
                value="approved"
                size="sm"
                disabled={pending}
              >
                <Check className="size-4" aria-hidden />
                {pending ? "Approving…" : "Approve"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setArmed("needs_info")}
                disabled={pending}
              >
                Ask for more
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setArmed("rejected")}
                disabled={pending}
              >
                <X className="size-4" aria-hidden />
                Reject
              </Button>
            </>
          )}
        </div>
      </form>
    </li>
  );
}
