"use client";

import { useState, useMemo, useEffect } from "react";
import { useTags } from "@/lib/api/tags";
import { GitTag } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Tag, GitCommit, User, Calendar, Search, X,
  ChevronDown, ChevronRight, List, Grid3X3, ArrowUpDown,
  ExternalLink, Copy, Hash, AlertTriangle, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Tag card component showing commit info
function TagCard({
  tag,
  onClick,
  expanded,
  onToggleExpand,
}: {
  tag: GitTag;
  onClick: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyHash = () => {
    navigator.clipboard.writeText(tag.commitHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColors = {
    active: "bg-green-100 text-green-700",
    archived: "bg-gray-100 text-gray-500",
    protected: "bg-amber-100 text-amber-700",
  };

  const buildStatusConfig: Record<string, { label: string; dot: string; bg: string }> = {
    success:  { label: "构建成功", dot: "bg-emerald-500", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    failed:   { label: "构建失败", dot: "bg-red-500",    bg: "bg-red-50 text-red-700 border-red-200" },
    building: { label: "构建中",   dot: "bg-blue-500 animate-pulse", bg: "bg-blue-50 text-blue-700 border-blue-200" },
    pending:  { label: "待构建",   dot: "bg-gray-400",  bg: "bg-gray-50 text-gray-600 border-gray-200" },
  };
  const build = tag.buildStatus ? buildStatusConfig[tag.buildStatus] : null;

  return (
    <div
      className="border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white"
      onClick={onClick}
    >
      {/* Header: tag name + status + build badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="w-5 h-5 text-blue-600 mt-0.5" />
          <span className="font-mono font-bold text-gray-900 text-xl">
            {tag.name}
          </span>
          <Badge className={`text-xs font-medium ${statusColors[tag.status]}`}>
            {tag.status === "active" ? "活跃" : tag.status === "archived" ? "已归档" : "保护中"}
          </Badge>
          {build && (
            <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded border font-medium ${build.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${build.dot}`} />
              {build.label}
            </span>
          )}
          {/* Screenshot & changelog indicators */}
          <div className="flex items-center gap-1">
            {tag.hasScreenshot && (
              <span title="已关联截图" className="text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200 font-medium">
                📎 截图
              </span>
            )}
            {tag.hasChangelog && (
              <span title="已有变更摘要" className="text-xs px-1.5 py-0.5 rounded bg-teal-50 text-teal-600 border border-teal-200 font-medium">
                📝 摘要
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>

      {/* Version */}
      <div className="mb-3">
        <span className="text-sm font-medium text-gray-700">
          版本：{tag.version}
        </span>
      </div>

      {/* Commit message */}
      <div className="mb-3 bg-gray-50 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <GitCommit className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-700 line-clamp-2">{tag.subject}</p>
        </div>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Hash className="w-3 h-3" />
          <span className="font-mono">{tag.commit}</span>
        </span>
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {tag.author}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {new Date(tag.taggerDate).toLocaleDateString("zh-CN")}
        </span>
      </div>

      {/* Expanded: more details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t space-y-3" onClick={(e) => e.stopPropagation()}>
          {/* Full commit hash */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <Hash className="w-3 h-3 text-gray-400" />
              <span className="text-xs font-mono text-gray-600">{tag.commitHash}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={copyHash}>
              {copied ? <span className="text-xs text-green-600">已复制</span> : <Copy className="w-3 h-3" />}
            </Button>
          </div>

          {/* Author email */}
          <div className="text-xs text-gray-500">
            <span className="font-medium">作者邮箱：</span>
            <span className="font-mono">{tag.authorEmail}</span>
          </div>

          {/* Project */}
          <div className="text-xs text-gray-500">
            <span className="font-medium">所属项目：</span>
            {tag.projectName}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Link
              href={`/versions?tag=${encodeURIComponent(tag.name)}`}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
              查看版本详情
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// Tag row for list view
function TagRow({
  tag,
  onClick,
}: {
  tag: GitTag;
  onClick: () => void;
}) {
  const statusColors = {
    active: "bg-green-500",
    archived: "bg-gray-400",
    protected: "bg-amber-500",
  };
  const buildDotConfig: Record<string, string> = {
    success: "bg-emerald-500",
    failed: "bg-red-500",
    building: "bg-blue-500 animate-pulse",
    pending: "bg-gray-400",
  };

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 border-b hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <Tag className="w-4 h-4 text-blue-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-medium text-gray-900">{tag.name}</span>
          <div className={`w-2 h-2 rounded-full ${statusColors[tag.status]}`} />
          <span className="text-sm text-gray-500">{tag.version}</span>
          {tag.buildStatus && (
            <span className={`w-2 h-2 rounded-full ${buildDotConfig[tag.buildStatus] || "bg-gray-400"}`} title={`构建: ${tag.buildStatus}`} />
          )}
          {tag.hasScreenshot && <span className="text-xs" title="有截图">📎</span>}
          {tag.hasChangelog && <span className="text-xs" title="有摘要">📝</span>}
        </div>
        <div className="text-sm text-gray-500 truncate mt-0.5">{tag.subject}</div>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
        <span className="font-mono">{tag.commit}</span>
        <span>{tag.author}</span>
        <span>{new Date(tag.taggerDate).toLocaleDateString("zh-CN")}</span>
      </div>
    </div>
  );
}

export default function VersionPanelPage() {
  const router = useRouter();
  const { data, isLoading, error, refetch, isRefetching } = useTags();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [statusFilter, setStatusFilter] = useState<"all" | GitTag["status"]>("all");
  const [metaFilter, setMetaFilter] = useState<"all" | "hasScreenshot" | "hasChangelog">("all");
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());

  const tags = useMemo(() => data?.data || [], [data]);

  // Keyboard shortcut: R = refresh
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "r" || e.key === "R") {
        refetch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [refetch]);

  // Filter and sort tags
  const filteredTags = useMemo(() => {
    const result = tags.filter((tag) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !tag.name.toLowerCase().includes(query) &&
          !tag.version.toLowerCase().includes(query) &&
          !tag.subject.toLowerCase().includes(query) &&
          !tag.author.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      // Status filter
      if (statusFilter !== "all" && tag.status !== statusFilter) {
        return false;
      }
      // Screenshot/changelog meta filter
      if (metaFilter === "hasScreenshot" && !tag.hasScreenshot) return false;
      if (metaFilter === "hasChangelog" && !tag.hasChangelog) return false;
      return true;
    });

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.taggerDate).getTime();
      const dateB = new Date(b.taggerDate).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [tags, searchQuery, sortOrder, statusFilter, metaFilter]);

  const toggleExpand = (name: string) => {
    const newExpanded = new Set(expandedTags);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedTags(newExpanded);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setMetaFilter("all");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || metaFilter !== "all";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Tag className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">版本面板</h1>
              <Badge variant="default">
                {filteredTags.length} 个标签
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {/* Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching}
                title="刷新列表 (R)"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isRefetching ? "animate-spin" : ""}`} />
                {isRefetching ? "刷新中..." : "刷新"}
              </Button>
              {/* View mode toggle */}
              <div className="flex border border-gray-300 dark:border-slate-500 rounded-md overflow-hidden">
                <button
                  className={`p-2 ${viewMode === "grid" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
                  onClick={() => setViewMode("grid")}
                  title="网格视图"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  className={`p-2 ${viewMode === "list" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
                  onClick={() => setViewMode("list")}
                  title="列表视图"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              {/* Sort */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
              >
                <ArrowUpDown className="w-4 h-4 mr-1" />
                {sortOrder === "newest" ? "最新优先" : "最早优先"}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索标签名、版本号、提交信息..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | GitTag["status"])}
              className="px-3 py-2 border border-gray-300 dark:border-slate-500 rounded-md text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="all">全部状态</option>
              <option value="active">活跃</option>
              <option value="archived">已归档</option>
              <option value="protected">保护中</option>
            </select>
            <select
              value={metaFilter}
              onChange={(e) => setMetaFilter(e.target.value as "all" | "hasScreenshot" | "hasChangelog")}
              className="px-3 py-2 border border-gray-300 dark:border-slate-500 rounded-md text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="all">全部标签</option>
              <option value="hasScreenshot">📎 有截图</option>
              <option value="hasChangelog">📝 有摘要</option>
            </select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                清除筛选
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-gray-500">加载中...</p>
          </div>
        ) : error ? (
          <Card className="bg-red-50 border-red-200 p-8 flex flex-col items-center gap-4">
            <AlertTriangle className="w-10 h-10 text-red-500" />
            <div className="text-red-700 font-medium">加载失败</div>
            <div className="text-sm text-red-600">{String(error)}</div>
            <Button onClick={() => refetch()} size="sm">重试</Button>
          </Card>
        ) : filteredTags.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              icon={Tag}
              title="没有匹配的标签"
              description="尝试调整筛选条件，或清除筛选查看所有标签"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  清除筛选
                </Button>
              }
            />
          ) : (
            <EmptyState icon={Tag} title="暂无标签" description="发布版本后自动创建" />
          )
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTags.map((tag) => (
              <TagCard
                key={tag.name}
                tag={tag}
                onClick={() => router.push(`/versions?tag=${encodeURIComponent(tag.name)}`)}
                expanded={expandedTags.has(tag.name)}
                onToggleExpand={() => toggleExpand(tag.name)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 border-b text-sm font-medium text-gray-500">
              <Tag className="w-4 h-4" />
              <div className="flex-1">标签 / 版本 / 提交信息</div>
              <div className="w-24 text-right">Hash</div>
              <div className="w-20">作者</div>
              <div className="w-24 text-right">日期</div>
            </div>
            {filteredTags.map((tag) => (
              <TagRow
                key={tag.name}
                tag={tag}
                onClick={() => router.push(`/versions?tag=${encodeURIComponent(tag.name)}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="text-sm text-gray-400 text-center">
          显示 {filteredTags.length} / {tags.length} 个标签
        </div>
      </div>
    </div>
  );
}
