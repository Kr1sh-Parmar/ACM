import { Skeleton } from "@/components/ui/skeleton";

/**
 * The directory earns its own skeleton: it is the only two-column layout in
 * the app, and the generic one would collapse to a single column and then
 * jump sideways once the real page lands.
 */
export default function Loading() {
  return (
    <div>
      <div className="mb-8">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-9 w-72" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <div className="glass rim space-y-5 rounded-2xl p-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>

        <div>
          <Skeleton className="h-4 w-24" />
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="glass rim rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-11 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <div className="mt-4 flex gap-1.5">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
