import { Skeleton } from "@/components/ui/skeleton";

/**
 * One skeleton covers every route under (app) that doesn't ship its own.
 *
 * It traces the shape every page actually has — eyebrow, title, then a stack
 * of rows — rather than pretending to know whether the content is a grid or a
 * table. Guessing wrong is worse than staying generic: the layout jumps twice.
 */
export default function Loading() {
  return (
    <div>
      <div className="mb-8">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-9 w-64" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      </div>

      <div className="glass rim space-y-4 rounded-2xl p-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
