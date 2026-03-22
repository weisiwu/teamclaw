"use client";

import { useState } from "react";
import { useVersionBumpHistory } from "@/lib/api/versions";
import { BumpHistoryRecord } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Tag as TagIcon, CheckCircle2, Wrench, Zap, Search } from "lucide-react";

const TRIGGER_LABELS: Record<string, string> = {
  task_done: "任务完成",
  build_success: "构建成功",
  manual: "手动触发",
};

const BUMP_COLORS: Record<string, string> = {
  major: "bg-red-100 text-red-700 border-red-200",
  minor: "bg-yellow-100 text-yellow-700 border-yellow-200",
  patch: "bg-green-100 text-green-700 border-green-200",
};

function BumpRecordCard({ record }: { record: BumpHistoryRecord }) {
  const triggerIcon =
    record.triggerType === "task_done" ? (
      <CheckCircle2 className="w-4 h-4" />
    ) : record.triggerType === "build_success" ? (
      <Wrench className="w-4 h-4" />
    ) : (
      <Zap className="w-4 h-4" />
    );

  return (
    <Card className="mb-2">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-mono text-sm text-gray-400">{record.previousVersion}</span>
            <span className="text-gray-300">→</span>
            <span className="font-mono font-semibold text-blue-600">{record.newVersion}</span>
            <Badge
              variant="default"
              className={`text-xs shrink-0 ${BUMP_COLORS[record.bumpType] || BUMP_COLORS.patch}`}
            >
              {record.bumpType}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
            {triggerIcon}
            <span>{TRIGGER_LABELS[record.triggerType] || record.triggerType}</span>
          </div>
        </div>

        {(record.triggerTaskId || record.triggerTaskTitle || record.summary) && (
          <div className="mt-2 text-xs text-gray-500 pl-1">
            {record.triggerTaskTitle && (
              <span className="font-medium text-gray-600">{record.triggerTaskTitle}</span>
            )}
            {record.triggerTaskId && (
              <span className="ml-2 font-mono text-gray-400">#{record.triggerTaskId}</span>
            )}
            {record.summary && record.triggerType !== "manual" && (
              <p className="mt-1 text-gray-400 truncate">{record.summary}</p>
            )}
          </div>
        )}

        <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
          <span>
            {new Date(record.createdAt).toLocaleString("zh-CN", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span>by {record.createdBy}</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface BumpHistoryPanelProps {
  versionId: string;
}

export function BumpHistoryPanel({ versionId }: BumpHistoryPanelProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 20;
  const { data, isLoading, isError } = useVersionBumpHistory(versionId, page, pageSize);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">加载中...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12 text-red-500">
        加载 bump 历史失败
      </div>
    );
  }

  const records = (data?.data ?? []) as BumpHistoryRecord[];
  const totalPages = data?.totalPages ?? 1;

  // Filter records based on search (computed inline to avoid hook-before-early-return issue)
  const filteredRecords = search.trim()
    ? records.filter(r => {
        const q = search.toLowerCase();
        return (
          r.newVersion.toLowerCase().includes(q) ||
          r.previousVersion.toLowerCase().includes(q) ||
          r.bumpType.toLowerCase().includes(q) ||
          r.triggerType.toLowerCase().includes(q) ||
          (r.triggerTaskTitle?.toLowerCase().includes(q) ?? false)
        );
      })
    : records;

  // Stats computed inline (no extra useMemo)
  const statsMajor = records.filter(r => r.bumpType === "major").length;
  const statsMinor = records.filter(r => r.bumpType === "minor").length;
  const statsPatch = records.filter(r => r.bumpType === "patch").length;

  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <TagIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>暂无 bump 历史记录</p>
        <p className="text-xs mt-1">任务完成或构建成功时将自动记录</p>
      </div>
    );
  }

  return (
    <div>
      {/* 统计摘要 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-2 rounded-lg text-center bg-red-50">
          <div className="text-lg font-bold text-red-600">{statsMajor}</div>
          <div className="text-xs text-gray-500">Major</div>
        </div>
        <div className="p-2 rounded-lg text-center bg-yellow-50">
          <div className="text-lg font-bold text-yellow-600">{statsMinor}</div>
          <div className="text-xs text-gray-500">Minor</div>
        </div>
        <div className="p-2 rounded-lg text-center bg-green-50">
          <div className="text-lg font-bold text-green-600">{statsPatch}</div>
          <div className="text-xs text-gray-500">Patch</div>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="搜索版本号、触发类型..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filteredRecords.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">没有符合条件的记录</p>
      ) : (
        <div className="space-y-2">
          {filteredRecords.map((record) => (
            <BumpRecordCard key={record.id} record={record} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            className="px-3 py-1 text-sm rounded border hover:bg-gray-50 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            上一页
          </button>
          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            className="px-3 py-1 text-sm rounded border hover:bg-gray-50 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

export default BumpHistoryPanel;
