"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export type EventFormState = { error?: string };

const MAX_BANNER_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const orNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

/**
 * Create or update an event. One action for both, because the fields and the
 * validation are identical and the only difference is whether an id came along.
 */
export async function saveEvent(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const eventId = orNull(formData.get("event_id"));
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const status = String(formData.get("status") ?? "draft");
  const description = orNull(formData.get("description"));
  const startDate = orNull(formData.get("start_date"));
  const endDate = orNull(formData.get("end_date"));
  const deadline = orNull(formData.get("registration_deadline"));
  const teamMin = Number(formData.get("team_min") ?? 1);
  const teamMax = Number(formData.get("team_max") ?? 4);

  if (title.length < 3 || title.length > 120) {
    return { error: "Give the event a title between 3 and 120 characters." };
  }
  if (type !== "hackathon" && type !== "project") {
    return { error: "Pick whether this is a hackathon or a project." };
  }
  if (status !== "draft" && status !== "open" && status !== "closed") {
    return { error: "Unknown status." };
  }
  if (!Number.isInteger(teamMin) || teamMin < 1) return { error: "Minimum team size must be at least 1." };
  if (!Number.isInteger(teamMax) || teamMax < teamMin) {
    return { error: "Maximum team size can't be smaller than the minimum." };
  }
  if (startDate && endDate && endDate < startDate) {
    return { error: "The end date can't be before the start date." };
  }

  const tracks = String(formData.get("tracks") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  let bannerUrl: string | undefined;
  const banner = formData.get("banner");
  if (banner instanceof File && banner.size > 0) {
    if (banner.size > MAX_BANNER_BYTES) return { error: "Banners must be under 4 MB." };
    if (!ALLOWED_IMAGE_TYPES.includes(banner.type)) {
      return { error: "Use a JPEG, PNG or WebP banner." };
    }
    const ext = banner.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${eventId ?? crypto.randomUUID()}/banner.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("banners")
      .upload(path, banner, { upsert: true, contentType: banner.type });
    if (uploadError) return { error: "That banner couldn't be uploaded." };
    const { data } = supabase.storage.from("banners").getPublicUrl(path);
    bannerUrl = `${data.publicUrl}?v=${Date.now()}`;
  }

  const payload = {
    title,
    type: type as "hackathon" | "project",
    status: status as "draft" | "open" | "closed",
    description,
    start_date: startDate,
    end_date: endDate,
    registration_deadline: deadline,
    team_min: teamMin,
    team_max: teamMax,
    tracks,
    ...(bannerUrl ? { banner_url: bannerUrl } : {}),
  };

  if (eventId) {
    const { error } = await supabase.from("events").update(payload).eq("id", eventId);
    if (error) return { error: "That event couldn't be saved." };
    revalidatePath(`/events/${eventId}`);
  } else {
    const { data, error } = await supabase
      .from("events")
      .insert({ ...payload, created_by: admin.id })
      .select("id")
      .single();
    if (error || !data) return { error: "That event couldn't be created." };
    revalidatePath("/admin/events");
    revalidatePath("/events");
    redirect(`/admin/events/${data.id}`);
  }

  revalidatePath("/admin/events");
  revalidatePath("/events");
  return {};
}

/** Draft → Open → Closed, from the event list without opening the full form. */
export async function setEventStatus(formData: FormData): Promise<EventFormState> {
  await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!eventId) return { error: "Missing event." };
  if (!["draft", "open", "closed"].includes(status)) return { error: "Unknown status." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ status: status as "draft" | "open" | "closed" })
    .eq("id", eventId);

  if (error) return { error: "That status couldn't be changed." };

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  return {};
}
