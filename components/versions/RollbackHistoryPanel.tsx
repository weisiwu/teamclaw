/**
 * Rollback History Panel
 * 显示版本回退历史记录
 */
"use client";

import { useState } from "react";
import { useRollbackHistory, type RollbackHistoryRecord } from "@/lib/api/versions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw, GitBranch, Tag, GitCommit, CheckCircle, XCircle, Clock, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface RollbackHistoryPanelProps {
  versionId: string;
}

const targetTypeIcon: Record<string, typeof Tag> = {
  tag: Tag,
  branch: GitBranch,
  commit: GitCommit,
};

const targetTypeLabel: Record<string, string> = {
  tag: "标签",
  branch: "分支",
  commit: "提交",
};

const modeLabel: Record<string, string> = {
  revert: "Revert",
  checkout: "Checkout",
};

export function RollbackHistoryPanel({ versionId }: RollbackHistoryPanelProps) {
  const { data: history, isLoading, isError } = useRollbackHistory(versionId);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyRef = async (record: RollbackHistoryRecord) => {
    try {
      await navigator.clipboard.writeText(record.targetRef);
      setCopiedId(record.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">加载回退历史...</span>
      </div>
    );
  }

  if (isError || !history) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <RotateCcw className="h-10 w-10 text-red-300 mb-3" />
        <p className="text-sm text-red-600 font-medium">加载回退历史失败</p>
        <p className="text-xs text-gray-400 mt-1">请稍后重试</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <RotateCcw className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500 mb-1">暂无回退历史</p>
        <p className="text-xs text-gray-400">该版本尚未执行过回退操作</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">回退历史</h3>
        <span className="text-xs text-gray-400">{history.length} 条记录</span>
      </div>

      <div className="space-y-2">
        {history.map((record: RollbackHistoryRecord) => {
          const targetType = record.targetType ?? "commit";
          const mode = record.mode ?? "revert";
          const Icon = targetTypeIcon[targetType] ?? GitCommit;

          const performedAt = new Date(record.performedAt);

          return (
            <div
              key={record.id}
              className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors group relative"
              onMouseEnter={() => setHoveredId(record.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Hover actions */}
              <div
                className={cn(
                  "absolute right-2 top-2 flex items-center gap-1 transition-opacity",
                  hoveredId === record.id ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleCopyRef(record)}
                  title="复制目标引用"
                >
                  {copiedId === record.id ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
                {record.success && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    title="重新回退到此目标"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {/* Status icon */}
              <div className={`mt-0.5 shrink-0 ${record.success ? "text-green-500" : "text-red-500"}`}>
                {record.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Target ref */}
                  <div className="flex items-center gap-1">
                    <Icon className="h-3.5 w-3.5 text-gray-400" />
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {record.targetRef}
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant="default" className="text-xs">
                      {targetTypeLabel[targetType] ?? targetType}
                    </Badge>
                    <Badge variant={record.success ? "default" : "error"} className="text-xs">
                      {modeLabel[mode] ?? mode}
                    </Badge>
                    {record.backupCreated && (
                      <Badge variant="info" className="text-xs">
                        备份分支
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {performedAt.toLocaleString("zh-CN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {record.previousRef && (
                    <span className="flex items-center gap-1">
                      <RotateCcw className="h-3 w-3" />
                      {record.previousRef} → {record.targetRef}
                    </span>
                  )}
                  {record.newBranch && (
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {record.newBranch}
                    </span>
                  )}
                </div>

                {/* Error message */}
                {!record.success && record.error && (
                  <p className="mt-1.5 text-xs text-red-500">
                    错误: {record.error}
                  </p>
                )}

                {/* Message */}
                {record.message && (
                  <p className="mt-1.5 text-xs text-gray-500">
                    {record.message}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
