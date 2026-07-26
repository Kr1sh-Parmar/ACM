import Link from "next/link";
import { MemberAvatar } from "@/components/shell/member-avatar";
import { createClient } from "@/lib/supabase/server";
import { requireApproved } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";
import { AppNav, type NavLink } from "@/components/shell/app-nav";
import { PendingBadge } from "@/components/shell/pending-badge";
import { Button } from "@/components/ui/button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireApproved();
  const isStaff = Boolean(profile.admin_role);

  let pendingCount = 0;
  if (isStaff) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  const links: NavLink[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/events", label: "Events" },
    { href: "/directory", label: "Directory" },
    ...(isStaff
      ? [
          {
            href: "/admin",
            label: "Admin",
            badge: <PendingBadge initialCount={pendingCount} />,
          },
        ]
      : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
          <Link
            href="/dashboard"
            className="shrink-0 font-heading text-base font-bold tracking-tight"
          >
            <span className="text-acm-500">ACM</span> Chapter
          </Link>

          <AppNav links={links} />

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent"
            >
              <MemberAvatar
                id={profile.id}
                name={profile.full_name}
                className="size-7 border"
              />
              <span className="hidden sm:inline">{profile.full_name.split(" ")[0]}</span>
            </Link>

            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
    </>
  );
}
