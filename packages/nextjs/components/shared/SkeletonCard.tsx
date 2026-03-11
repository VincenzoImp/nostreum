"use client";

export function SkeletonCard() {
  return (
    <div className="glass-card p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-base-300/50 shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-28 rounded-md bg-base-300/50" />
            <div className="h-3 w-12 rounded-md bg-base-300/30" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 rounded-md bg-base-300/40 w-full" />
            <div className="h-3.5 rounded-md bg-base-300/40 w-4/5" />
            <div className="h-3.5 rounded-md bg-base-300/30 w-2/5" />
          </div>
          <div className="flex gap-4 pt-1">
            <div className="h-3 w-8 rounded bg-base-300/30" />
            <div className="h-3 w-8 rounded bg-base-300/30" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
