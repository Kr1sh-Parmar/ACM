import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

/**
 * The signed-in member's profile row, or null.
 * `cache` dedupes it across every component in a single render pass, so a page
 * and its five children cost one query, not six.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireApproved(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.status !== "approved") redirect("/pending");
  return profile;
}

/** Approve/reject rights. Moderators are staff but cannot approve. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireApproved();
  if (profile.admin_role !== "admin" && profile.admin_role !== "super_admin") {
    redirect("/dashboard");
  }
  return profile;
}

/** Any privileged seat — can see admin surfaces, may not act on all of them. */
export async function requireStaff(): Promise<Profile> {
  const profile = await requireApproved();
  if (!profile.admin_role) redirect("/dashboard");
  return profile;
}
