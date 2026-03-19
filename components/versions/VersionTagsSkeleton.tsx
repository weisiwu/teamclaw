"use client";

import { cn } from "@/lib/utils";

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-gray-200 rounded", className)} />;
}

export function VersionTagsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl bg-white"
        >
          <SkeletonLine className="w-10 h-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <SkeletonLine className="h-4 w-20" />
              <SkeletonLine className="h-4 w-16" />
            </div>
            <SkeletonLine className="h-3 w-full" />
          </div>
          <div className="flex-shrink-0 space-y-1 text-right">
            <SkeletonLine className="h-3 w-24 ml-auto" />
            <SkeletonLine className="h-3 w-16 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}
