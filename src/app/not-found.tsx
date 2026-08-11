import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="glass rim w-full max-w-lg rounded-2xl p-8 text-center shadow-glow-lg">
        <Compass className="mx-auto size-8 text-acm-300" aria-hidden />
        <p className="mt-5 font-mono text-xs tracking-[0.2em] text-acm-300 uppercase">404</p>
        <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight">
          There&apos;s nothing at this address
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The link may be out of date, or the event or team it pointed at was removed.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/dashboard">Go to your dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/events">Browse events</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
