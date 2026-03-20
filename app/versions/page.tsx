"use client";

import { useState, useEffect } from "react";
import { Version, BUILD_STATUS_LABELS, BUILD_STATUS_BADGE_VARIANT, VERSION_STATUS_OPTIONS } from "@/lib/api/types";
import { getVersions } from "@/lib/api/versions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Search, Tag, Star, Loader2, ChevronLeft, ChevronRight, LayoutGrid, List, AlertTriangle, RefreshCw, Package } from "lucide-react";
import Link from "next/link";

export default function VersionsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<{ data: Version[]; total: number; totalPages: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "compact">("card");
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    getVersions(page, pageSize, statusFilter)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => setIsLoading(false));
  }, [page, statusFilter, pageSize]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1); // reset to first page when changing page size
  };

  const versions = data?.data || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  const filtered = search
    ? versions.filter(
        (v) =>
          v.version.toLowerCase().includes(search.toLowerCase()) ||
          v.title.toLowerCase().includes(search.toLowerCase()) ||
          v.description?.toLowerCase().includes(search.toLowerCase())
      )
    : versions;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-header-title">版本管理</h1>
        <Link href="/versions/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            创建版本
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="page-section mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索版本号、标题..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {VERSION_STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={statusFilter === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">每页</span>
          <select
            className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-muted-foreground">条</span>
        </div>

        {/* View mode toggle */}
        <div className="flex gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === "card" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("card")}
            title="卡片视图"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "compact" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("compact")}
            title="紧凑视图"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 mb-6">
          <CardContent className="py-6 flex flex-col items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div className="text-center">
              <p className="font-medium text-red-700 dark:text-red-400">加载失败</p>
              <p className="text-sm text-red-600 dark:text-red-500 mt-1">{error.message}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setError(null); setIsLoading(true); getVersions(page, pageSize, statusFilter).then(setData).catch((err) => setError(err instanceof Error ? err : new Error(String(err)))).finally(() => setIsLoading(false)); }}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              重试
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="page-loading py-20">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>加载中...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="暂无版本记录"
          description="创建第一个版本开始管理"
          action={
            <Link href="/versions/new">
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                创建版本
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          {viewMode === "card" ? (
          /* Card grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {filtered.map((v) => (
              <Link key={v.id} href={`/versions/${v.id}`} className="block">
                <div className="page-section hover:shadow-md transition-shadow cursor-pointer h-full">
                  <div className="p-5">
                    {/* Top row: version + status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold font-mono text-foreground">{v.version}</span>
                        {v.isMain && (
                          <Badge variant="success" className="text-xs gap-1">
                            <Star className="w-3 h-3" />主版本
                          </Badge>
                        )}
                      </div>
                      <Badge
                        variant={BUILD_STATUS_BADGE_VARIANT[v.buildStatus]}
                        className={`text-xs ${v.buildStatus === "pending" ? "bg-muted text-muted-foreground border-border" : ""}`}
                      >
                        {BUILD_STATUS_LABELS[v.buildStatus]}
                      </Badge>
                    </div>

                    {/* Title & description */}
                    <div className="mb-3">
                      <div className="font-medium text-foreground mb-1">{v.title}</div>
                      {v.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{v.description}</p>
                      )}
                    </div>

                    {/* Tags row */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {v.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-secondary text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Git tag */}
                    {v.gitTag && (
                      <div className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 mb-3">
                        <Tag className="w-3.5 h-3.5" />
                        <span className="font-mono">{v.gitTag}</span>
                      </div>
                    )}

                    {/* Version summary preview */}
                    {v.summary && (
                      <div className="mt-2 p-2 bg-muted/50 rounded-md">
                        <div className="text-xs text-muted-foreground mb-1">摘要 · {v.summaryGeneratedAt ? new Date(v.summaryGeneratedAt).toLocaleDateString("zh-CN") : "自动生成"}</div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{v.summary}</p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                      <span>{v.commitCount} 次提交</span>
                      <span>{v.changedFiles.length} 个文件</span>
                      <span>{v.createdAt ? new Date(v.createdAt).toLocaleDateString("zh-CN") : "-"}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          ) : (
          /* Compact table view */
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-slate-700">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">版本</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">标题</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">构建状态</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">提交</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">文件</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id} className="border-b dark:border-slate-800 hover:bg-muted/50">
                    <td className="py-2 px-3">
                      <Link href={`/versions/${v.id}`} className="flex items-center gap-2 hover:underline">
                        <span className="font-mono font-bold">{v.version}</span>
                        {v.isMain && <Badge variant="success" className="text-xs gap-1"><Star className="w-3 h-3" /></Badge>}
                      </Link>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium">{v.title}</span>
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant={BUILD_STATUS_BADGE_VARIANT[v.buildStatus]} className={`text-xs ${v.buildStatus === "pending" ? "bg-muted text-muted-foreground border-border" : ""}`}>
                        {BUILD_STATUS_LABELS[v.buildStatus]}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{v.commitCount}</td>
                    <td className="py-2 px-3 text-muted-foreground">{v.changedFiles.length}</td>
                    <td className="py-2 px-3 text-muted-foreground">{v.createdAt ? new Date(v.createdAt).toLocaleDateString("zh-CN") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 px-4 py-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">共 {total} 条，第 {page}/{totalPages} 页</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                  上一页
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  下一页
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
