import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BirthdayPanel } from "@/components/admin/birthday-panel";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Birthdays" };

export default async function BirthdaysPage() {
  await requireStaff();
  const supabase = await createClient();

  // The date maths lives in upcoming_birthdays() — birthdays ignore the year,
  // which makes "this week" fiddly across new year and 29 February.
  const { data: birthdays } = await supabase.rpc("upcoming_birthdays", { days_ahead: 30 });

  return (
    <div>
      <PageHeader
        title="Birthdays"
        description="Approved members with a birth date on file. Copy a caption and post it on the chapter's socials."
      />

      <BirthdayPanel birthdays={birthdays ?? []} />
    </div>
  );
}
