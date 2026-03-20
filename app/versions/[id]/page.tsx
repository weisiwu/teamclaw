"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Version, BUILD_STATUS_LABELS, BUILD_STATUS_BADGE_VARIANT, VERSION_STATUS_LABELS, VERSION_STATUS_BADGE_VARIANT } from "@/lib/api/types";
import { getVersion, bumpVersion, getVersionScreenshots, getVersionChangelog } from "@/lib/api/versions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Tag, Calendar, Clock, GitBranch, FileText, Star, History, Download, RotateCcw, Zap, Settings, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { BumpHistoryPanel } from "@/components/versions/BumpHistoryPanel";
import { ArtifactsPanel } from "@/components/versions/ArtifactsPanel";
import { RollbackDialog } from "@/components/versions/RollbackDialog";
import { RollbackHistoryPanel } from "@/components/versions/RollbackHistoryPanel";
import { UpgradeConfigDialog } from "@/components/versions/UpgradeConfigDialog";
import { VersionChangeLogPanel } from "@/components/versions/VersionChangeLogPanel";
import { VersionSummaryPanel } from "@/components/versions/VersionSummaryPanel";
import { VersionGitTagPanel } from "@/components/versions/VersionGitTagPanel";
import { VersionTimeline } from "@/components/versions/VersionTimeline";
import { ScreenshotGallery } from "@/components/versions/ScreenshotGallery";
import { MessageSelector, MessageItem } from "@/components/versions/MessageSelector";
import { linkScreenshot } from "@/lib/api/versions";

