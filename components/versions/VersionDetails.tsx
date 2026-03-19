/**
 * Version Details Modal
 * 显示版本完整信息、构建日志、产物列表
 */
"use client";

import { useState } from "react";
import { Version, BUILD_STATUS_LABELS, BUILD_STATUS_BADGE_VARIANT } from "@/lib/api/types";
import { useBuildArtifacts, useVersionScreenshots, useVersionChangelog, useRefreshVersionSummary, useVersionArtifacts } from "@/lib/api/versions";
import { useLatestBuild, useRebuildBuild, useRollbackBuild } from "@/lib/api/builds";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScreenshotGallery, ChangelogPanel, VersionTimeline } from "@/components/versions";

import {
  Calendar,
  Clock,
  GitBranch,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  Play,
  Image,
  History,
  RefreshCw,
} from "lucide-react";
import { BuildTriggerDialog } from "./BuildTriggerDialog";

interface VersionDetailsProps {
  version: Version | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 构建完成回调，用于更新外部构建历史 */
  onBuildComplete?: (buildId: string, versionName: string, status: 'success' | 'failed') => void;
  /** 消息截图关联回调 */
  onLinkScreenshot?: () => void;
  /** 取消关联截图回调 */
  onUnlinkScreenshot?: (screenshotId: string) => void;
  /** 生成变更摘要回调（已废弃，使用内部刷新逻辑） */
  onGenerateChangelog?: () => void;
}

