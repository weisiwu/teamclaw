"use client";

import { GitTag } from "@/lib/api/types";
import { CheckCircle, Archive, Shield, Layers, CheckCircle2, XCircle, Image as ImageIcon, FileText, TrendingUp } from "lucide-react";
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
    key: "published",
    label: "已发布",
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

const buildStatOptions: {
  key: string;
  label: string;
  icon: React.ReactNode;
  className: string;
  getCount: (tags: GitTag[]) => number;
}[] = [
  {
    key: "buildSuccess",
    label: "构建成功",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    className: "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100",
    getCount: (tags) => tags.filter((t) => t.buildStatus === "success").length,
  },
  {
    key: "buildFailed",
    label: "构建失败",
    icon: <XCircle className="w-3.5 h-3.5" />,
    className: "bg-red-50 text-red-600 border-red-200 hover:bg-red-100",
    getCount: (tags) => tags.filter((t) => t.buildStatus === "failed").length,
  },
  {
    key: "hasScreenshot",
    label: "有截图",
    icon: <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />,
    className: "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100",
    getCount: (tags) => tags.filter((t) => t.hasScreenshot === true).length,
  },
  {
    key: "hasChangelog",
    label: "有摘要",
    icon: <FileText className="w-3.5 h-3.5" />,
    className: "bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-100",
    getCount: (tags) => tags.filter((t) => t.hasChangelog === true).length,
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
          isActive ? "bg-white/30 border-0 text-inherit" : "bg-gray-100"
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
  const publishedCount = tags.filter((t) => t.status === "active" || t.status === "protected").length;
  const archivedCount = tags.filter((t) => t.status === "archived").length;

  // Build success rate calculation
  const successBuilds = tags.filter((t) => t.buildStatus === "success").length;
  const failedBuilds = tags.filter((t) => t.buildStatus === "failed").length;
  const totalBuilds = successBuilds + failedBuilds;
  const successRate = totalBuilds > 0 ? Math.round((successBuilds / totalBuilds) * 100) : 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filterOptions.map((opt) => {
        const count =
          opt.key === "all"
            ? total
            : opt.key === "active"
            ? activeCount
            : opt.key === "published"
            ? publishedCount
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

      {/* Build success rate indicator */}
      {totalBuilds > 0 && (
        <>
          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold ${
              successRate >= 80
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : successRate >= 50
                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
            title={`${successBuilds} 成功 / ${failedBuilds} 失败`}
          >
            <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
            <span>成功率</span>
            <span className="text-base leading-none">{successRate}%</span>
          </div>
        </>
      )}

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Build stat cards */}
      {buildStatOptions.map((opt) => {
        const count = opt.getCount(tags);
        return (
          <button
            key={opt.key}
            onClick={() => onFilterChange(opt.key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${opt.className} ${
              activeFilter === opt.key ? "ring-2 ring-offset-1 ring-blue-400" : ""
            }`}
          >
            {opt.icon}
            <span>{opt.label}</span>
            <Badge
              variant="warning"
              className={`ml-1 text-xs ${count > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}
            >
              {count}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