export default function VersionDetailPage() {
  const params = useParams();
  // const router = useRouter();
  const id = params.id as string;

  const [version, setVersion] = useState<Version | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [screenshots, setScreenshots] = useState<import("@/lib/api/types").VersionMessageScreenshot[]>([]);
  const [changelog, setChangelog] = useState<import("@/lib/api/types").VersionChangelog | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "bumpHistory" | "artifacts" | "rollback" | "changelog" | "versionSummary" | "gitTag" | "screenshots" | "timeline">("details");
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [upgradeConfigOpen, setUpgradeConfigOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);
  const [messageSelectorOpen, setMessageSelectorOpen] = useState(false);
  const [linkingScreenshot, setLinkingScreenshot] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    Promise.all([
      getVersion(id),
      getVersionScreenshots(id),
      getVersionChangelog(id),
    ])
      .then(([v, screenshotsData, changelogData]) => {
        setVersion(v);
        setScreenshots(screenshotsData?.data || []);
        setChangelog(changelogData?.data || null);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleLinkScreenshot = async (message: MessageItem) => {
    setMessageSelectorOpen(false);
    setLinkingScreenshot(true);
    try {
      // Try to extract screenshot URL from message content (for image messages)
      let screenshotUrl = "";
      try {
        const parsed = JSON.parse(message.content);
        if (parsed.image_key) {
          // This is an image message - would need Feishu image download token
          // Use a placeholder for now; in production you'd call /im/v1/images/{image_key}
          screenshotUrl = `https://open.feishu.cn/open-apis/im/v1/images/${parsed.image_key}`;
        }
      } catch {
        // Not JSON, content is plain text - no screenshot URL
        screenshotUrl = "";
      }

      const newScreenshot = await linkScreenshot(id, {
        messageId: message.id,
        messageContent: message.content,
        senderName: message.senderName,
        senderAvatar: message.senderAvatar,
        screenshotUrl,
        thumbnailUrl: screenshotUrl,
      });
      setScreenshots((prev) => [newScreenshot, ...prev]);
    } catch (err) {
      console.error("[VersionDetail] Failed to link screenshot:", err);
      alert(`关联截图失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLinkingScreenshot(false);
    }
  };

  const handleUnlinkScreenshot = async (screenshotId: string) => {
    try {
      const { unlinkScreenshot: unlink } = await import("@/lib/api/versions");
      await unlink(screenshotId);
      setScreenshots((prev) => prev.filter((s) => s.id !== screenshotId));
    } catch (err) {
      console.error("[VersionDetail] Failed to unlink screenshot:", err);
    }
  };

  const handleManualUpgrade = async (bumpType?: "major" | "minor" | "patch") => {
    setIsUpgrading(true);
    setUpgradeMessage(null);
    try {
      const result = await bumpVersion(id, bumpType || "patch");
      setUpgradeMessage(`${result.previousVersion} → ${result.newVersion} (${result.bumpType})`);
      // Refresh version data
      const refreshed = await getVersion(id);
      setVersion(refreshed);
    } catch (err) {
      setUpgradeMessage(`升级失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUpgrading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">加载中...</span>
      </div>
    );
  }

  if (!version) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-500 mb-4">版本不存在</p>
        <Link href="/versions">
          <Button variant="outline">返回列表</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/versions">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="w-4 h-4" />
            返回
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-gray-900">{version.version}</h1>
            <Badge variant={VERSION_STATUS_BADGE_VARIANT[version.status]}>
              {VERSION_STATUS_LABELS[version.status]}
            </Badge>
            <Badge variant={BUILD_STATUS_BADGE_VARIANT[version.buildStatus]}>
              {BUILD_STATUS_LABELS[version.buildStatus]}
            </Badge>
            {version.isMain && (
              <Badge variant="success" className="gap-1">
                <Star className="w-3 h-3" />主版本
              </Badge>
            )}
          </div>
          <p className="text-gray-500 mt-1">{version.title}</p>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-1">
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "details"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-500 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("details")}
          >
            基本信息
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "bumpHistory"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-500 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("bumpHistory")}
          >
            <History className="w-4 h-4" />
            Bump 历史
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "artifacts"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-500 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("artifacts")}
          >
            <Download className="w-4 h-4" />
            产物下载
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "rollback"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-500 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("rollback")}
          >
            <RotateCcw className="w-4 h-4" />
            版本回退
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "changelog"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-500 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("changelog")}
          >
            <FileText className="w-4 h-4" />
            变更记录
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "versionSummary"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-500 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("versionSummary")}
          >
            <FileText className="w-4 h-4" />
            版本摘要
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "gitTag"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-500 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("gitTag")}
          >
            <Tag className="w-4 h-4" />
            Git Tag
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "timeline"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-500 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("timeline")}
          >
            <Clock className="w-4 h-4" />
            变更时间线
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "screenshots"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-500 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("screenshots")}
          >
            <ImageIcon className="w-4 h-4" />
            截图 {screenshots.length > 0 && `(${screenshots.length})`}
          </button>
        </div>
      </div>

      {activeTab === "artifacts" ? (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <Download className="w-4 h-4" />
            构建产物下载
          </h2>
          <ArtifactsPanel versionId={id} versionName={version.version} />
        </div>
      ) : activeTab === "bumpHistory" ? (
        <div>
          <BumpHistoryPanel versionId={id} />
        </div>
      ) : activeTab === "rollback" ? (
        <div className="space-y-4">
          {/* Rollback action bar */}
          <div className="bg-white rounded-xl border p-4 flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                版本回退
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                将项目回退到任意历史版本，支持标签、分支或提交记录
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => setRollbackDialogOpen(true)}
            >
              <RotateCcw className="w-4 h-4" />
              执行回退
            </Button>
          </div>

          {/* Rollback history */}
          <div className="bg-white rounded-xl border p-5">
            <RollbackHistoryPanel versionId={id} />
          </div>
        </div>
      ) : activeTab === "changelog" ? (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            变更记录
          </h2>
          <VersionChangeLogPanel
            versionId={id}
            versionCreatedAt={version.createdAt}
          />
        </div>
      ) : activeTab === "versionSummary" ? (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            版本摘要
          </h2>
          <VersionSummaryPanel
            versionId={id}
            versionName={version.version}
          />
        </div>
      ) : activeTab === "gitTag" ? (
        <div className="bg-white rounded-xl border p-5">
          <VersionGitTagPanel version={version} onRefresh={setVersion} />
        </div>
      ) : activeTab === "timeline" ? (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            变更时间线
          </h2>
          <VersionTimeline
            screenshots={screenshots}
            changelog={changelog}
            versionInfo={{
              version: version.version,
              createdAt: version.createdAt,
              createdBy: version.summaryGeneratedBy || "system",
            }}
            isOpen={true}
            onClose={() => setActiveTab("details")}
            versionId={id}
          />
        </div>
      ) : activeTab === "screenshots" ? (
        <div className="bg-white rounded-xl border p-5">
          <ScreenshotGallery
            screenshots={screenshots}
            onLink={() => setMessageSelectorOpen(true)}
            onUnlink={handleUnlinkScreenshot}
            loading={linkingScreenshot}
          />
        </div>
      ) : (
        <div className="space-y-6">
        {/* Description */}
        {version.description && (
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-sm font-medium text-gray-500 mb-2">描述</h2>
            <p className="text-gray-900">{version.description}</p>
          </div>
        )}

        {/* Auto Upgrade Section */}
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                自动升级
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                任务完成后自动 bump 版本号，或手动触发升级
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setUpgradeConfigOpen(true)}
              >
                <Settings className="w-4 h-4" />
                升级配置
              </Button>
              <Button
                variant="default"
                size="sm"
                className="gap-1.5"
                onClick={() => handleManualUpgrade("patch")}
                disabled={isUpgrading}
              >
                {isUpgrading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                手动升级 (Patch)
              </Button>
            </div>
          </div>
          {upgradeMessage && (
            <div className={`text-sm mt-2 px-3 py-2 rounded-lg ${upgradeMessage.includes("失败") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
              {upgradeMessage}
            </div>
          )}
          {/* Quick bump type selector */}
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={() => handleManualUpgrade("major")} disabled={isUpgrading}>Major</Button>
            <Button size="sm" variant="outline" onClick={() => handleManualUpgrade("minor")} disabled={isUpgrading}>Minor</Button>
            <Button size="sm" variant="outline" onClick={() => handleManualUpgrade("patch")} disabled={isUpgrading}>Patch</Button>
          </div>
        </div>



        {/* Info grid */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-medium text-gray-500 mb-4">版本信息</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-400">创建时间</div>
                <div className="text-sm text-gray-900">
                  {version.createdAt ? new Date(version.createdAt).toLocaleString("zh-CN") : "-"}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-400">发布时间</div>
                <div className="text-sm text-gray-900">
                  {version.releasedAt ? new Date(version.releasedAt).toLocaleString("zh-CN") : "-"}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <GitBranch className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-400">提交数</div>
                <div className="text-sm text-gray-900">{version.commitCount} 次提交</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-400">变更文件</div>
                <div className="text-sm text-gray-900">{version.changedFiles.length} 个文件</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-medium text-gray-500 mb-3">标签</h2>
          <div className="flex flex-wrap gap-2">
            {version.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                {tag}
              </span>
            ))}
            {version.tags.length === 0 && <span className="text-gray-400 text-sm">无标签</span>}
          </div>
        </div>

        {/* Changed files */}
        {version.changedFiles.length > 0 && (
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-sm font-medium text-gray-500 mb-3">变更文件</h2>
            <div className="max-h-60 overflow-y-auto">
              <ul className="space-y-1">
                {version.changedFiles.map((file, i) => (
                  <li key={i} className="text-sm font-mono text-gray-600 truncate">
                    {file}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        </div>
      )}

      <RollbackDialog
        version={version}
        open={rollbackDialogOpen}
        onOpenChange={setRollbackDialogOpen}
        onRollbackComplete={() => {
          // Refresh version data after rollback
          getVersion(id).then(setVersion).catch(console.error);
        }}
      />

      <UpgradeConfigDialog
        isOpen={upgradeConfigOpen}
        onClose={() => setUpgradeConfigOpen(false)}
        versionId={id}
        versionName={version.version}
        onSave={async (_config) => {
          setUpgradeConfigOpen(false);
        }}
        onPreview={() => {
          // Preview is handled by the dialog itself
        }}
        isSaving={false}
        isLoading={false}
      />

      <MessageSelector
        open={messageSelectorOpen}
        onOpenChange={setMessageSelectorOpen}
        onSelect={handleLinkScreenshot}
      />
    </div>
  );
}
