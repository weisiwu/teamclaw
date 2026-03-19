"use client";

import { useState, useEffect } from "react";
import { Version, BUILD_STATUS_LABELS, BUILD_STATUS_BADGE_VARIANT, VERSION_STATUS_OPTIONS } from "@/lib/api/types";
import { getVersions } from "@/lib/api/versions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Tag, Star, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function VersionsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<{ data: Version[]; total: number; totalPages: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const pageSize = 20;

  useEffect(() => {
    setIsLoading(true);
    getVersions(page, pageSize, statusFilter)
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page, statusFilter]);

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

  // buildStatusColor function removed - using Badge variants instead

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">版本管理</h1>
        <Link href="/versions/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            创建版本
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">加载中...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p>暂无版本记录</p>
          <Link href="/versions/new">
            <Button variant="ghost" className="mt-2">创建第一个版本</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Card grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {filtered.map((v) => (
              <Link key={v.id} href={`/versions/${v.id}`} className="block">
                <div className="bg-white rounded-xl border hover:shadow-md transition-shadow cursor-pointer h-full">
                  <div className="p-5">
                    {/* Top row: version + status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold font-mono text-gray-900">{v.version}</span>
                        {v.isMain && (
                          <Badge variant="success" className="text-xs gap-1">
                            <Star className="w-3 h-3" />主版本
                          </Badge>
                        )}
                      </div>
                      <Badge
                        variant={BUILD_STATUS_BADGE_VARIANT[v.buildStatus]}
                        className={`text-xs ${v.buildStatus === "pending" ? "bg-gray-100 text-gray-500 border-gray-200" : ""}`}
                      >
                        {BUILD_STATUS_LABELS[v.buildStatus]}
                      </Badge>
                    </div>

                    {/* Title & description */}
                    <div className="mb-3">
                      <div className="font-medium text-gray-900 mb-1">{v.title}</div>
                      {v.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">{v.description}</p>
                      )}
                    </div>

                    {/* Tags row */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {v.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Git tag */}
                    {v.gitTag && (
                      <div className="flex items-center gap-1 text-sm text-blue-600 mb-3">
                        <Tag className="w-3.5 h-3.5" />
                        <span className="font-mono">{v.gitTag}</span>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t">
                      <span>{v.commitCount} 次提交</span>
                      <span>{v.changedFiles.length} 个文件</span>
                      <span>{v.createdAt ? new Date(v.createdAt).toLocaleDateString("zh-CN") : "-"}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl border px-4 py-3">
              <span className="text-sm text-gray-500">共 {total} 条，第 {page}/{totalPages} 页</span>
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
