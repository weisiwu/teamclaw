"use client";

import { GitTag } from "@/lib/api/types";
import { X, Tag, Copy, Check, Link2, FileText, Plus, Zap, RefreshCw, GitCommit, Files, ArrowUp, ArrowDown, Play, Package, Loader2, CheckCircle2, XCircle, Clock, RotateCcw, Activity, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { VersionMessageScreenshot } from "@/lib/api/types";
import { useVersionChangeStats } from "@/lib/api/versions";
import { useLatestBuild, useBuilds, useTriggerBuild, BuildRecord } from "@/lib/api/builds";
import { ArtifactsPanel } from "@/components/versions/ArtifactsPanel";

interface VersionTagsDetailDrawerProps {
  tag: GitTag | null;
  screenshots?: VersionMessageScreenshot[];
  onClose: () => void;
  onLinkScreenshot?: (tagName: string) => void;
  onUnlinkScreenshot?: (screenshotId: string) => void;
  /** 触发构建后的回调，可用于刷新构建状态 */
  onBuildTriggered?: (buildId: string) => void;
  /** 项目路径（用于触发构建） */
  buildProjectPath?: string;
}

const statusConfig = {
  active: { label: "活跃", variant: "success" as const },
  archived: { label: "已归档", variant: "warning" as const },
  protected: { label: "保护", variant: "info" as const },
};

// Conventional commit type detection
const commitTypeConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
  feat:    { label: "新功能",   bgClass: "bg-emerald-50",  textClass: "text-emerald-700" },
  fix:     { label: "Bug修复",  bgClass: "bg-red-50",      textClass: "text-red-700" },
  docs:    { label: "文档",     bgClass: "bg-blue-50",     textClass: "text-blue-700" },
  style:   { label: "样式",    bgClass: "bg-purple-50",   textClass: "text-purple-700" },
  refactor:{ label: "重构",     bgClass: "bg-orange-50",   textClass: "text-orange-700" },
  perf:    { label: "性能",    bgClass: "bg-yellow-50",   textClass: "text-yellow-700" },
  ci:      { label: "CI/CD",   bgClass: "bg-slate-50",    textClass: "text-slate-700" },
  test:    { label: "测试",    bgClass: "bg-pink-50",     textClass: "text-pink-700" },
  chore:   { label: "构建",    bgClass: "bg-gray-50",     textClass: "text-gray-600" },
};

function detectCommitType(subject: string): string | null {
  const match = subject.match(/^(\w+)[\(:]/);
  if (!match) return null;
  return match[1].toLowerCase();
}

function getChangeTypes(subject: string): Array<{ label: string; bgClass: string; textClass: string }> {
  const types: Array<{ label: string; bgClass: string; textClass: string }> = [];
  const type = detectCommitType(subject);
  if (type && commitTypeConfig[type]) {
    types.push(commitTypeConfig[type]);
  }
  return types;
}

function SectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ElementType;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      {action}
    </div>
  );
}

