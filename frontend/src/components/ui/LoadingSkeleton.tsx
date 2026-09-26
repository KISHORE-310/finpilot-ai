import React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-slate-800/60 border border-slate-700/30", className)}
      {...props}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/80 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-9 w-44" />
      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3.5 w-20" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-[#131622] rounded-2xl border border-slate-800/80 overflow-hidden">
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className={cn("h-5", j === 0 ? "w-1/3" : "w-1/4")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = "h-72" }: { height?: string }) {
  return (
    <div className="bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/80 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3.5 w-48" />
        </div>
        <Skeleton className="h-7 w-28 rounded-lg" />
      </div>
      <div className={cn("w-full flex items-end gap-3 pt-6 pb-2", height)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-lg"
            style={{ height: `${Math.max(20, Math.sin(i + 1) * 70 + 30)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function LoadingSkeleton({
  type = "card",
  count = 1,
  className,
}: {
  type?: "card" | "table" | "chart" | "pulse";
  count?: number;
  className?: string;
}) {
  if (type === "table") {
    return <TableSkeleton rows={count * 3} />;
  }
  if (type === "chart") {
    return <ChartSkeleton />;
  }
  if (type === "card") {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
