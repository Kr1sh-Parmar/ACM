import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { ReviewCard } from "@/components/admin/review-card";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
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
      <PageHeader
        title="Approval queue"
        description="Oldest first. Nothing opens up for a member until you approve them."
      />

      {queue.length === 0 ? (
        <EmptyState icon={Inbox} title="The queue is empty">
          New profiles land here the moment someone signs up.
        </EmptyState>
      ) : (
        <>
          <ul className="grid gap-5 lg:grid-cols-2">
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
