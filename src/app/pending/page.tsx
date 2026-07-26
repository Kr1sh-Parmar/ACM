import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleSlash, Clock, MessageCircleQuestion } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Awaiting review" };

const STATES = {
  pending: {
    Icon: Clock,
    title: "Your profile is with the admins",
    body: "A chapter admin reviews new profiles by hand. You'll get access as soon as one of them approves you — nothing more to do right now.",
  },
  needs_info: {
    Icon: MessageCircleQuestion,
    title: "An admin needs a bit more",
    body: "Something on your profile needs a second look before it can be approved.",
  },
  rejected: {
    Icon: CircleSlash,
    title: "Your profile wasn't approved",
    body: "An admin reviewed your profile and didn't approve it. If you think that's a mistake, talk to a chapter admin.",
  },
} as const;

export default async function PendingPage() {
  const profile = await requireProfile();
  if (profile.status === "approved") redirect("/dashboard");

  const { Icon, title, body } = STATES[profile.status];

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border bg-card p-8 text-center shadow-lg shadow-acm-900/5 dark:shadow-black/40">
        <Icon className="mx-auto size-9 text-acm-500" aria-hidden />
        <h1 className="mt-5 font-heading text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-muted-foreground">{body}</p>

        {profile.review_note && (
          <div className="mt-6 rounded-xl border border-jasmine-deep bg-jasmine-soft p-4 text-left dark:bg-jasmine-deep/10">
            <p className="text-sm font-medium text-[#6b5410] dark:text-jasmine">
              Note from the admin
            </p>
            <p className="mt-1 text-sm text-[#6b5410] dark:text-jasmine/90">
              {profile.review_note}
            </p>
          </div>
        )}

        {profile.status !== "rejected" && (
          <Button asChild variant="outline" className="mt-6 w-full">
            <Link href="/onboarding">Edit your profile</Link>
          </Button>
        )}
      </div>

      <form action={signOut} className="mt-6 text-center">
        <Button type="submit" variant="ghost" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
