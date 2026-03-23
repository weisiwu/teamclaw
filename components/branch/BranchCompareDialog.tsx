/**
 * BranchCompareDialog Component
 * 分支对比对话框 - 比较两个分支的差异
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitCompare, GitBranch, X, Loader2, ArrowRight, FileDiff, Plus, Minus, RotateCcw, AlertCircle } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  description?: string;
  isMain: boolean;
  createdAt: string;
}

interface BranchCompareDialogProps {
  branches: Branch[];
  isOpen: boolean;
  onClose: () => void;
}

interface DiffItem {
  type: "added" | "removed" | "modified";
  field: string;
  oldValue: string;
  newValue: string;
}

export function BranchCompareDialog({
  branches,
  isOpen,
  onClose,
}: BranchCompareDialogProps) {
  const [sourceBranch, setSourceBranch] = useState("");
  const [targetBranch, setTargetBranch] = useState("");
  const [isComparing, setIsComparing] = useState(false);
  const [diffResult, setDiffResult] = useState<DiffItem[] | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCompare = async () => {
    if (!sourceBranch || !targetBranch) return;
    setIsComparing(true);
    setCompareError(null);

    try {
      const params = new URLSearchParams({
        source: sourceBranch,
        target: targetBranch,
      });
      const res = await fetch(`/api/v1/branches/compare?${params}`);
      const json = await res.json();

      if (!res.ok || (json.code !== 200 && json.code !== 0)) {
        throw new Error(json.message || '对比失败');
      }

      // Transform API response to DiffItem format
      const data = json.data;
      const items: DiffItem[] = [];

      if (data.versionCount) {
        items.push({
          type: data.versionCount.source > data.versionCount.target ? 'removed' : data.versionCount.source < data.versionCount.target ? 'added' : 'modified',
          field: '版本数',
          oldValue: String(data.versionCount.source),
          newValue: String(data.versionCount.target),
        });
      }
      if (data.latestVersion) {
        items.push({
          type: 'added',
          field: '最新版本',
          oldValue: '-',
          newValue: data.latestVersion.target || data.latestVersion.source || '-',
        });
      }
      if (data.lastUpdated) {
        items.push({
          type: 'modified',
          field: '最后更新',
          oldValue: data.lastUpdated.source || '-',
          newValue: data.lastUpdated.target || '-',
        });
      }

      setDiffResult(items.length > 0 ? items : [
        { type: 'modified', field: '对比结果', oldValue: '无差异', newValue: '无差异' }
      ]);
    } catch (err) {
      console.error('[BranchCompareDialog] Compare failed:', err);
      setCompareError(err instanceof Error ? err.message : '对比失败，请稍后重试');
    } finally {
      setIsComparing(false);
    }
  };

  const handleReset = () => {
    setSourceBranch("");
    setTargetBranch("");
    setDiffResult(null);
    setCompareError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 对话框 */}
      <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* 标题 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            <h2 className="text-lg font-semibold">分支对比</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 对比选择 */}
        {!diffResult ? (
          <div className="p-6">
            {branches.length === 0 && (
              <div className="text-center py-8 mb-4">
                <GitBranch className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-600 mb-1">暂无分支数据</p>
                <p className="text-xs text-gray-400">创建分支后即可进行对比</p>
              </div>
            )}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">源分支</label>
                <select
                  value={sourceBranch}
                  onChange={(e) => setSourceBranch(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">选择分支...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name} {b.isMain ? "(主分支)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-6">
                <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-400" />
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">目标分支</label>
                <select
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">选择分支...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name} {b.isMain ? "(主分支)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {compareError && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400 mb-4">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{compareError}</span>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                重置
              </Button>
              <Button
                onClick={handleCompare}
                disabled={!sourceBranch || !targetBranch || sourceBranch === targetBranch || isComparing}
              >
                {isComparing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    对比中...
                  </>
                ) : (
                  <>
                    <GitCompare className="w-4 h-4 mr-2" />
                    开始对比
                  </>
                )}
              </Button>
            </div>

            {sourceBranch === targetBranch && sourceBranch && (
              <p className="text-sm text-red-500 mt-2 text-center">请选择不同的分支进行对比</p>
            )}
          </div>
        ) : (
          /* 对比结果 */
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="default">{sourceBranch}</Badge>
                <ArrowRight className="w-4 h-4" />
                <Badge variant="default">{targetBranch}</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset}>
                重新对比
              </Button>
            </div>

            <div className="space-y-3">
              {diffResult.map((item, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{item.field}</span>
                    <Badge
                      variant={item.type === "added" ? "success" : item.type === "removed" ? "error" : "warning"}
                      className="text-xs"
                    >
                      {item.type === "added" && <Plus className="w-3 h-3 mr-1" />}
                      {item.type === "removed" && <Minus className="w-3 h-3 mr-1" />}
                      {item.type === "modified" && <FileDiff className="w-3 h-3 mr-1" />}
                      {item.type === "added" ? "新增" : item.type === "removed" ? "删除" : "变更"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      <div className="text-xs text-red-500 mb-1">源分支</div>
                      <div className="text-red-700 dark:text-red-400">{item.oldValue}</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                      <div className="text-xs text-green-500 mb-1">目标分支</div>
                      <div className="text-green-700 dark:text-green-400">{item.newValue}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BranchCompareDialog;
