import type { Metadata } from "next";
import Link from "next/link";
import { MemberAvatar } from "@/components/shell/member-avatar";
import { Search } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { roleLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { AddMemberDialog } from "@/components/admin/add-member-dialog";
import { MemberRowActions } from "@/components/admin/member-row-actions";
import { RestoreMemberButton } from "@/components/admin/restore-member-button";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  const viewer = await requireStaff();
  const { q, view } = await searchParams;
  const revoked = view === "revoked";
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, email, designation, department, branch, year, admin_role, status, review_note, reviewed_at",
    )
    .eq("status", revoked ? "rejected" : "approved");

  // Revoked is a history list, newest decision first; the roster is a directory.
  query = revoked
    ? query.order("reviewed_at", { ascending: false, nullsFirst: false })
    : query.order("admin_role", { nullsFirst: false }).order("full_name");

  if (q) query = query.ilike("full_name", `%${q}%`);

  const { data: members } = await query;
  const rows = members ?? [];

  const isAdmin = viewer.admin_role === "admin" || viewer.admin_role === "super_admin";

  return (
    <div>
      <PageHeader
        title="Members"
        description={
          revoked
            ? "Accounts that were revoked or turned down. Restoring one lets them sign in again with everything they had."
            : `${rows.length} approved ${rows.length === 1 ? "member" : "members"}. Staff are listed first.`
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <form className="relative">
              {revoked && <input type="hidden" name="view" value="revoked" />}
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search by name"
                aria-label="Search members by name"
                className="w-56 pl-9"
              />
            </form>
            {isAdmin && <AddMemberDialog />}
          </div>
        }
      />

      <div className="mb-6 flex items-center gap-1">
        {[
          { label: "Approved", href: "/admin/members", active: !revoked },
          { label: "Revoked", href: "/admin/members?view=revoked", active: revoked },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab.active
                ? "bg-acm-500/20 text-acm-100 ring-1 ring-acm-300/25 ring-inset"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Search} title={q ? "Nobody matches that" : "Nothing here"}>
          {q
            ? `No ${revoked ? "revoked" : "approved"} member's name contains "${q}".`
            : revoked
              ? "Nobody has been revoked or turned down."
              : "No approved members yet."}
        </EmptyState>
      ) : (
        <div className="solid rim overflow-hidden rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Email</TableHead>
                {revoked ? (
                  <>
                    <TableHead>Reason</TableHead>
                    <TableHead>Revoked</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>Role</TableHead>
                    <TableHead>Branch</TableHead>
                  </>
                )}
                <TableHead className="text-right">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <MemberAvatar
                        id={member.id}
                        name={member.full_name}
                        className="size-8 ring-1 ring-white/15"
                      />
                      <span className="flex flex-wrap items-center gap-2 font-medium">
                        {member.full_name}
                        {member.admin_role && (
                          <Badge className="text-xs">{ROLE_LABEL[member.admin_role]}</Badge>
                        )}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {member.email}
                  </TableCell>

                  {revoked ? (
                    <>
                      <TableCell className="max-w-xs text-sm text-muted-foreground">
                        {member.review_note ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {member.reviewed_at
                          ? new Date(member.reviewed_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-sm text-muted-foreground">
                        {roleLabel(member.designation, member.department)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {member.branch ?? "—"}
                        {member.year ? ` · ${YEAR_LABEL[member.year]}` : ""}
                      </TableCell>
                    </>
                  )}

                  <TableCell className="text-right">
                    {revoked ? (
                      isAdmin ? (
                        <RestoreMemberButton memberId={member.id} memberName={member.full_name} />
                      ) : (
                        <span className="text-xs text-muted-foreground">Admins only</span>
                      )
                    ) : (
                      <MemberRowActions
                        memberId={member.id}
                        memberName={member.full_name}
                        adminRole={member.admin_role}
                        viewerIsSuperAdmin={viewer.admin_role === "super_admin"}
                        isSelf={member.id === viewer.id}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