export function VersionTagsDetailDrawer({
  tag,
  screenshots = [],
  onClose,
  onLinkScreenshot,
  onUnlinkScreenshot,
  onBuildTriggered,
  buildProjectPath,
}: VersionTagsDetailDrawerProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showBuildHistory, setShowBuildHistory] = useState(false);
  const [showArtifacts, setShowArtifacts] = useState(false);

  const { data: changeStats, isLoading: statsLoading } = useVersionChangeStats(tag?.name ?? null);
  const { data: latestBuild, isLoading: latestBuildLoading } = useLatestBuild(tag?.name ?? '');
  const { data: buildListData } = useBuilds(tag?.name ?? '', 5);
  const triggerBuild = useTriggerBuild();

  const builds = buildListData?.builds || [];

  const handleTriggerBuild = async () => {
    if (!tag) return;
    try {
      const result = await triggerBuild.mutateAsync({
        versionId: tag.name,
        versionName: tag.name,
        versionNumber: tag.version || tag.name,
        projectPath: buildProjectPath,
        triggeredBy: 'user',
        triggerType: 'manual',
      });
      onBuildTriggered?.(result.buildId);
    } catch (err) {
      console.error('Failed to trigger build:', err);
      alert('触发构建失败: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  function formatDuration(ms?: number): string {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }

  function BuildStatusBadge({ status }: { status: BuildRecord['status'] }) {
    const configs: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
      success:   { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: '成功', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
      failed:    { icon: <XCircle className="w-3.5 h-3.5" />, label: '失败', cls: 'text-red-600 bg-red-50 border-red-200' },
      building:  { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, label: '构建中', cls: 'text-blue-600 bg-blue-50 border-blue-200' },
      pending:   { icon: <Clock className="w-3.5 h-3.5" />, label: '排队中', cls: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
      cancelled: { icon: <XCircle className="w-3.5 h-3.5" />, label: '已取消', cls: 'text-gray-500 bg-gray-50 border-gray-200' },
    };
    const cfg = configs[status] || configs.pending;
    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium', cfg.cls)}>
        {cfg.icon}{cfg.label}
      </span>
    );
  }

  if (!tag) return null;

  const status = statusConfig[tag.status];
  const changeTypes = getChangeTypes(tag.subject);
  const date = new Date(tag.taggerDate).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Build change type badges from stats API
  const statsChangeTypes = changeStats?.changeTypes
    ? Object.entries(changeStats.changeTypes)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => {
          const config = commitTypeConfig[type] ?? {
            label: type,
            bgClass: "bg-gray-50",
            textClass: "text-gray-700",
          };
          return { type, count: count as number, ...config };
        })
    : [];

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">版本详情</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Tag name + status + change type */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-2xl font-bold text-gray-900">
              {tag.name}
            </span>
            <Badge variant={status.variant}>{status.label}</Badge>
            {changeTypes.map((ct) => (
              <span
                key={ct.label}
                className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", ct.bgClass, ct.textClass)}
              >
                {ct.label}
              </span>
            ))}
          </div>

          {/* Version */}
          <DetailItem
            label="版本号"
            value={tag.version}
            copyValue={tag.version}
            onCopy={handleCopy}
            copied={copiedField === "version"}
          />

          {/* Commit hash */}
          <DetailItem
            label="Commit Hash"
            value={tag.commitHash}
            copyValue={tag.commitHash}
            onCopy={handleCopy}
            copied={copiedField === "commitHash"}
            isMonospace
          />

          {/* Commit message */}
          <DetailItem label="提交信息" value={tag.subject} />

          {/* Author */}
          <DetailItem label="作者" value={tag.author} />

          {/* Email */}
          <DetailItem label="邮箱" value={tag.authorEmail} />

          {/* Date */}
          <DetailItem label="创建时间" value={date} />

          {/* Project */}
          <DetailItem label="项目" value={tag.projectName} />

          {/* ========== 变更摘要 Section ========== */}
          <div className="border-t pt-5">
            <SectionHeader
              icon={FileText}
              title="版本摘要"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-gray-400 hover:text-gray-600"
                  onClick={() => {
                    window.open(`/versions/panel?tag=${encodeURIComponent(tag.name)}`, '_blank');
                  }}
                >
                  <RefreshCw className="w-3 h-3 mr-0.5" />
                  刷新
                </Button>
              }
            />

            {/* Stats row */}
            {statsLoading ? (
              <div className="bg-gray-50 rounded-xl p-4 text-center text-xs text-gray-400">
                加载中...
              </div>
            ) : changeStats ? (
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                {/* Commit + file stats */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-sm">
                    <GitCommit className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-700">{changeStats.commitCount}</span>
                    <span className="text-gray-400 text-xs">commits</span>
                  </div>
                  <div className="h-4 w-px bg-gray-200" />
                  <div className="flex items-center gap-1.5 text-sm">
                    <Files className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-700">{changeStats.fileCount}</span>
                    <span className="text-gray-400 text-xs">文件</span>
                  </div>
                  <div className="h-4 w-px bg-gray-200" />
                  <div className="flex items-center gap-1.5 text-sm text-green-600">
                    <ArrowUp className="w-4 h-4" />
                    <span className="font-medium">{changeStats.totalAdditions}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-red-500">
                    <ArrowDown className="w-4 h-4" />
                    <span className="font-medium">{changeStats.totalDeletions}</span>
                  </div>
                </div>

                {/* Change type breakdown from API */}
                {statsChangeTypes.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 font-medium">变更类型分布</div>
                    <div className="flex flex-wrap gap-2">
                      {statsChangeTypes.map(({ type, count, label, bgClass, textClass }) => (
                        <span
                          key={type}
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border",
                            bgClass,
                            textClass
                          )}
                          style={{ borderColor: 'currentColor', opacity: 0.8 }}
                        >
                          {label}
                          <span className="ml-0.5 opacity-60">×{count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span>无明确类型标注（建议使用 conventional commits）</span>
                  </div>
                )}

                {/* Top changed files */}
                {changeStats.topFiles && changeStats.topFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 font-medium">变更最多的文件</div>
                    <div className="space-y-1.5">
                      {changeStats.topFiles.slice(0, 5).map((file, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 w-4">{i + 1}.</span>
                          <span className="flex-1 text-gray-600 font-mono truncate" title={file.path}>
                            {file.path.split('/').pop()}
                          </span>
                          <span className="text-green-600">+{file.additions}</span>
                          <span className="text-red-500">-{file.deletions}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Link to full panel */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-7"
                    onClick={() => {
                      const panelUrl = `/versions/panel?tag=${encodeURIComponent(tag.name)}`;
                      window.open(panelUrl, '_blank');
                    }}
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    查看完整变更
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                {changeTypes.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 font-medium">变更类型</div>
                    <div className="flex flex-wrap gap-2">
                      {changeTypes.map((ct) => (
                        <span
                          key={ct.label}
                          className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border",
                            ct.bgClass,
                            ct.textClass,
                            "border-opacity-50"
                          )}
                          style={{ borderColor: 'currentColor', opacity: 0.8 }}
                        >
                          {ct.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span>无明确类型标注（建议使用 conventional commits）</span>
                  </div>
                )}
                <div className="text-xs text-gray-400 leading-relaxed">
                  查看完整变更历史，请访问「版本面板」查看该版本的详细文件变更和 commit 记录。
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-7"
                    onClick={() => {
                      const panelUrl = `/versions/panel?tag=${encodeURIComponent(tag.name)}`;
                      window.open(panelUrl, '_blank');
                    }}
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    查看完整变更
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ========== 构建 Section ========== */}
          <div className="border-t pt-5">
            <SectionHeader
              icon={Package}
              title="构建"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-gray-400 hover:text-gray-600"
                  onClick={() => setShowBuildHistory(!showBuildHistory)}
                >
                  {showBuildHistory ? '收起历史' : '查看历史'}
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </Button>
              }
            />
            {latestBuildLoading ? (
              <div className="bg-gray-50 rounded-xl p-4 text-center text-xs text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                加载构建状态...
              </div>
            ) : latestBuild ? (
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                {/* Latest build row */}
                <div className="flex items-center gap-3">
                  <BuildStatusBadge status={latestBuild.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700">
                      #{latestBuild.buildNumber}
                      {latestBuild.triggerType === 'rebuild' && (
                        <Badge variant="default" className="ml-1 text-xs bg-yellow-100 text-yellow-700">重构建</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(latestBuild.queuedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      {latestBuild.duration && (
                        <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{formatDuration(latestBuild.duration)}</span>
                      )}
                      {latestBuild.artifactCount != null && latestBuild.artifactCount > 0 && (
                        <span className="flex items-center gap-1"><Package className="w-3 h-3" />{latestBuild.artifactCount} 个产物</span>
                      )}
                    </div>
                  </div>
                  {(latestBuild.status === 'success' || latestBuild.status === 'failed') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={handleTriggerBuild}
                      disabled={triggerBuild.isPending}
                    >
                      {triggerBuild.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                      重新构建
                    </Button>
                  )}
                </div>

                {/* Build history (collapsed) */}
                {!showBuildHistory && builds.length > 1 && (
                  <button
                    className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                    onClick={() => setShowBuildHistory(true)}
                  >
                    <ExternalLink className="w-3 h-3" />
                    查看另外 {builds.length - 1} 次构建历史
                  </button>
                )}

                {/* Build history (expanded) */}
                {showBuildHistory && builds.length > 1 && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="text-xs text-gray-400">构建历史</div>
                    {builds.slice(0, 5).map((b) => (
                      <div key={b.id} className="flex items-center gap-2 text-xs">
                        <BuildStatusBadge status={b.status} />
                        <span className="text-gray-500">#{b.buildNumber}</span>
                        <span className="text-gray-400 flex-1 truncate">{new Date(b.queuedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        {b.duration && <span className="text-gray-400">{formatDuration(b.duration)}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* 产物下载入口 - 构建成功时显示 */}
                {latestBuild.status === 'success' && (
                  <div className="pt-2 border-t mt-2">
                    <button
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      onClick={() => setShowArtifacts(!showArtifacts)}
                    >
                      <Package className="w-3.5 h-3.5" />
                      {showArtifacts ? '收起产物列表' : '查看产物'}
                      {latestBuild.artifactCount != null && latestBuild.artifactCount > 0 && (
                        <span className="text-gray-400">({latestBuild.artifactCount})</span>
                      )}
                    </button>
                    {showArtifacts && tag && (
                      <div className="mt-2">
                        <ArtifactsPanel versionId={tag.name} versionName={tag.name} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                <div className="text-gray-400 text-sm">暂无构建记录</div>
                <div className="text-xs text-gray-300 mt-1">触发构建以生成部署产物</div>
              </div>
            )}

            {/* Quick build trigger (always visible) */}
            <div className="mt-3">
              <Button
                className="w-full gap-2"
                size="sm"
                onClick={handleTriggerBuild}
                disabled={triggerBuild.isPending || !tag}
              >
                {triggerBuild.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 构建中...</>
                ) : (
                  <><Play className="w-3.5 h-3.5" /> 一键构建</>
                )}
              </Button>
            </div>
          </div>

          {/* ========== 消息截图 Section ========== */}
          <div className="border-t pt-5">
            <SectionHeader
              icon={Link2}
              title="消息截图"
              action={
                onLinkScreenshot && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => onLinkScreenshot(tag.name)}
                  >
                    <Plus className="w-3 h-3 mr-0.5" />
                    关联截图
                  </Button>
                )
              }
            />
            {screenshots.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                <div className="text-gray-400 text-sm">暂无关联截图</div>
                <div className="text-xs text-gray-300 mt-1">关联飞书消息截图，让版本历史更完整</div>
                {onLinkScreenshot && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 h-8 text-xs"
                    onClick={() => onLinkScreenshot(tag.name)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    关联截图
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {screenshots.map((screenshot) => (
                  <div
                    key={screenshot.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="w-16 h-10 rounded bg-gray-200 flex-shrink-0 overflow-hidden">
                      <img
                        src={screenshot.thumbnailUrl || screenshot.screenshotUrl}
                        alt="screenshot"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-700 truncate">
                        {screenshot.messageContent || '消息截图'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(screenshot.createdAt).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                    {onUnlinkScreenshot && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                        onClick={() => onUnlinkScreenshot(screenshot.id)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                {/* Thumbnail grid for multiple screenshots */}
                {screenshots.length > 1 && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {screenshots.slice(0, 6).map((screenshot) => (
                      <div
                        key={screenshot.id}
                        className="aspect-video rounded overflow-hidden bg-gray-100 border border-gray-200"
                      >
                        <img
                          src={screenshot.thumbnailUrl || screenshot.screenshotUrl}
                          alt="screenshot"
                          className="w-full h-full object-cover hover:opacity-80 cursor-pointer transition-opacity"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => handleCopy(tag.commitHash, "commitHash")}
            >
              {copiedField === "commitHash" ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  复制 Hash
                </>
              )}
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleTriggerBuild}
              disabled={triggerBuild.isPending || !tag}
            >
              {triggerBuild.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 构建中</>
              ) : (
                <><Play className="w-4 h-4" /> 构建</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailItem({
  label,
  value,
  copyValue,
  onCopy,
  copied,
  isMonospace,
}: {
  label: string;
  value: string;
  copyValue?: string;
  onCopy?: (text: string, field: string) => void;
  copied?: boolean;
  isMonospace?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-1.5">{label}</div>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-sm text-gray-700",
            isMonospace && "font-mono text-gray-800"
          )}
        >
          {value}
        </span>
        {copyValue && onCopy && (
          <button
            onClick={() => onCopy(copyValue, label.toLowerCase().replace(/\s/g, ""))}
            className={cn(
              "p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            )}
            title="复制"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
