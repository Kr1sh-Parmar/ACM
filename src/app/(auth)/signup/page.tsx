"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, MailCheck } from "lucide-react";
import { signUp, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signUp, {});

  if (state.checkEmail) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center shadow-lg shadow-acm-900/5 dark:shadow-black/40">
        <MailCheck className="mx-auto size-8 text-acm-500" aria-hidden />
        <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight">
          Confirm your email
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent you a link. Click it, then sign in to finish your profile.
        </p>
        <Button asChild variant="outline" className="mt-6 w-full">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-lg shadow-acm-900/5 dark:shadow-black/40">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Create your profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A chapter admin reviews new profiles before access opens.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            name="full_name"
            autoComplete="name"
            required
            minLength={2}
            placeholder="Priya Sharma"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
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
          {pending ? "Creating account…" : "Continue"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-acm-600 hover:underline dark:text-acm-300">
          Sign in
        </Link>
      </p>
    </div>
  );
}
