"use client";

interface LoadingSkeletonProps {
  rows?: number;
  count?: number;
}

export function TableSkeleton({ rows = 6 }: LoadingSkeletonProps) {
  return (
    <div className="py-20 text-center text-[#637066]">
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-8 bg-[#f3f8f1] rounded animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 6 }: LoadingSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-64 bg-[#f3f8f1] rounded-lg animate-pulse" />
      ))}
    </div>
  );
}
