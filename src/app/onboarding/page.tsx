import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata: Metadata = { title: "Finish your profile" };

export default async function OnboardingPage() {
  const profile = await requireProfile();
  const returning = profile.status === "needs_info";

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-acm-600 dark:text-acm-300">
        Step 1 of 2
      </p>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight">
        {returning ? "Update your profile" : "Tell us who you are"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {returning
          ? "An admin asked for more detail before approving you."
          : "An admin checks this against the committee list, so use your real details."}
      </p>

      {returning && profile.review_note && (
        <div className="mt-6 rounded-xl border border-jasmine-deep bg-jasmine-soft p-4 dark:bg-jasmine-deep/10">
          <p className="text-sm font-medium text-[#6b5410] dark:text-jasmine">
            What the admin asked for
          </p>
          <p className="mt-1 text-sm text-[#6b5410] dark:text-jasmine/90">
            {profile.review_note}
          </p>
        </div>
      )}

      <div className="mt-8">
        <ProfileForm
          profile={profile}
          redirectTo="/pending"
          submitLabel="Submit for review"
        />
      </div>
    </div>
  );
}
