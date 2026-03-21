"use client";

import { useState, useEffect } from "react";
import { useBuilds, useTriggerBuild, useRebuildBuild, useCancelBuild, createPackageAPI, getPackageDownloadUrl, BuildRecord } from "@/lib/api/builds";
import { getArtifactDownloadUrl } from "@/lib/api/artifacts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, Loader2, ChevronDown, ChevronUp, Package, RefreshCw, Activity, Play, RotateCcw, X, Download, FileText, Archive } from "lucide-react";

function formatDuration(ms?: number): string {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function formatTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getArtifactIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["js", "mjs"].includes(ext)) return <FileText className="w-3 h-3 text-yellow-500" />;
  if (["css"].includes(ext)) return <FileText className="w-3 h-3 text-blue-400" />;
  if (["json"].includes(ext)) return <FileText className="w-3 h-3 text-green-500" />;
  if (["html", "htm"].includes(ext)) return <FileText className="w-3 h-3 text-orange-500" />;
  if (["png", "jpg", "jpeg", "gif", "svg", "ico"].includes(ext)) return <FileText className="w-3 h-3 text-purple-500" />;
  if (["zip", "tar", "gz", "tgz"].includes(ext)) return <Archive className="w-3 h-3 text-red-500" />;
  return <FileText className="w-3 h-3 text-gray-400" />;
}

function ArtifactDownloadRow({ path, name, build }: { path: string; name: string; build: BuildRecord }) {
  const downloadUrl = getArtifactDownloadUrl(build.versionId, build.buildNumber, path);

  return (
    <a
      key={path}
      href={downloadUrl}
      download={name}
      className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent transition-colors group"
    >
      {getArtifactIcon(name)}
      <span className="flex-1 text-xs font-mono truncate" title={path}>{name}</span>
      <Download className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}
function BuildStatusIcon({ status }: { status: BuildRecord["status"] }) {
  if (status === "success") return <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-500" />;
  if (status === "failed") return <XCircle className="w-4 h-4 flex-shrink-0 text-red-500" />;
  if (status === "building") return <Loader2 className="w-4 h-4 flex-shrink-0 text-blue-500 animate-spin" />;
  if (status === "pending") return <Clock className="w-4 h-4 flex-shrink-0 text-yellow-500" />;
  return <X className="w-4 h-4 flex-shrink-0 text-gray-400" />;
}

function BuildStatusLabel({ status }: { status: BuildRecord["status"] }) {
  if (status === "success") return <span className="text-xs text-muted-foreground">成功</span>;
  if (status === "failed") return <span className="text-xs text-muted-foreground">失败</span>;
  if (status === "building") return <span className="text-xs text-muted-foreground">构建中</span>;
  if (status === "pending") return <span className="text-xs text-muted-foreground">排队中</span>;
  return <span className="text-xs text-muted-foreground">已取消</span>;
}

type BuildStatus = BuildRecord["status"];

type FilterTab = "all" | BuildStatus;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "success", label: "成功" },
  { key: "failed", label: "失败" },
  { key: "building", label: "构建中" },
  { key: "pending", label: "排队中" },
];

interface BuildRowProps {
  build: BuildRecord;
  onRebuild: (build: BuildRecord) => void;
  onCancel: (build: BuildRecord) => void;
  isLatest?: boolean;
  onPackageDownload: (build: BuildRecord) => void;
  avgDuration?: number;
}

