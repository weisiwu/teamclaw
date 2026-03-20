"use client";

import { GitTag } from "@/lib/api/types";
import { CheckCircle, Archive, Shield, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VersionStatsOverviewProps {
  tags: GitTag[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

type FilterOption = {
  key: string;
  label: string;
  icon: React.ReactNode;
  className: string;
};

const filterOptions: FilterOption[] = [
  {
    key: "all",
    label: "全部",
    icon: <Layers className="w-3.5 h-3.5" />,
    className: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200",
  },
  {
    key: "active",
    label: "活跃",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200",
  },
  {
    key: "protected",
    label: "保护",
    icon: <Shield className="w-3.5 h-3.5" />,
    className: "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200",
  },
  {
    key: "archived",
    label: "已归档",
    icon: <Archive className="w-3.5 h-3.5" />,
    className: "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200",
  },
];

function StatCard({
  label,
  count,
  icon,
  isActive,
  onClick,
  activeClass,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  activeClass: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
        isActive
          ? activeClass
          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {icon}
      <span>{label}</span>
      <Badge
        variant={isActive ? "default" : "warning"}
        className={`ml-1 text-xs ${
          isActive ? "bg-white/30 border-0" : "bg-gray-100"
        }`}
      >
        {count}
      </Badge>
    </button>
  );
}

export function VersionStatsOverview({
  tags,
  activeFilter,
  onFilterChange,
}: VersionStatsOverviewProps) {
  const total = tags.length;
  const activeCount = tags.filter((t) => t.status === "active").length;
  const protectedCount = tags.filter((t) => t.status === "protected").length;
  const archivedCount = tags.filter((t) => t.status === "archived").length;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filterOptions.map((opt) => {
        const count =
          opt.key === "all"
            ? total
            : opt.key === "active"
            ? activeCount
            : opt.key === "protected"
            ? protectedCount
            : archivedCount;

        return (
          <StatCard
            key={opt.key}
            label={opt.label}
            count={count}
            icon={opt.icon}
            isActive={activeFilter === opt.key}
            onClick={() => onFilterChange(opt.key)}
            activeClass={opt.className}
          />
        );
      })}
    </div>
  );
}
