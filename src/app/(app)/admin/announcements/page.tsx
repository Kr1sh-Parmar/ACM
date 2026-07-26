import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementManager } from "@/components/admin/announcement-manager";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, pinned, created_at")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Announcements</h1>
      <p className="mt-2 text-muted-foreground">
        Posted to every approved member&apos;s dashboard. Pinned ones sit at the top.
      </p>

      <div className="mt-8">
        <AnnouncementManager announcements={announcements ?? []} />
      </div>
    </div>
  );
}
