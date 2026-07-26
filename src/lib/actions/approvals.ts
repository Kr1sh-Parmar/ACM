"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export type ReviewResult = { error?: string };

const DECISIONS = ["approved", "rejected", "needs_info"] as const;
type Decision = (typeof DECISIONS)[number];

/** Rejecting or asking for more must say why — the member is shown this text. */
const NEEDS_NOTE: Record<Decision, boolean> = {
  approved: false,
  rejected: true,
  needs_info: true,
};

/**
 * Single write path for every approval decision.
 *
 * The database is the real gatekeeper: the `profiles_update_admin` policy and
 * the `guard_profile_privileged_columns` trigger both reject a non-admin caller.
 * requireAdmin() here only turns that error into a redirect. The audit row is
 * written by a trigger, so no code path can forget to log the decision.
 */
export async function reviewMember(
  _prev: ReviewResult,
  formData: FormData,
): Promise<ReviewResult> {
  const admin = await requireAdmin();

  const memberId = String(formData.get("member_id") ?? "");
  const decision = String(formData.get("decision") ?? "") as Decision;
  const note = String(formData.get("note") ?? "").trim();

  if (!memberId) return { error: "Missing member." };
  if (!DECISIONS.includes(decision)) return { error: "Unknown decision." };
  if (memberId === admin.id) return { error: "You can't review your own profile." };

  if (NEEDS_NOTE[decision]) {
    if (note.length < 3) {
      return {
        error:
          decision === "rejected"
            ? "Give a reason — the member sees it."
            : "Say what you need from them.",
      };
    }
    if (note.length > 500) return { error: "Keep it under 500 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      status: decision,
      review_note: NEEDS_NOTE[decision] ? note : null,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", memberId);

  if (error) return { error: "That decision couldn't be saved. Try again." };

  revalidatePath("/admin/approvals");
  revalidatePath("/admin");
  return {};
}
