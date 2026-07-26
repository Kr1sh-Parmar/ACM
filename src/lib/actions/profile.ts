"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BRANCHES, DEPARTMENTS, DESIGNATIONS } from "@/lib/constants";

export type ProfileFormState = { error?: string; saved?: boolean };

/** Empty string from an untouched input should become NULL, not "". */
const orNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

function validateUrl(raw: string | null, host: string, label: string) {
  if (!raw) return { value: null as string | null };
  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return { error: `That ${label} link isn't a valid URL.` };
  }
  if (!url.hostname.endsWith(host)) {
    return { error: `The ${label} link should point at ${host}.` };
  }
  return { value: url.toString() };
}

/**
 * Used by both /onboarding and /profile — same fields, same rules, one code path.
 * Everything here is re-validated server side: the browser's `required` and
 * `<select>` options are conveniences, not a trust boundary.
 */
export async function saveProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = String(formData.get("full_name") ?? "").trim();
  const designation = orNull(formData.get("designation"));
  const department = orNull(formData.get("department"));
  const branch = orNull(formData.get("branch"));
  const yearRaw = orNull(formData.get("year"));
  const birthDate = orNull(formData.get("birth_date"));
  const bio = orNull(formData.get("bio"));

  if (fullName.length < 2 || fullName.length > 80) {
    return { error: "Your name needs to be between 2 and 80 characters." };
  }
  // Both are optional on their own; the pair is not. Most members hold no
  // officer post, and an officer may sit outside every department — but
  // belonging to neither means the profile says nothing about who you are.
  if (designation && !DESIGNATIONS.includes(designation as (typeof DESIGNATIONS)[number])) {
    return { error: "That officer position isn't one of the chapter's." };
  }
  if (department && !DEPARTMENTS.includes(department as (typeof DEPARTMENTS)[number])) {
    return { error: "That department isn't one of the chapter's." };
  }
  if (!designation && !department) {
    return { error: "Pick a department, an officer position, or both." };
  }
  if (!branch || !BRANCHES.includes(branch as (typeof BRANCHES)[number])) {
    return { error: "Pick your branch." };
  }

  const year = Number(yearRaw);
  if (!Number.isInteger(year) || year < 1 || year > 5) {
    return { error: "Pick your year of study." };
  }

  if (!birthDate) return { error: "Enter your date of birth." };
  const birth = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(birth.getTime()) || birth >= new Date() || birth < new Date("1950-01-02")) {
    return { error: "That date of birth doesn't look right." };
  }

  if (bio && bio.length > 500) return { error: "Keep your bio under 500 characters." };

  const github = validateUrl(orNull(formData.get("github_url")), "github.com", "GitHub");
  if (github.error) return { error: github.error };
  const linkedin = validateUrl(orNull(formData.get("linkedin_url")), "linkedin.com", "LinkedIn");
  if (linkedin.error) return { error: linkedin.error };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      designation,
      department,
      branch,
      year,
      birth_date: birthDate,
      bio,
      github_url: github.value ?? null,
      linkedin_url: linkedin.value ?? null,
      open_to_invites: formData.get("open_to_invites") === "on",
    })
    .eq("id", user.id);

  if (error) return { error: "Your profile couldn't be saved. Try again." };

  revalidatePath("/", "layout");

  const next = String(formData.get("redirect_to") ?? "");
  if (next === "/pending") redirect("/pending");

  return { saved: true };
}
