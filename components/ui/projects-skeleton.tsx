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

// Agent 团队页面骨架屏
export function AgentTeamSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonLine className="w-10 h-10 rounded-xl" />
          <div className="space-y-1">
            <SkeletonLine className="h-7 w-32" />
            <SkeletonLine className="h-4 w-24" />
          </div>
        </div>
        <SkeletonLine className="h-9 w-9 rounded-lg" />
      </div>

      {/* Hierarchy Chart Placeholder */}
      <SkeletonLine className="h-32 w-full rounded-xl" />

      {/* Agent Cards Grid */}
      <div>
        <SkeletonLine className="h-5 w-20 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Header gradient placeholder */}
              <SkeletonLine className="h-20 w-full" />
              <div className="p-4 space-y-3">
                <SkeletonLine className="h-4 w-full" />
                <SkeletonLine className="h-4 w-3/4" />
                <SkeletonLine className="h-16 w-full rounded-lg" />
                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-3">
                    <SkeletonLine className="h-3 w-12" />
                    <SkeletonLine className="h-3 w-12" />
                  </div>
                  <SkeletonLine className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dispatch Matrix */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <SkeletonLine className="h-5 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <SkeletonLine className="h-4 w-20" />
            <SkeletonLine className="h-4 w-4" />
            <div className="flex gap-1.5">
              <SkeletonLine className="h-5 w-16 rounded" />
              <SkeletonLine className="h-5 w-16 rounded" />
            </div>
          </div>
        ))}
        <SkeletonLine className="h-3 w-64" />
      </div>
    </div>
  );
}