function BuildRow({ build, onRebuild, onCancel, isLatest, onPackageDownload, avgDuration }: BuildRowProps) {
  const [expanded, setExpanded] = useState(false);

  // 计算与平均时长的差异
  const durationDiff = build.duration && avgDuration != null && avgDuration > 0
    ? build.duration - avgDuration
    : null;

  return (
    <div className="border rounded-lg p-3 bg-card hover:bg-card/80 transition-colors">
      <div className="flex items-center gap-3">
        <BuildStatusIcon status={build.status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">#{build.buildNumber}</span>
            {isLatest && <Badge variant="info" className="text-xs">最新</Badge>}
            {build.triggerType === "rebuild" && <Badge variant="default" className="text-xs bg-yellow-100 text-yellow-700">重构建</Badge>}
            <BuildStatusLabel status={build.status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(build.queuedAt)}</span>
            {build.duration && (
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {formatDuration(build.duration)}
                {durationDiff !== null && (
                  <span className={`flex items-center gap-0.5 ml-0.5 ${durationDiff <= 0 ? "text-green-500" : "text-red-500"}`}>
                    {durationDiff <= 0
                      ? <ChevronDown className="w-3 h-3" />
                      : <ChevronUp className="w-3 h-3" />}
                    <span>{formatDuration(Math.abs(durationDiff))}</span>
                  </span>
                )}
              </span>
            )}
            {build.artifactCount != null && build.artifactCount > 0 && (
              <span className="flex items-center gap-1"><Package className="w-3 h-3" />{build.artifactCount} 个产物</span>
            )}
            {build.triggerType !== "manual" && (
              <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" />{build.triggerType}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {(build.status === "building" || build.status === "pending") && (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onCancel(build)} title="取消构建">
              <X className="w-3 h-3" />
            </Button>
          )}

          {(build.status === "success" || build.status === "failed") && (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onRebuild(build)} title="重新打包此版本">
              <RotateCcw className="w-3 h-3" />
            </Button>
          )}

          {build.output && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setExpanded(!expanded)}
              title={expanded ? "收起日志" : "展开日志"}
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          )}
        </div>
      </div>

      {expanded && build.artifactPaths && build.artifactPaths.length > 0 && (
        <div className="mt-3 border-t pt-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Download className="w-3 h-3" />
            <span>产物下载</span>
            <span className="ml-auto text-xs">共 {build.artifactPaths.length} 个文件</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {build.artifactPaths.slice(0, 20).map((artifactPath) => {
              const fileName = artifactPath.split("/").pop() || artifactPath;
              return (
                <ArtifactDownloadRow
                  key={artifactPath}
                  path={artifactPath}
                  name={fileName}
                  build={build}
                />
              );
            })}
            {build.artifactPaths.length > 20 && (
              <span className="text-xs text-muted-foreground px-2 py-1">
                +{build.artifactPaths.length - 20} 个文件
              </span>
            )}
          </div>
          {build.artifactPaths.length > 0 && (
            <div className="mt-2 flex gap-2">
              <a
                href={`/api/v1/artifacts/${encodeURIComponent(build.versionId)}/${build.buildNumber}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                查看全部产物
              </a>
              <button
                onClick={() => onPackageDownload(build)}
                className="text-xs text-green-600 hover:underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                打包下载
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface BuildHistoryPanelProps {
  versionId: string;
  versionName: string;
  versionNumber: string;
  projectPath?: string;
  onBuildTriggered?: (buildId: string) => void;
}

export function BuildHistoryPanel({
  versionId,
  versionName,
  versionNumber,
  projectPath,
  onBuildTriggered,
}: BuildHistoryPanelProps) {
  const { data, isLoading, error } = useBuilds(versionId, 30);
  const triggerBuild = useTriggerBuild();
  const rebuildBuild = useRebuildBuild();
  const cancelBuild = useCancelBuild();

  // Toast 通知（必须在所有使用点的源顺序之前声明）
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastVisible, setToastVisible] = useState(false);

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

  const [rebuildTarget, setRebuildTarget] = useState<BuildRecord | null>(null);
  const [showRebuildDialog, setShowRebuildDialog] = useState(false);
  const [downloadConfirmBuild, setDownloadConfirmBuild] = useState<BuildRecord | null>(null);
  const [showDownloadConfirmDialog, setShowDownloadConfirmDialog] = useState(false);

  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  const builds = data?.builds || [];

  // 计算统计数据
  const totalBuilds = builds.length;
  const successBuilds = builds.filter(b => b.status === "success").length;
  const failedBuilds = builds.filter(b => b.status === "failed").length;
  const successRate = totalBuilds > 0 ? Math.round((successBuilds / totalBuilds) * 100) : 0;
  const lastBuild = builds[0];
  const avgDuration = builds.filter(b => b.duration).reduce((sum, b) => sum + (b.duration ?? 0), 0)
    / builds.filter(b => b.duration).length || undefined;

  // 过滤后的构建列表
  const filteredBuilds = filterTab === "all"
    ? builds
    : builds.filter(b => b.status === filterTab);

  const handlePackageDownload = (build: BuildRecord) => {
    setDownloadConfirmBuild(build);
    setShowDownloadConfirmDialog(true);
  };

  const confirmPackageDownload = async () => {
    if (!downloadConfirmBuild) return;
    setShowDownloadConfirmDialog(false);
    try {
      await createPackageAPI(downloadConfirmBuild.id, 'zip');
      window.open(getPackageDownloadUrl(downloadConfirmBuild.id, 'zip'), '_blank');
    } catch (err) {
      showToast('打包失败: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setDownloadConfirmBuild(null);
    }
  };

  const handleTriggerBuild = async () => {
    try {
      const result = await triggerBuild.mutateAsync({
        versionId,
        versionName,
        versionNumber,
        projectPath,
        triggerType: "manual",
        triggeredBy: "user",
      });
      onBuildTriggered?.(result.buildId);
    } catch (err) {
      console.error("Failed to trigger build:", err);
    }
  };

  const handleRebuild = (build: BuildRecord) => {
    setRebuildTarget(build);
    setShowRebuildDialog(true);
  };

  const confirmRebuild = async () => {
    if (!rebuildTarget) return;
    try {
      const result = await rebuildBuild.mutateAsync({
        buildId: rebuildTarget.id,
        triggeredBy: "user",
      });
      onBuildTriggered?.(result.buildId);
      setShowRebuildDialog(false);
      setRebuildTarget(null);
    } catch (err) {
      console.error("Failed to rebuild:", err);
    }
  };

  const handleCancel = async (build: BuildRecord) => {
    try {
      await cancelBuild.mutateAsync(build.id);
    } catch (err) {
      console.error("Failed to cancel build:", err);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm">构建历史</h3>
          {builds.length > 0 && (
            <Badge variant="default" className="text-xs">{builds.length} 次构建</Badge>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleTriggerBuild}
          disabled={triggerBuild.isPending}
          className="gap-1"
        >
          {triggerBuild.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          一键打包
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          加载中...
        </div>
      )}

      {error && (
        <div className="text-sm text-red-500 py-4 text-center">
          加载构建历史失败
        </div>
      )}

      {/* 改进1：Build Summary Stats Bar */}
      {builds.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-muted/30 rounded-lg border">
          <div className="flex flex-col items-center justify-center py-1">
            <span className="text-lg font-semibold text-foreground">{totalBuilds}</span>
            <span className="text-xs text-muted-foreground">总构建</span>
          </div>
          <div className="flex flex-col items-center justify-center py-1">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span className="text-lg font-semibold text-green-600">{successBuilds}</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="w-3 h-3 text-red-500" />
              <span className="text-lg font-semibold text-red-600">{failedBuilds}</span>
            </div>
            <span className="text-xs text-muted-foreground">成功 / 失败</span>
          </div>
          <div className="flex flex-col items-center justify-center py-1">
            <span className={`text-lg font-semibold ${successRate >= 80 ? "text-green-600" : successRate >= 50 ? "text-yellow-600" : "text-red-600"}`}>{successRate}%</span>
            <span className="text-xs text-muted-foreground">成功率</span>
          </div>
          <div className="flex flex-col items-center justify-center py-1">
            <span className="text-xs font-medium text-foreground">{lastBuild ? formatTime(lastBuild.queuedAt) : "-"}</span>
            <span className="text-xs text-muted-foreground">最后构建</span>
          </div>
        </div>
      )}

      {/* 改进3：Build Status Quick Filter */}
      {builds.length > 0 && (
        <div className="flex items-center gap-1 border rounded-lg p-1 bg-card overflow-x-auto">
          {FILTER_TABS.map(tab => {
            const count = tab.key === "all" ? builds.length : builds.filter(b => b.status === tab.key).length;
            const isActive = filterTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {tab.label}
                <span className={`text-xs rounded px-1 ${isActive ? "bg-primary-foreground/20" : "bg-muted"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {!isLoading && builds.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>暂无构建记录</p>
            <p className="text-xs mt-1">点击「一键打包」开始首次构建</p>
          </CardContent>
        </Card>
      )}

      {filteredBuilds.length > 0 && (
        <div className="space-y-2">
          {filteredBuilds.map((build, i) => (
            <BuildRow
              key={build.id}
              build={build}
              onRebuild={handleRebuild}
              onCancel={handleCancel}
              isLatest={i === 0}
              onPackageDownload={handlePackageDownload}
              avgDuration={avgDuration}
            />
          ))}
        </div>
      )}

      {filteredBuilds.length === 0 && builds.length > 0 && (
        <div className="text-sm text-muted-foreground py-4 text-center">
          当前筛选条件下无构建记录
        </div>
      )}

      <Dialog open={showDownloadConfirmDialog} onOpenChange={setShowDownloadConfirmDialog}>
        <DialogContent title="打包下载确认" onClose={() => { setShowDownloadConfirmDialog(false); setDownloadConfirmBuild(null); }}>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              将为构建 <strong>#{downloadConfirmBuild?.buildNumber}</strong> 创建 zip 包并下载。
            </p>
            <p className="text-xs text-muted-foreground">
              首次打包可能需要较长时间，请耐心等待。
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => { setShowDownloadConfirmDialog(false); setDownloadConfirmBuild(null); }}>
              取消
            </Button>
            <Button onClick={confirmPackageDownload}>
              确认打包下载
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRebuildDialog} onOpenChange={setShowRebuildDialog}>
        <DialogContent title="重新打包" onClose={() => setShowRebuildDialog(false)}>
          <div className="space-y-3 py-2">
            <p className="text-sm">
              确定要使用 <code className="bg-muted px-1 py-0.5 rounded">#{rebuildTarget?.buildNumber}</code> 的配置重新打包吗？
            </p>
            {rebuildTarget?.buildCommand && (
              <div className="text-xs bg-muted rounded p-2">
                <span className="text-muted-foreground">命令：</span>
                <code className="ml-1">{rebuildTarget.buildCommand}</code>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              这将创建一次新的构建记录。
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowRebuildDialog(false)}>
              取消
            </Button>
            <Button onClick={confirmRebuild} disabled={rebuildBuild.isPending}>
              {rebuildBuild.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              确认重构建
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast 通知 */}
      {toastVisible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm text-white ${
              toastType === "success" ? "bg-gray-900" : "bg-red-600"
            }`}
          >
            {toastType === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
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
