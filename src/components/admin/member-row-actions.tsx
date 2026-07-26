"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { revokeAccess, setAdminRole } from "@/lib/actions/members";
import type { Enums } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Member" },
  { value: "moderator", label: "Moderator" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super admin" },
];

export function MemberRowActions({
  memberId,
  memberName,
  adminRole,
  viewerIsSuperAdmin,
  isSelf,
}: {
  memberId: string;
  memberName: string;
  adminRole: Enums<"admin_role"> | null;
  viewerIsSuperAdmin: boolean;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ error?: string }>, success: string) =>
    startTransition(async () => {
      const result = await fn();
      if (result?.error) toast.error(result.error);
      else toast.success(success);
    });

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor={`role-${memberId}`}>
        Role for {memberName}
      </label>
      <select
        id={`role-${memberId}`}
        defaultValue={adminRole ?? ""}
        // A super admin changing their own role could lock everyone out.
        disabled={pending || !viewerIsSuperAdmin || isSelf}
        title={
          isSelf
            ? "Ask another super admin to change your role"
            : !viewerIsSuperAdmin
              ? "Only a super admin can change roles"
              : undefined
        }
        onChange={(e) => {
          const data = new FormData();
          data.set("member_id", memberId);
          data.set("admin_role", e.target.value);
          run(() => setAdminRole(data), `Updated ${memberName}.`);
        }}
        className="h-8 rounded-md border border-input bg-transparent px-2 text-xs outline-none disabled:opacity-50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {!isSelf && (
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Revoke ${memberName}'s access? Their teams and skills are kept.`)) return;
            const data = new FormData();
            data.set("member_id", memberId);
            run(() => revokeAccess(data), `${memberName} can no longer sign in.`);
          }}
        >
          Revoke
        </Button>
      )}
    </div>
  );
}
