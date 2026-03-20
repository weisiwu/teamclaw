/**
 * BranchMergeDialog Component
 * 分支合并对话框 - 将一个分支合并到另一个分支
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GitMerge, X, Loader2, ArrowRight, AlertTriangle, CheckCircle } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  description?: string;
  isMain: boolean;
  createdAt: string;
}

interface BranchMergeDialogProps {
  branches: Branch[];
  isOpen: boolean;
  onClose: () => void;
  onMerge: (sourceBranch: string, targetBranch: string, strategy: "merge" | "rebase") => Promise<boolean>;
}

export function BranchMergeDialog({
  branches,
  isOpen,
  onClose,
  onMerge,
}: BranchMergeDialogProps) {
  const [sourceBranch, setSourceBranch] = useState("");
  const [targetBranch, setTargetBranch] = useState("");
  const [mergeStrategy, setMergeStrategy] = useState<"merge" | "rebase">("merge");
  const [isMerging, setIsMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState<"success" | "conflict" | null>(null);

  if (!isOpen) return null;

  const handleMerge = async () => {
    if (!sourceBranch || !targetBranch) return;
    setIsMerging(true);
    setMergeResult(null);

    try {
      const success = await onMerge(sourceBranch, targetBranch, mergeStrategy);
      setMergeResult(success ? "success" : "conflict");
    } catch {
      setMergeResult("conflict");
    } finally {
      setIsMerging(false);
    }
  };

  const handleReset = () => {
    setSourceBranch("");
    setTargetBranch("");
    setMergeStrategy("merge");
    setMergeResult(null);
  };

  const hasConflict = mergeResult === "conflict";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 对话框 */}
      <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* 标题 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5" />
            <h2 className="text-lg font-semibold">分支合并</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 合并选择 */}
        {!mergeResult ? (
          <div className="p-6">
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium mb-2 block">源分支（将被合并）</label>
                <select
                  value={sourceBranch}
                  onChange={(e) => setSourceBranch(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">选择分支...</option>
                  {branches.filter(b => b.name !== targetBranch).map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name} {b.isMain ? "(主分支)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 dark:text-gray-400 rotate-90" />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">目标分支（合并到此）</label>
                <select
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">选择分支...</option>
                  {branches.filter(b => b.name !== sourceBranch).map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name} {b.isMain ? "(主分支)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">合并策略</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="strategy"
                      checked={mergeStrategy === "merge"}
                      onChange={() => setMergeStrategy("merge")}
                    />
                    <span className="text-sm">Merge（合并提交）</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="strategy"
                      checked={mergeStrategy === "rebase"}
                      onChange={() => setMergeStrategy("rebase")}
                    />
                    <span className="text-sm">Rebase（变基）</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 警告信息 */}
            {sourceBranch && targetBranch && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                  <div className="text-sm text-amber-700">
                    <p className="font-medium">合并操作不可逆</p>
                    <p className="text-amber-600">建议在合并前创建分支快照</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleReset}>
                重置
              </Button>
              <Button
                onClick={handleMerge}
                disabled={!sourceBranch || !targetBranch || sourceBranch === targetBranch || isMerging}
                className={hasConflict ? "bg-red-500 hover:bg-red-600" : ""}
              >
                {isMerging ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    合并中...
                  </>
                ) : (
                  <>
                    <GitMerge className="w-4 h-4 mr-2" />
                    执行合并
                  </>
                )}
              </Button>
            </div>

            {sourceBranch === targetBranch && sourceBranch && (
              <p className="text-sm text-red-500 mt-2">请选择不同的分支</p>
            )}
          </div>
        ) : (
          /* 合并结果 */
          <div className="p-6">
            <div className={`text-center py-6 ${hasConflict ? 'text-red-600' : 'text-green-600'}`}>
              {hasConflict ? (
                <>
                  <AlertTriangle className="w-12 h-12 mx-auto mb-3" />
                  <h3 className="text-lg font-medium">合并冲突</h3>
                  <p className="text-sm mt-2">检测到合并冲突，请手动解决后重试</p>
                </>
              ) : (
                <>
                  <CheckCircle className="w-12 h-12 mx-auto mb-3" />
                  <h3 className="text-lg font-medium">合并成功</h3>
                  <p className="text-sm mt-2">
                    {sourceBranch} 已成功合并到 {targetBranch}
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-2 justify-center mt-4">
              <Button variant="outline" onClick={handleReset}>
                再次合并
              </Button>
              <Button onClick={onClose}>
                完成
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BranchMergeDialog;
