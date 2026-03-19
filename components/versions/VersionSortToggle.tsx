"use client";

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SortOrder = "asc" | "desc";

interface VersionSortToggleProps {
  order: SortOrder;
  onChange: (order: SortOrder) => void;
  className?: string;
}

export function VersionSortToggle({ order, onChange, className }: VersionSortToggleProps) {
  const toggle = () => {
    onChange(order === "asc" ? "desc" : "asc");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      className={cn("gap-1.5", className)}
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
  );
}
