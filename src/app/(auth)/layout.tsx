import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70 dark:opacity-60"
        style={{
          background:
            "radial-gradient(50rem 26rem at 20% 0%, var(--mesh-1), transparent 60%)," +
            "radial-gradient(36rem 20rem at 90% 10%, var(--mesh-2), transparent 65%)",
        }}
      />

      <header className="px-6 py-5 sm:px-10">
        <Link href="/" className="font-heading text-lg font-bold tracking-tight">
          <span className="text-acm-500">ACM</span> Chapter
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
