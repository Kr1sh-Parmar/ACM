"use client";

import { useState, useTransition } from "react";
import { AlertCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createMember } from "@/lib/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AddMemberDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const submit = (formData: FormData) =>
    startTransition(async () => {
      const result = await createMember(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      setOpen(false);
      toast.success("Member added and approved.");
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(undefined);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" aria-hidden />
          Add member
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a member</DialogTitle>
          <DialogDescription>
            Creates an approved account straight away — no signup, no queue. Pass the password on
            to them and have them change it.
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-full-name">Full name</Label>
            <Input
              id="new-full-name"
              name="full_name"
              required
              minLength={2}
              maxLength={80}
              placeholder="Priya Sharma"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              name="email"
              type="email"
              required
              placeholder="priya@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">Starting password</Label>
            <Input
              id="new-password"
              name="password"
              type="text"
              required
              minLength={8}
              autoComplete="off"
              placeholder="At least 8 characters"
            />
            <p className="text-xs text-muted-foreground">
              Shown as you type so you can copy it — they can change it after signing in.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating…" : "Create member"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
