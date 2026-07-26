"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export type AnnouncementState = { error?: string; saved?: boolean };

export async function postAnnouncement(
  _prev: AnnouncementState,
  formData: FormData,
): Promise<AnnouncementState> {
  const admin = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const pinned = formData.get("pinned") === "on";

  if (title.length < 3 || title.length > 120) {
    return { error: "Give it a title between 3 and 120 characters." };
  }
  if (body.length < 1 || body.length > 4000) {
    return { error: "Write something between 1 and 4000 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .insert({ title, body, pinned, created_by: admin.id });

  if (error) return { error: "That announcement couldn't be posted." };

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
  return { saved: true };
}

export async function togglePinned(formData: FormData): Promise<AnnouncementState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const pinned = formData.get("pinned") === "true";
  if (!id) return { error: "Missing announcement." };

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").update({ pinned }).eq("id", id);
  if (error) return { error: "That couldn't be changed." };

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteAnnouncement(formData: FormData): Promise<AnnouncementState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing announcement." };

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { error: "That couldn't be deleted." };

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
  return {};
}
