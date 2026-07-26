"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireProfile } from "@/lib/auth";

export type MemberActionState = { error?: string };

const ADMIN_ROLES = ["super_admin", "admin", "moderator"] as const;

/**
 * Promote or demote. Restricted to super admins by the
 * guard_profile_privileged_columns trigger; the check here is for the redirect
 * and the error message, not for the security.
 */
export async function setAdminRole(formData: FormData): Promise<MemberActionState> {
  const actor = await requireProfile();
  if (actor.admin_role !== "super_admin") {
    return { error: "Only a super admin can change roles." };
  }

  const memberId = String(formData.get("member_id") ?? "");
  const raw = String(formData.get("admin_role") ?? "");
  const role = raw === "" ? null : (raw as (typeof ADMIN_ROLES)[number]);

  if (!memberId) return { error: "Missing member." };
  if (role !== null && !ADMIN_ROLES.includes(role)) return { error: "Unknown role." };
  if (memberId === actor.id) {
    return { error: "You can't change your own role. Ask another super admin." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ admin_role: role })
    .eq("id", memberId);

  if (error) return { error: "That role couldn't be changed." };

  revalidatePath("/admin/members");
  return {};
}

/**
 * Revoke a member's access without deleting them — their teams, skills and
 * history stay intact, they simply stop getting past the approval gate.
 */
export async function revokeAccess(formData: FormData): Promise<MemberActionState> {
  const actor = await requireAdmin();

  const memberId = String(formData.get("member_id") ?? "");
  const note = String(formData.get("note") ?? "").trim() || "Access revoked by an admin.";
  if (!memberId) return { error: "Missing member." };
  if (memberId === actor.id) return { error: "You can't revoke your own access." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      status: "rejected",
      review_note: note,
      reviewed_by: actor.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", memberId);

  if (error) return { error: "That couldn't be changed." };

  revalidatePath("/admin/members");
  revalidatePath("/admin/approvals");
  return {};
}
