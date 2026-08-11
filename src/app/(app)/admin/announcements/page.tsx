import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementManager } from "@/components/admin/announcement-manager";
import { PageHeader } from "@/components/shell/page-header";

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
      <PageHeader
        title="Announcements"
        description="Posted to every approved member's dashboard. Pinned ones sit at the top."
      />

      <AnnouncementManager announcements={announcements ?? []} />
    </div>
  );
}
