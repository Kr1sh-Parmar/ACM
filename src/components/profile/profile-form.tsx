"use client";

import { useActionState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { MemberAvatar } from "@/components/shell/member-avatar";
import { saveProfile, type ProfileFormState } from "@/lib/actions/profile";
import { BRANCHES, DEPARTMENTS, DESIGNATIONS, YEARS } from "@/lib/constants";
import type { Profile } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/ui/native-select";

type Props = {
  profile: Profile;
  /** Onboarding sends you on to the waiting room; editing stays put. */
  redirectTo?: "/pending";
  submitLabel: string;
};

export function ProfileForm({ profile, redirectTo, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    saveProfile,
    {},
  );
  return (
    <form action={formAction} className="space-y-8">
      {redirectTo && <input type="hidden" name="redirect_to" value={redirectTo} />}

      <section className="flex items-center gap-5">
        <MemberAvatar
          id={profile.id}
          name={profile.full_name}
          className="size-20 border"
        />
        <div>
          <p className="text-sm font-medium">Your avatar</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Generated from your account, so it&apos;s yours alone and nobody has to
            upload anything.
          </p>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            name="full_name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={profile.full_name}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <NativeSelect
            id="department"
            name="department"
            defaultValue={profile.department ?? ""}
          >
            <option value="">Not in a department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor="designation">Officer position</Label>
          <NativeSelect
            id="designation"
            name="designation"
            defaultValue={profile.designation ?? ""}
          >
            <option value="">Not an officer</option>
            {DESIGNATIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </NativeSelect>
          {/* Neither field is individually required, but the pair is — most
              members hold no officer post, and the seven who do may sit outside
              any department. The server enforces "at least one". */}
          <p className="text-xs text-muted-foreground">
            Most members leave this blank. Pick at least a department or a position.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="year">Year of study</Label>
          <NativeSelect
            id="year"
            name="year"
            required
            defaultValue={profile.year ?? ""}
          >
            <option value="" disabled>
              Select a year
            </option>
            {YEARS.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="branch">Branch</Label>
          <NativeSelect
            id="branch"
            name="branch"
            required
            defaultValue={profile.branch ?? ""}
          >
            <option value="" disabled>
              Select a branch
            </option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor="birth_date">Date of birth</Label>
          {/* Native date input — no picker library, and it's the control people
              already know from every other form on their phone. */}
          <Input
            id="birth_date"
            name="birth_date"
            type="date"
            required
            defaultValue={profile.birth_date ?? ""}
            max={new Date().toISOString().slice(0, 10)}
          />
          <p className="text-xs text-muted-foreground">
            Admins use this to wish you on the chapter&apos;s socials.
          </p>
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="bio">
            Short bio <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="bio"
            name="bio"
            rows={3}
            maxLength={500}
            defaultValue={profile.bio ?? ""}
            placeholder="What you work on, what you'd like to learn."
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="github_url">
              GitHub <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="github_url"
              name="github_url"
              defaultValue={profile.github_url ?? ""}
              placeholder="github.com/yourname"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin_url">
              LinkedIn <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="linkedin_url"
              name="linkedin_url"
              defaultValue={profile.linkedin_url ?? ""}
              placeholder="linkedin.com/in/yourname"
            />
          </div>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
          <div>
            <Label htmlFor="open_to_invites" className="text-sm font-medium">
              Open to team invites
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Teams looking for your skills can find you in the directory.
            </p>
          </div>
          <Switch
            id="open_to_invites"
            name="open_to_invites"
            defaultChecked={profile.open_to_invites}
          />
        </div>
      </section>

      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      {state.saved && (
        <p className="flex items-center gap-2 rounded-lg bg-acm-500/12 px-3 py-2 text-sm text-acm-200">
          <Check className="size-4 shrink-0" aria-hidden />
          Profile saved.
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
