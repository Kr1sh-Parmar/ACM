import type { Metadata } from "next";
import { MemberAvatar } from "@/components/shell/member-avatar";
import { requireStaff } from "@/lib/auth";
import { roleLabel } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { MemberRowActions } from "@/components/admin/member-row-actions";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Members" };

const YEAR_LABEL = ["", "1st", "2nd", "3rd", "4th", "5th"];

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  moderator: "Moderator",
};

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const viewer = await requireStaff();
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, designation, department, branch, year, admin_role, status")
    .eq("status", "approved")
    .order("admin_role", { nullsFirst: false })
    .order("full_name");

  if (q) query = query.ilike("full_name", `%${q}%`);

  const { data: members } = await query;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Members</h1>
          <p className="mt-2 text-muted-foreground">
            {(members ?? []).length} approved members. Staff are listed first.
          </p>
        </div>

        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by name"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </form>
      </div>

      <ul className="mt-8 divide-y rounded-2xl border">
        {(members ?? []).map((member) => (
          <li key={member.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <MemberAvatar id={member.id} name={member.full_name} className="size-10 border" />

            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {member.full_name}
                {member.admin_role && (
                  <Badge className="bg-acm-500 text-xs hover:bg-acm-500">
                    {ROLE_LABEL[member.admin_role]}
                  </Badge>
                )}
              </p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {member.email}
              </p>
              <p className="text-sm text-muted-foreground">
                {roleLabel(member.designation, member.department)}
                {member.branch && ` · ${member.branch}`}
                {member.year && ` · ${YEAR_LABEL[member.year]} year`}
              </p>
            </div>

            <MemberRowActions
              memberId={member.id}
              memberName={member.full_name}
              adminRole={member.admin_role}
              viewerIsSuperAdmin={viewer.admin_role === "super_admin"}
              isSelf={member.id === viewer.id}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
