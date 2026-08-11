"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { restoreAccess } from "@/lib/actions/members";
import { Button } from "@/components/ui/button";

export function RestoreMemberButton({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const data = new FormData();
          data.set("member_id", memberId);
          const result = await restoreAccess(data);
          if (result?.error) toast.error(result.error);
          else toast.success(`${memberName} can sign in again.`);
        })
      }
    >
      Restore
    </Button>
  );
}
