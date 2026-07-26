"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { withdrawRequest } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";

export function WithdrawRequestButton({ requestId }: { requestId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        const data = new FormData();
        data.set("request_id", requestId);
        startTransition(async () => {
          const result = await withdrawRequest(data);
          if (result?.error) toast.error(result.error);
          else toast.success("Request withdrawn.");
        });
      }}
    >
      Withdraw
    </Button>
  );
}
