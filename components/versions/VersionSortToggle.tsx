"use client";

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SortOrder = "asc" | "desc";
type SortType = "date" | "semver";

const sortOptions: { type: SortType; label: string }[] = [
  { type: "date", label: "按时间" },
  { type: "semver", label: "按版本号" },
];

export function VersionSortToggle({
  order,
  onChange,
  sortType,
  onSortTypeChange,
  className,
}: {
  order: SortOrder;
  onChange: (order: SortOrder) => void;
  sortType?: SortType;
  onSortTypeChange?: (type: SortType) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {onSortTypeChange && (
        <div className="flex items-center border rounded-lg overflow-hidden">
          {sortOptions.map((opt) => (
            <button
              key={opt.type}
              onClick={() => onSortTypeChange(opt.type)}
              className={cn(
                "px-2 py-1.5 text-xs font-medium transition-colors",
                sortType === opt.type
                  ? "bg-blue-100 text-blue-700 border-r border-blue-200"
                  : "bg-white text-gray-500 hover:bg-gray-50 border-r border-gray-200"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(order === "asc" ? "desc" : "asc")}
        className="gap-1.5"
      >
        {order === "desc" ? (
          <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
        ) : (
          <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
        )}
        <span className="text-gray-600">
          {order === "desc" ? "最新优先" : "最早优先"}
        </span>
        <ArrowUpDown className="w-3 h-3 text-gray-400" />
      </Button>
    </div>
  );
}
