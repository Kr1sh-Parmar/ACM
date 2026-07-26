import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BirthdayPanel } from "@/components/admin/birthday-panel";

export const metadata: Metadata = { title: "Birthdays" };

export default async function BirthdaysPage() {
  await requireStaff();
  const supabase = await createClient();

  // The date maths lives in upcoming_birthdays() — birthdays ignore the year,
  // which makes "this week" fiddly across new year and 29 February.
  const { data: birthdays } = await supabase.rpc("upcoming_birthdays", { days_ahead: 30 });

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Birthdays</h1>
      <p className="mt-2 text-muted-foreground">
        Approved members with a birth date on file. Copy a caption and post it on the
        chapter&apos;s socials.
      </p>

      <BirthdayPanel birthdays={birthdays ?? []} />
    </div>
  );
}
