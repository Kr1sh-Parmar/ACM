"use server";

import { revalidatePath } from "next/cache";
import { createClient, createSignupClient } from "@/lib/supabase/server";
import { requireAdmin, requireProfile } from "@/lib/auth";

export type MemberActionState = { error?: string; ok?: true };

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

/** Flip a profile to `approved`, clearing whatever note got it rejected. */
async function approveProfile(memberId: string, actorId: string) {
  const supabase = await createClient();
  return supabase
    .from("profiles")
    .update({
      status: "approved",
      review_note: null,
      reviewed_by: actorId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", memberId);
}

/** Put a revoked member back. The mirror image of revokeAccess. */
export async function restoreAccess(formData: FormData): Promise<MemberActionState> {
  const actor = await requireAdmin();

  const memberId = String(formData.get("member_id") ?? "");
  if (!memberId) return { error: "Missing member." };

  const { error } = await approveProfile(memberId, actor.id);
  if (error) return { error: "That couldn't be changed." };

  revalidatePath("/admin/members");
  revalidatePath("/admin/approvals");
  return { ok: true };
}

/**
 * Add a member directly, skipping both the signup form and the approval queue.
 *
 * Two steps, because the account and the approval need different callers: the
 * cookie-less signup client creates the auth user (the on_auth_user_created
 * trigger gives it a `pending` profile), then the admin's own client approves
 * that row — only an admin passes guard_profile_privileged_columns.
 */
export async function createMember(formData: FormData): Promise<MemberActionState> {
  const actor = await requireAdmin();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (fullName.length < 2 || fullName.length > 80) {
    return { error: "Enter a full name between 2 and 80 characters." };
  }
  if (!email.includes("@")) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };

  const { data, error } = await createSignupClient().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return {
      error:
        error.code === "user_already_exists"
          ? "An account already uses that email."
          : error.message,
    };
  }
  // Confirm-email is off for this project, so signUp hands back the new user
  // immediately. If it were ever switched on, there'd be no id to approve.
  if (!data.user) {
    return { error: "The account was created but couldn't be approved. Check the queue." };
  }

  const { error: approveError } = await approveProfile(data.user.id, actor.id);
  if (approveError) {
    return { error: `${fullName} was created but is still pending. Approve them in the queue.` };
  }

  revalidatePath("/admin/members");
  revalidatePath("/admin/approvals");
  return { ok: true };
}
