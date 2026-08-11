import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { Callout } from "@/components/shell/callout";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata: Metadata = { title: "Finish your profile" };

export default async function OnboardingPage() {
  const profile = await requireProfile();
  const returning = profile.status === "needs_info";

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <p className="font-mono text-xs tracking-[0.2em] text-acm-300 uppercase">Step 1 of 2</p>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight text-balance">
        {returning ? "Update your profile" : "Tell us who you are"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {returning
          ? "An admin asked for more detail before approving you."
          : "An admin checks this against the committee list, so use your real details."}
      </p>

      {returning && profile.review_note && (
        <div className="mt-6">
          <Callout title="What the admin asked for">{profile.review_note}</Callout>
        </div>
      )}

      <div className="glass rim mt-8 rounded-2xl p-6 shadow-glow-md sm:p-7">
        <ProfileForm
          profile={profile}
          redirectTo="/pending"
          submitLabel="Submit for review"
        />
      </div>
    </div>
  );
}
