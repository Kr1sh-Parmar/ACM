"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Errors say what broke and what to do about it. They do not apologise and
 * they never show the raw message — that leaks query shapes to whoever is
 * looking. `digest` is the handle for finding it in the server logs.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="glass rim mx-auto max-w-lg rounded-2xl p-8 text-center shadow-glow-lg">
      <TriangleAlert className="mx-auto size-8 text-jasmine" aria-hidden />
      <h1 className="mt-5 font-heading text-2xl font-bold tracking-tight">
        This page didn&apos;t load
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Something went wrong on our side. Trying again usually works — if it doesn&apos;t,
        tell a chapter admin.
      </p>

      {error.digest && (
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          Reference {error.digest}
        </p>
      )}

      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </div>
  );
}
