"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Catches anything outside the signed-in shell — landing, auth, waiting room. */
export default function RootError({
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
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="glass rim w-full max-w-lg rounded-2xl p-8 text-center shadow-glow-lg">
        <TriangleAlert className="mx-auto size-8 text-jasmine" aria-hidden />
        <h1 className="mt-5 font-heading text-2xl font-bold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The page failed to load. Try again, or head back to the start.
        </p>

        {error.digest && (
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            Reference {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
