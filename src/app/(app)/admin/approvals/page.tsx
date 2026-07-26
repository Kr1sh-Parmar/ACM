import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { ReviewCard } from "@/components/admin/review-card";
import type { Profile } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  await requireStaff();

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .in("status", ["pending", "needs_info"])
    .order("created_at", { ascending: true });

  const queue = (data ?? []) as Profile[];
  const waiting = queue.filter((m) => m.status === "pending");
  const askedFor = queue.filter((m) => m.status === "needs_info");

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Approval queue</h1>
      <p className="mt-2 text-muted-foreground">
        Oldest first. Nothing opens up for a member until you approve them.
      </p>

      {queue.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed py-16 text-center">
          <Inbox className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-heading text-lg font-semibold">The queue is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            New profiles land here the moment someone signs up.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-8 grid gap-5 lg:grid-cols-2">
            {waiting.map((member) => (
              <ReviewCard key={member.id} member={member} />
            ))}
          </ul>

          {askedFor.length > 0 && (
            <section className="mt-12">
              <h2 className="font-heading text-lg font-semibold">Waiting on the member</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You asked these people for more detail. They can still edit their profile.
              </p>
              <ul className="mt-5 grid gap-5 lg:grid-cols-2">
                {askedFor.map((member) => (
                  <ReviewCard key={member.id} member={member} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