export function VersionDetails(props: VersionDetailsProps) {
  const { version, open, onOpenChange, onBuildComplete, onLinkScreenshot, onUnlinkScreenshot } = props;
  const [activeTab, setActiveTab] = useState<"info" | "logs" | "artifacts" | "screenshots" | "changelog" | "timeline">("info");
  const [buildDialogOpen, setBuildDialogOpen] = useState(false);

  // 从 API 获取真实产物列表（version.title 可用，因为 open=true 时 version 必定存在）
  const { data: realArtifacts = [] } = useBuildArtifacts(version?.title);

  // 截图和变更摘要数据
  const { data: screenshotsData, isLoading: isLoadingScreenshots } = useVersionScreenshots(version?.id || "");
  const { data: changelogData } = useVersionChangelog(version?.id || "");
  const refreshSummaryMutation = useRefreshVersionSummary();

  // 构建相关 hooks
  const { data: latestBuild } = useLatestBuild(version?.id || "");
  const rebuildBuild = useRebuildBuild();
  const rollbackBuild = useRollbackBuild();
  const [rebuilding, setRebuilding] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  // Express 服务器产物列表（真实构建产物）
  const { data: serverArtifacts = [] } = useVersionArtifacts(version?.id || "", latestBuild?.buildNumber);

  const screenshots = screenshotsData?.data || [];
  const changelog = changelogData?.data || null;

  const handleRebuild = async () => {
    if (!latestBuild?.id || !version) return;
    setRebuilding(true);
    try {
      await rebuildBuild.mutateAsync({
        buildId: latestBuild.id,
        triggeredBy: 'user',
      });
    } catch (err) {
      console.error('Rebuild failed:', err);
    } finally {
      setRebuilding(false);
    }
  };

  const handleRollback = async () => {
    if (!latestBuild?.id || !version) return;
    if (!window.confirm(`确定要回退到版本 "${version.title}" 的构建状态吗？当前未提交的更改将会丢失。`)) return;
    setRollingBack(true);
    try {
      await rollbackBuild.mutateAsync({
        buildId: latestBuild.id,
        targetType: 'tag',
        createBranch: true,
      });
      alert('回退成功');
    } catch (err) {
      console.error('Rollback failed:', err);
      alert('回退失败: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setRollingBack(false);
    }
  };

  const handleRefreshSummary = () => {
    if (!version?.id) return;
    refreshSummaryMutation.mutate({
      versionId: version.id,
      commitLog: version.changedFiles?.join('\n'),
    });
  };

  if (!version || !open) return null;

  // 模拟构建日志（实际应从 API 获取）
  const buildLogs = [
    { time: "10:30:00", message: "开始构建 v1.2.0", status: "info" },
    { time: "10:31:15", message: "安装依赖完成", status: "success" },
    { time: "10:32:00", message: "运行测试用例...", status: "info" },
    { time: "10:33:45", message: "测试通过 (45/45)", status: "success" },
    { time: "10:34:20", message: "开始打包...", status: "info" },
    { time: "10:35:00", message: "构建成功", status: "success" },
    { time: "10:35:30", message: "上传产物到存储", status: "info" },
    { time: "10:36:00", message: "构建完成", status: "success" },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      
      {/* 模态框 */}
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden m-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <h2 className="text-lg font-semibold">{version.title}</h2>
              <Badge variant={BUILD_STATUS_BADGE_VARIANT[version.buildStatus]}>
                {BUILD_STATUS_LABELS[version.buildStatus]}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {latestBuild && latestBuild.status === 'success' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRebuild}
                  disabled={rebuilding || rebuildBuild.isPending}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${rebuilding || rebuildBuild.isPending ? 'animate-spin' : ''}`} />
                  重新打包
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRollback}
                  disabled={rollingBack || rollbackBuild.isPending}
                >
                  <History className={`w-4 h-4 mr-1 ${rollingBack || rollbackBuild.isPending ? 'animate-spin' : ''}`} />
                  回退到此版本
                </Button>
              </>
            )}
            {serverArtifacts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const first = serverArtifacts[0];
                  if (first) window.open(first.url, "_blank");
                }}
              >
                <Download className="w-4 h-4 mr-1" />
                下载产物
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBuildDialogOpen(true)}
            >
              <Play className="w-4 h-4 mr-1" />
              开始构建
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 标签切换 */}
        <div className="flex border-b">
          <button
            className={`flex-1 py-3 text-sm font-medium ${activeTab === "info" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-500"}`}
            onClick={() => setActiveTab("info")}
          >
            版本信息
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium ${activeTab === "logs" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-500"}`}
            onClick={() => setActiveTab("logs")}
          >
            构建日志
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium ${activeTab === "artifacts" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-500"}`}
            onClick={() => setActiveTab("artifacts")}
          >
            产物列表
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1 ${activeTab === "screenshots" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-500"}`}
            onClick={() => setActiveTab("screenshots")}
          >
            <Image className="w-3.5 h-3.5" />
            截图
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1 ${activeTab === "changelog" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-500"}`}
            onClick={() => setActiveTab("changelog")}
          >
            <FileText className="w-3.5 h-3.5" />
            变更摘要
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1 ${activeTab === "timeline" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-500"}`}
            onClick={() => setActiveTab("timeline")}
          >
            <History className="w-3.5 h-3.5" />
            时间线
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {activeTab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">版本号</label>
                  <p className="font-semibold">{version.version}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">状态</label>
                  <p>{version.status}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">创建时间</label>
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {new Date(version.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">发布时间</label>
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {version.releasedAt ? new Date(version.releasedAt).toLocaleString("zh-CN") : "未发布"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">主版本</label>
                  <p>{version.isMain ? "✓ 是主版本" : "—"}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">提交数</label>
                  <p className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-gray-400" />
                    {version.commitCount} 次提交
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">最近构建</label>
                  {latestBuild ? (
                    <div className="flex items-center gap-2">
                      {latestBuild.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {latestBuild.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                      {(latestBuild.status === 'building' || latestBuild.status === 'pending') && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                      <span className={latestBuild.status === 'success' ? 'text-green-600' : latestBuild.status === 'failed' ? 'text-red-600' : 'text-blue-600'}>
                        {latestBuild.status === 'success' ? '成功' : latestBuild.status === 'failed' ? '失败' : latestBuild.status === 'building' ? '构建中...' : '排队中'}
                      </span>
                      {latestBuild.duration && (
                        <span className="text-xs text-gray-400">({Math.round(latestBuild.duration / 1000)}s)</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">暂无构建记录</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">描述</label>
                <p>{version.description || "无描述"}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">变更文件</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {version.changedFiles.length > 0 ? (
                    version.changedFiles.map((file, i) => (
                      <Badge key={i} variant="default">
                        <FileText className="w-3 h-3 mr-1" />
                        {file}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-gray-400">无变更文件</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">标签</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {version.tags.map((tag) => (
                    <Badge key={tag} variant="default">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm">
              {buildLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 py-1">
                  <span className="text-gray-500 shrink-0">{log.time}</span>
                  {getStatusIcon(log.status)}
                  <span className={log.status === "error" ? "text-red-400" : log.status === "success" ? "text-green-400" : "text-gray-300"}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "artifacts" && (
            <div className="space-y-3">
              {/* 构建产物（来自 Express 服务器） */}
              {serverArtifacts.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-500">构建产物（第 {latestBuild?.buildNumber || "?"} 次构建）</h4>
                    <span className="text-xs text-gray-400">{latestBuild?.status || ""}</span>
                  </div>
                  <div className="space-y-2">
                    {serverArtifacts.map((artifact, i) => (
                      <div key={`srv-${i}`} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg">
                        <div className="flex items-center gap-3 min-w-0">
                          <Download className="w-5 h-5 text-blue-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-mono text-sm block truncate">{artifact.name}</span>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span>{artifact.sizeFormatted}</span>
                              <span>·</span>
                              <span>{artifact.type}</span>
                              <span>·</span>
                              <span>{new Date(artifact.modifiedAt).toLocaleDateString("zh-CN")}</span>
                            </div>
                          </div>
                        </div>
                        <a
                          href={artifact.url}
                          download={artifact.name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 bg-blue-600 text-white hover:bg-blue-700 shrink-0"
                        >
                          下载
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <Download className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无构建产物</p>
                  <p className="text-xs mt-1">构建完成后产物将显示在这里</p>
                </div>
              )}

              {/* 手动上传的产物（来自 Next.js API） */}
              {realArtifacts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">手动上传</h4>
                  <div className="space-y-2">
                    {realArtifacts.map((artifact, i) => (
                      <div key={`manual-${i}`} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3 min-w-0">
                          <Download className="w-5 h-5 text-gray-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-mono text-sm block truncate">{artifact.filename}</span>
                            <span className="text-xs text-gray-400">{artifact.platform} / {artifact.arch} / {artifact.env}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-sm text-gray-500">{artifact.size}</span>
                          <a
                            href={artifact.downloadUrl}
                            download={artifact.filename}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            下载
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "screenshots" && (
            <ScreenshotGallery
              screenshots={screenshots}
              loading={isLoadingScreenshots}
              onLink={onLinkScreenshot}
              onUnlink={onUnlinkScreenshot}
            />
          )}

          {activeTab === "changelog" && (
            <ChangelogPanel
              changelog={changelog}
              loading={false}
              generating={refreshSummaryMutation.isPending}
              onGenerate={handleRefreshSummary}
              versionSummary={version.summary}
              summaryGeneratedAt={version.summaryGeneratedAt}
              summaryGeneratedBy={version.summaryGeneratedBy}
            />
          )}

          {activeTab === "timeline" && (
            <VersionTimeline
              screenshots={screenshots}
              changelog={changelog}
              versionInfo={{
                version: version.version,
                createdAt: version.createdAt,
                createdBy: "",
              }}
              isOpen={activeTab === "timeline"}
              onClose={() => setActiveTab("info")}
            />
          )}
        </div>
      </div>

      <BuildTriggerDialog
        open={buildDialogOpen}
        onOpenChange={setBuildDialogOpen}
        presetVersion={version}
        onBuildComplete={onBuildComplete}
      />
    </div>
  );
}
