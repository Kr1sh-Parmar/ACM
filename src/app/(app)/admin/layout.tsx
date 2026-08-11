import { requireStaff } from "@/lib/auth";
import { AppNav, type NavLink } from "@/components/shell/app-nav";

const SECTIONS: NavLink[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/approvals", label: "Approvals" },
  { href: "/admin/birthdays", label: "Birthdays" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/skills", label: "Skill tags" },
  { href: "/admin/audit", label: "Audit log" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();

  return (
    <div>
      <div className="mb-8 border-b border-white/8 pb-4">
        <p className="font-mono text-xs tracking-[0.2em] text-acm-300 uppercase">Admin</p>
        <div className="mt-3">
          <AppNav id="admin" links={SECTIONS} />
        </div>
      </div>
      {children}
    </div>
  );
}
