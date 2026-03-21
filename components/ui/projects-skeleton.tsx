"use client";

import { cn } from "@/lib/utils";

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-gray-200 rounded dark:bg-slate-700", className)} />;
}

export function ProjectsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="page-section border border-border"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 space-y-2 min-w-0">
              <SkeletonLine className="h-5 w-40" />
              <SkeletonLine className="h-3 w-24" />
            </div>
            <SkeletonLine className="h-5 w-12 rounded-full" />
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            <SkeletonLine className="h-5 w-16 rounded-full" />
            <SkeletonLine className="h-5 w-20 rounded-full" />
            <SkeletonLine className="h-5 w-14 rounded-full" />
          </div>
          <div className="space-y-1 mb-4">
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-3 w-3/4" />
            <SkeletonLine className="h-3 w-1/2" />
          </div>
          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <SkeletonLine className="h-8 flex-1 rounded-md" />
            <SkeletonLine className="h-8 w-16 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MembersSkeleton() {
  return (
    <div className="space-y-0">
      <div className="flex items-center gap-4 mb-4">
        <SkeletonLine className="h-9 w-full max-w-sm rounded-md" />
        <SkeletonLine className="h-9 w-36 rounded-md" />
        <SkeletonLine className="h-9 w-36 rounded-md" />
        <SkeletonLine className="h-9 w-24 rounded-md" />
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 overflow-hidden">
        <div className="border-b dark:border-slate-700">
          <div className="flex items-center px-4 py-3 gap-4">
            <SkeletonLine className="h-4 w-4 rounded" />
            <SkeletonLine className="h-4 w-20" />
            <SkeletonLine className="h-4 w-16" />
            <SkeletonLine className="h-4 w-12" />
            <SkeletonLine className="h-4 w-24" />
            <SkeletonLine className="h-4 w-12" />
            <SkeletonLine className="h-4 w-20" />
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center px-4 py-3 gap-4 border-b dark:border-slate-700 last:border-0">
            <SkeletonLine className="h-4 w-4 rounded" />
            <SkeletonLine className="h-4 w-20" />
            <SkeletonLine className="h-4 w-16" />
            <SkeletonLine className="h-4 w-8" />
            <SkeletonLine className="h-4 w-24" />
            <SkeletonLine className="h-5 w-12 rounded-full" />
            <div className="flex items-center gap-1 ml-auto">
              <SkeletonLine className="h-7 w-7 rounded-md" />
              <SkeletonLine className="h-7 w-7 rounded-md" />
              <SkeletonLine className="h-7 w-7 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
