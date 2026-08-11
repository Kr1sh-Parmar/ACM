import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TeamAssembling } from "@/components/landing/team-assembling";
import { Reveal } from "@/components/landing/reveal";

/** A real sequence — you cannot do step three before step two — so it is numbered. */
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
          <span className="text-acm-300">ACM</span> Chapter
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
        <section className="px-6 pt-10 pb-24 sm:px-10 sm:pt-20">
          <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <p className="font-mono text-xs tracking-[0.2em] text-acm-300 uppercase">
                ACM Student Chapter
              </p>

              <h1 className="mt-5 font-heading text-4xl leading-[1.04] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Every teammate you need is already in the chapter.
              </h1>

              <p className="mt-6 max-w-lg text-lg text-muted-foreground">
                Profiles, skills, and hackathon teams in one place. Start a team, list what
                it still needs, and let people ask to join.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/signup">Create your profile</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>

              <p className="mt-5 text-sm text-muted-foreground">
                New profiles are reviewed by a chapter admin before access opens.
              </p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <TeamAssembling />
            </div>
          </div>
        </section>

        <section className="border-t border-white/8 px-6 py-20 sm:px-10">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="font-heading text-2xl font-semibold tracking-tight">
                How you get in
              </h2>
            </Reveal>
            <ol className="mt-10 grid gap-5 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <Reveal
                  key={step.title}
                  as="li"
                  delay={i * 0.09}
                  className="glass rim rounded-2xl p-6 shadow-glow-md"
                >
                  <span className="font-mono text-sm text-acm-300">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 font-heading text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 px-6 py-8 text-sm text-muted-foreground sm:px-10">
        <div className="mx-auto max-w-6xl">
          Internal tool for the ACM student chapter committee.
        </div>
      </footer>
    </>
  );
}
