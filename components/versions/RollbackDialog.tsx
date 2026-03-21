/**
 * Version Rollback Dialog
 * 版本回退确认对话框 - 增强版：支持回退预览（文件变更统计）
 */
"use client";

import { useState, useEffect } from "react";
import { Version } from "@/lib/api/types";
import { useRollbackVersion, useRollbackTargets, useRollbackPreview } from "@/lib/api/versions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertTriangle,
  GitBranch,
  RotateCcw,
  Loader2,
  Tag,
  Files,
  GitCommit,
  Plus,
  Minus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface RollbackDialogProps {
  version: Version | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRollbackComplete?: () => void;
}

export function RollbackDialog({
  version,
  open,
  onOpenChange,
  onRollbackComplete,
}: RollbackDialogProps) {
  const [targetRef, setTargetRef] = useState<string>("");
  const [targetType, setTargetType] = useState<"tag" | "branch">("tag");
  const [mode, setMode] = useState<"revert" | "checkout">("revert");
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [createBackup, setCreateBackup] = useState(true);
  const [reason, setReason] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastVisible, setToastVisible] = useState(false);
  const rollbackMutation = useRollbackVersion();

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
  };

  useEffect(() => {
    if (toastVisible) {
      const timer = setTimeout(() => setToastVisible(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastVisible]);
  const { data: targets, isLoading: targetsLoading } = useRollbackTargets(version?.id || "");

  // Preview fetched when target changes
  const { data: rawPreview, isLoading: previewLoading } = useRollbackPreview(
    version?.id || "",
    targetRef || null
  );

  // Cast preview data to proper type
  const preview = rawPreview as {
    targetRef: string;
    currentRef: string;
    commitsBehind: Array<{ shortHash: string; message: string }>;
    commitsAhead: Array<{ shortHash: string; message: string }>;
    filesChanged: string[];
    message: string;
  } | null;

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setTargetRef("");
      setPreviewCollapsed(false);
      setCreateBackup(true);
      setReason("");
    }
  }, [open]);

  // Auto-expand preview when target selected
  useEffect(() => {
    if (targetRef) setPreviewCollapsed(false);
  }, [targetRef]);

  if (!version) return null;

  const handleRollback = async () => {
    if (!targetRef) {
      showToast("请选择要回退到的目标", "error");
      return;
    }

    const confirmed = window.confirm(
      `确定要将版本 ${version.version} 回退到 ${targetType === "tag" ? "标签" : "分支"} ${targetRef} 吗？`
    );
    if (!confirmed) return;

    try {
      await rollbackMutation.mutateAsync({
        versionId: version.id,
        targetVersion: targetRef,
        mode,
        createBackup,
        message: reason || `Rollback to ${targetRef}`,
      });
      onOpenChange(false);
      setTargetRef("");
      showToast(`版本回退成功`);
      onRollbackComplete?.();
    } catch (e: unknown) {
      showToast(`回退失败: ${e instanceof Error ? e.message : "请重试"}`, "error");
    }
  };

  const tags = targets?.tags || [];
  const branches = (targets?.branches || []).filter(b => !b.isCurrent);



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`版本回退 - ${version.version}`}
        onClose={() => onOpenChange(false)}
        className="max-w-xl"
      >
        <div className="space-y-4 py-4">
          {/* 警告提示 */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">回退操作说明</p>
              <p className="mt-1">
                回退会切换到指定的 Git 标签或分支。建议开启&quot;创建备份分支&quot;以保留当前状态。
              </p>
            </div>
          </div>

          {/* 回退类型切换 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">回退类型</p>
            <RadioGroup
              value={targetType}
              onValueChange={(v) => {
                setTargetType(v as "tag" | "branch");
                setTargetRef("");
              }}
              className="grid grid-cols-2 gap-2"
            >
              <div
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  targetType === "tag"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
                onClick={() => {
                  setTargetType("tag");
                  setTargetRef("");
                }}
              >
                <RadioGroupItem value="tag" id="type-tag" />
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span className="text-sm font-medium">标签 (Tag)</span>
                </div>
              </div>
              <div
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  targetType === "branch"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
                onClick={() => {
                  setTargetType("branch");
                  setTargetRef("");
                }}
              >
                <RadioGroupItem value="branch" id="type-branch" />
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  <span className="text-sm font-medium">分支 (Branch)</span>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* 目标选择 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              选择{targetType === "tag" ? "标签" : "分支"}
            </p>
            <RadioGroup
              value={targetRef}
              onValueChange={setTargetRef}
              className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto"
            >
              {targetsLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">加载中...</span>
                </div>
              ) : targetType === "tag" ? (
                tags.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">没有可用的标签</p>
                ) : (
                  tags.map((t) => (
                    <div
                      key={t.name}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        targetRef === t.name
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                      onClick={() => setTargetRef(t.name)}
                    >
                      <RadioGroupItem value={t.name} id={`tag-${t.name}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Tag className="h-3 w-3" />
                          <span className="font-medium text-sm">{t.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t.date ? new Date(t.date).toLocaleDateString("zh-CN") : ""}
                          {t.commit ? ` · ${t.commit.slice(0, 7)}` : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )
              ) : branches.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">没有可用的分支</p>
              ) : (
                branches.map((b) => (
                  <div
                    key={b.name}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      targetRef === b.name
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                    onClick={() => setTargetRef(b.name)}
                  >
                    <RadioGroupItem value={b.name} id={`branch-${b.name}`} />
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-3 w-3" />
                      <span className="font-medium text-sm">{b.name}</span>
                      {b.isRemote && <Badge variant="info" className="text-xs">远程</Badge>}
                    </div>
                  </div>
                ))
              )}
            </RadioGroup>
          </div>

          {/* 回退预览面板 */}
          {targetRef && (
            <div className="space-y-2">
              <button
                onClick={() => setPreviewCollapsed(!previewCollapsed)}
                className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Files className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    变更预览
                  </span>
                  {previewLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                  ) : preview ? (
                    <span className="text-xs text-slate-500">
                      {preview.filesChanged.length} 个文件差异 ·{" "}
                      {preview.commitsAhead.length > 0 && (
                        <span className="text-amber-600">
                          丢失 {preview.commitsAhead.length} commit
                        </span>
                      )}
                      {preview.commitsAhead.length > 0 && preview.commitsBehind.length > 0 && " · "}
                      {preview.commitsBehind.length > 0 && (
                        <span className="text-green-600">
                          应用 {preview.commitsBehind.length} commit
                        </span>
                      )}
                    </span>
                  ) : null}
                </div>
                {previewCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                )}
              </button>

              {/* Preview content */}
              {!previewCollapsed && (
                <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
                  {previewLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      <span className="ml-2 text-sm text-slate-500">正在分析变更...</span>
                    </div>
                  ) : preview ? (
                    <>
                      {/* Message */}
                      {preview.message && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded px-2 py-1.5">
                          {preview.message}
                        </p>
                      )}

                      {/* File changes summary */}
                      {preview.filesChanged.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1.5">
                            变更文件（共 {preview.filesChanged.length} 个）
                          </p>
                          <div className="max-h-[120px] overflow-y-auto bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                            {preview.filesChanged.map((file: string) => {
                              const isNew = file.startsWith("new/") || file.includes("newfile");
                              const isDeleted = file.startsWith("deleted/") || file.includes("deleted");
                              return (
                                <div
                                  key={file}
                                  className="flex items-center gap-1.5 px-2 py-1 text-xs font-mono text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  {isNew ? (
                                    <Plus className="h-3 w-3 text-green-500 shrink-0" />
                                  ) : isDeleted ? (
                                    <Minus className="h-3 w-3 text-red-500 shrink-0" />
                                  ) : (
                                    <RefreshCw className="h-3 w-3 text-amber-500 shrink-0" />
                                  )}
                                  <span className="truncate">{file}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Commit details */}
                      {(preview.commitsAhead.length > 0 || preview.commitsBehind.length > 0) && (
                        <div className="grid grid-cols-2 gap-2">
                          {preview.commitsAhead.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-amber-600 mb-1">
                                将丢失的 commits（{preview.commitsAhead.length}）
                              </p>
                              <div className="space-y-1">
                                {preview.commitsAhead.slice(0, 3).map((c: { shortHash: string; message: string }) => (
                                  <div key={c.shortHash} className="flex items-start gap-1.5">
                                    <GitCommit className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                                    <span className="text-xs font-mono text-slate-500">{c.shortHash}</span>
                                    <span className="text-xs text-slate-600 truncate">{c.message}</span>
                                  </div>
                                ))}
                                {preview.commitsAhead.length > 3 && (
                                  <p className="text-xs text-slate-400 pl-4">
                                    +{preview.commitsAhead.length - 3} more...
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          {preview.commitsBehind.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-green-600 mb-1">
                                将应用的 commits（{preview.commitsBehind.length}）
                              </p>
                              <div className="space-y-1">
                                {preview.commitsBehind.slice(0, 3).map((c: { shortHash: string; message: string }) => (
                                  <div key={c.shortHash} className="flex items-start gap-1.5">
                                    <GitCommit className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                                    <span className="text-xs font-mono text-slate-500">{c.shortHash}</span>
                                    <span className="text-xs text-slate-600 truncate">{c.message}</span>
                                  </div>
                                ))}
                                {preview.commitsBehind.length > 3 && (
                                  <p className="text-xs text-slate-400 pl-4">
                                    +{preview.commitsBehind.length - 3} more...
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {preview.filesChanged.length === 0 &&
                        preview.commitsAhead.length === 0 &&
                        preview.commitsBehind.length === 0 && (
                          <p className="text-sm text-slate-500 text-center py-2">
                            目标已是当前状态，无变更
                          </p>
                        )}
                    </>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-2">
                      选择目标以查看变更预览
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 回退模式 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">回退模式</p>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as "revert" | "checkout")}
              className="grid grid-cols-2 gap-2"
            >
              <div
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  mode === "revert"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
                onClick={() => setMode("revert")}
              >
                <RadioGroupItem value="revert" id="mode-revert" />
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  <div>
                    <p className="text-sm font-medium">Revert</p>
                    <p className="text-xs text-muted-foreground">保留提交历史</p>
                  </div>
                </div>
              </div>
              <div
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  mode === "checkout"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
                onClick={() => setMode("checkout")}
              >
                <RadioGroupItem value="checkout" id="mode-checkout" />
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  <div>
                    <p className="text-sm font-medium">Checkout</p>
                    <p className="text-xs text-muted-foreground">完全恢复到目标</p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* 备份选项 */}
          <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
            <input
              type="checkbox"
              id="create-backup"
              checked={createBackup}
              onChange={(e) => setCreateBackup(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <label htmlFor="create-backup" className="text-sm font-medium cursor-pointer">
                创建备份分支
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                开启后会在回退前创建备份分支，保留当前状态以便恢复
              </p>
            </div>
          </div>

          {/* 回退原因 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">回退原因（可选）</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例如：修复线上严重问题、回退有问题的功能..."
              className="w-full min-h-[60px] px-3 py-2 text-sm rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleRollback}
            disabled={!targetRef || rollbackMutation.isPending}
          >
            {rollbackMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                回退中...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                确认回退
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Toast 通知 */}
      {toastVisible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm text-white ${
              toastType === "success" ? "bg-gray-900" : "bg-red-600"
            }`}
          >
            {toastType === "success" ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <XCircle className="w-4 h-4 text-white" />
            )}
            <span>{toastMsg}</span>
          </div>
        </div>
      )}
    </Dialog>
  );
}
