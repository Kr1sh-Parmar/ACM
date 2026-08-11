"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { signIn, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, {});

  return (
    <div className="glass rim rounded-2xl p-7 shadow-glow-lg">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Welcome back to the chapter hub.
      </p>

      <form action={formAction} className="mt-7 space-y-4">
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
            autoComplete="current-password"
            required
          />
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

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-acm-300 hover:underline">
          Create your profile
        </Link>
      </p>
    </div>
  );
}
