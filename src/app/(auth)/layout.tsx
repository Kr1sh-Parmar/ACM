import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col">
      <header className="px-6 py-5 sm:px-10">
        <Link href="/" className="font-heading text-lg font-bold tracking-tight">
          <span className="text-acm-300">ACM</span> Chapter
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
