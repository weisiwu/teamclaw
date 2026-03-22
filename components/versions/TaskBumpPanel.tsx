/**
 * TaskBumpPanel Component
 * 任务完成后自动 bump 版本号面板
 * 展示任务关联版本的 auto-bump 状态、预览和手动触发
 */
"use client";

import { useState, useEffect } from "react";
import { useBumpPreview, useTriggerTaskBump } from "@/lib/api/versions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, ArrowUp, CheckCircle2, AlertCircle, Tag, CheckCircle, XCircle } from "lucide-react";

interface TaskBumpPanelProps {
  taskId: string;
  versionId: string;
  taskTitle?: string;
  currentVersion?: string;
  className?: string;
}

const BUMP_TYPE_COLORS: Record<string, string> = {
  major: "bg-red-100 text-red-700 border-red-200",
  minor: "bg-yellow-100 text-yellow-700 border-yellow-200",
  patch: "bg-green-100 text-green-700 border-green-200",
};

const BUMP_TYPE_LABELS: Record<string, string> = {
  major: "Major (x.0.0)",
  minor: "Minor (x.x.0)",
  patch: "Patch (x.x.x)",
};

interface BumpResultProps {
  previousVersion: string;
  newVersion: string;
  bumpType: string;
  gitTag?: string;
  summary?: string;
  onClose: () => void;
}

function BumpResultCard({ previousVersion, newVersion, bumpType, gitTag, summary, onClose }: BumpResultProps) {
  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-gray-500">{previousVersion}</span>
              <span className="text-gray-300">→</span>
              <span className="font-mono font-bold text-green-700 text-lg">{newVersion}</span>
              <Badge className={`text-xs ${BUMP_TYPE_COLORS[bumpType] || BUMP_TYPE_COLORS.patch}`}>
                {BUMP_TYPE_LABELS[bumpType] || bumpType}
              </Badge>
            </div>
            {gitTag && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <Tag className="w-3 h-3" />
                <span className="font-mono">{gitTag}</span>
              </div>
            )}
            {summary && (
              <p className="mt-2 text-sm text-gray-600">{summary}</p>
            )}
            <Button size="sm" variant="outline" className="mt-3" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TaskBumpPanel({ taskId, versionId, taskTitle, currentVersion, className }: TaskBumpPanelProps) {
  const [selectedBumpType, setSelectedBumpType] = useState<string>("patch");
  const [bumpResult, setBumpResult] = useState<BumpResultProps | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastVisible, setToastVisible] = useState(false);

  const { data: preview, isLoading: previewLoading } = useBumpPreview(versionId, "feature");

  const triggerMutation = useTriggerTaskBump();

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

  const handleTriggerBump = async () => {
    try {
      const result = await triggerMutation.mutateAsync(taskId);
      setBumpResult({
        previousVersion: result.previousVersion,
        newVersion: result.newVersion,
        bumpType: result.bumpType,
        gitTag: result.gitTag,
        summary: result.summary,
        onClose: () => setBumpResult(null),
      });
    } catch (err) {
      console.error("[TaskBumpPanel] Bump failed:", err);
      showToast("触发版本升级失败: " + (err instanceof Error ? err.message : String(err)), "error");
    }
  };

  // Get the preview for the selected bump type
  const selectedPreview = preview?.previews?.find(p => p.bumpType === selectedBumpType);

  return (
    <div className={className}>
      {bumpResult ? (
        <BumpResultCard {...bumpResult} />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              版本自动升级
            </CardTitle>
            {taskTitle && (
              <p className="text-sm text-gray-500 font-normal">{taskTitle}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current version info */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">当前版本</span>
                {currentVersion && (
                  <Badge variant="default" className="font-mono">{currentVersion}</Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span>自动升级已启用</span>
              </div>
            </div>

            {/* Bump type selector */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">选择升级类型</p>
              <div className="grid grid-cols-3 gap-2">
                {(["patch", "minor", "major"] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedBumpType(type)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      selectedBumpType === type
                        ? type === "major"
                          ? "border-red-300 bg-red-50"
                          : type === "minor"
                          ? "border-yellow-300 bg-yellow-50"
                          : "border-green-300 bg-green-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`text-xs font-medium ${
                      selectedBumpType === type
                        ? type === "major"
                          ? "text-red-700"
                          : type === "minor"
                          ? "text-yellow-700"
                          : "text-green-700"
                        : "text-gray-600"
                    }`}>
                      {type === "major" ? "Major" : type === "minor" ? "Minor" : "Patch"}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {type === "major" ? "x.0.0" : type === "minor" ? "x.x.0" : "x.x.x"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {previewLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">加载预览...</span>
              </div>
            ) : selectedPreview ? (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 mb-1">升级预览</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-500">
                    {preview?.currentVersion}
                  </span>
                  <ArrowUp className="w-3 h-3 text-blue-400" />
                  <span className="font-mono font-semibold text-blue-700">
                    {selectedPreview.newVersion}
                  </span>
                  <Badge className={`text-xs ${BUMP_TYPE_COLORS[selectedBumpType]}`}>
                    {selectedBumpType}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">无法加载预览，请稍后重试</span>
              </div>
            )}

            {/* Trigger button */}
            <Button
              className="w-full"
              onClick={handleTriggerBump}
              disabled={triggerMutation.isPending || previewLoading}
            >
              {triggerMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  升级中...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  立即升级版本
                </>
              )}
            </Button>

            <p className="text-xs text-gray-400 text-center">
              升级将创建新版本记录并自动更新版本号
            </p>
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}

export default TaskBumpPanel;
