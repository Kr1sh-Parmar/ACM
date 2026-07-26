import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TeamAssembling } from "@/components/landing/team-assembling";
import { Reveal } from "@/components/landing/reveal";

/** The three steps are a real sequence, so they get numbered. */
const STEPS = [
  {
    title: "Create your profile",
    body: "Name, branch, year, and the skills you actually work with. Takes a minute.",
  },
  {
    title: "An admin approves you",
    body: "A chapter admin checks you're on the committee. Nothing opens until they do.",
  },
  {
    title: "Find or build a team",
    body: "Browse teams by the skills they still need, or start your own and review requests.",
  },
];

export default function Home() {
  return (
    <>
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="font-heading text-lg font-bold tracking-tight">
          <span className="text-acm-500">ACM</span> Chapter
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Create profile</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden px-6 pb-20 pt-10 sm:px-10 sm:pt-16">
          {/* Blue-tinted mesh, CSS only — no canvas, no particle library. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-70 dark:opacity-60"
            style={{
              background:
                "radial-gradient(60rem 30rem at 15% -10%, var(--mesh-1), transparent 60%)," +
                "radial-gradient(40rem 24rem at 85% 0%, var(--mesh-2), transparent 65%)," +
                "radial-gradient(30rem 20rem at 60% 40%, var(--mesh-3), transparent 70%)",
            }}
          />

          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-acm-600 dark:text-acm-300">
                ACM Student Chapter
              </p>

              <h1 className="mt-4 font-heading text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Every teammate you need is already in the chapter.
              </h1>

              <p className="mt-5 max-w-lg text-lg text-muted-foreground">
                Profiles, skills, and hackathon teams in one place. Start a team, list
                what it still needs, and let people ask to join.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/signup">Create your profile</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                New profiles are reviewed by a chapter admin before access opens.
              </p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <TeamAssembling />
            </div>
          </div>
        </section>

        <section className="border-t bg-jasmine-soft/40 px-6 py-16 sm:px-10 dark:bg-transparent">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="font-heading text-2xl font-semibold tracking-tight">
                How you get in
              </h2>
            </Reveal>
            <ol className="mt-8 grid gap-6 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <Reveal
                  key={step.title}
                  as="li"
                  delay={i * 0.09}
                  className="rounded-2xl border bg-card p-5"
                >
                  <span className="font-mono text-sm text-acm-500">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 font-heading text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-8 text-sm text-muted-foreground sm:px-10">
        <div className="mx-auto max-w-6xl">
          Internal tool for the ACM student chapter committee.
        </div>
      </footer>
    </>
  );
}
