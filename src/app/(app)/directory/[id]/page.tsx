import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MemberAvatar } from "@/components/shell/member-avatar";
import { PROFICIENCIES, YEARS, roleLabel, type Proficiency } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Member" };

/** Strongest first — what someone is good at is the point of the page. */
const BY_LEVEL = [...PROFICIENCIES].reverse();

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireApproved();
  const { id } = await params;
  const supabase = await createClient();

  // RLS already limits this to approved profiles, so a pending or rejected id
  // comes back null and lands on the 404 below rather than leaking a name.
  const [{ data: member }, { data: skillRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.from("member_skills").select("proficiency, skills(name)").eq("member_id", id),
  ]);

  if (!member) notFound();

  const skills = (skillRows ?? [])
    .map((row) => ({ name: row.skills?.name ?? "", proficiency: row.proficiency }))
    .filter((s) => s.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  const byLevel = new Map<Proficiency, string[]>(
    BY_LEVEL.map((level) => [
      level,
      skills.filter((s) => s.proficiency === level).map((s) => s.name),
    ]),
  );

  const year = YEARS.find((y) => y.value === member.year)?.label;

  return (
    <div className="max-w-2xl">
      <p className="font-mono text-sm text-muted-foreground">
        <Link href="/directory" className="hover:underline">
          Member directory
        </Link>
      </p>

      <div className="mt-6 flex items-start gap-4">
        <MemberAvatar
          id={member.id}
          name={member.full_name}
          className="size-16 ring-1 ring-white/15"
        />

        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-balance">
            {member.full_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {roleLabel(member.designation, member.department)}
          </p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {member.branch ?? "—"}
            {year ? ` · ${year}` : ""}
          </p>
        </div>

        {member.open_to_invites && <Badge className="shrink-0">Available</Badge>}
      </div>

      {member.bio && <p className="mt-6 text-sm text-muted-foreground">{member.bio}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <a
          href={`mailto:${member.email}`}
          className="font-mono text-muted-foreground hover:text-foreground"
        >
          {member.email}
        </a>
        {member.github_url && (
          <a
            href={member.github_url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="size-4" aria-hidden />
            GitHub
          </a>
        )}
        {member.linkedin_url && (
          <a
            href={member.linkedin_url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="size-4" aria-hidden />
            LinkedIn
          </a>
        )}
      </div>

      <section className="glass rim mt-10 rounded-2xl p-6 shadow-glow-md">
        <h2 className="font-heading text-lg font-semibold">Skills</h2>

        {skills.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {member.full_name.split(" ")[0]} hasn&apos;t listed any yet.
          </p>
        ) : (
          <dl className="mt-4 space-y-4">
            {BY_LEVEL.map((level) => {
              const names = byLevel.get(level) ?? [];
              if (names.length === 0) return null;

              return (
                <div key={level}>
                  <dt className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
                    {level}
                  </dt>
                  <dd>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {names.map((name) => (
                        <li
                          key={name}
                          className="rounded-full border border-white/12 bg-white/4 px-2.5 py-0.5 font-mono text-xs"
                        >
                          {name}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
      </section>

      {member.id === viewer.id && (
        <p className="mt-8 text-sm text-muted-foreground">
          This is you.{" "}
          <Link href="/profile" className="underline hover:text-foreground">
            Edit your profile
          </Link>
          .
        </p>
      )}
    </div>
  );
}
