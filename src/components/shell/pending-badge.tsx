"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Live count of profiles waiting on review.
 *
 * Realtime tells us *that* the queue changed; we re-count rather than trying to
 * add and subtract from the payload. A count query is cheap and can't drift out
 * of sync after a missed or out-of-order event.
 */
export function PendingBadge({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const supabase = createClient();

    const recount = async () => {
      const { count: fresh } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (fresh !== null) setCount(fresh);
    };

    const channel = supabase
      .channel("approval-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        recount,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  if (count === 0) return null;

  return (
    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-acm-500 px-1.5 font-mono text-[11px] font-medium text-white">
      {count}
    </span>
  );
}
