"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Search, Tag, Lock, Trash2, Loader2, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import Link from "next/link";

const API_BASE = "/api/v1";
import { apiGet, apiDelete, getFriendlyErrorMessage } from "@/lib/api-safe-fetch";

interface TagRecord {
  id: string;
  name: string;
  versionId?: string;
  versionName?: string;
  commitHash?: string;
  message?: string;
  annotation?: string;
  createdAt: string;
  protected?: boolean;
  archived?: boolean;
  createdBy?: string;
}

function isProtectedTag(name: string): boolean {
  return /^v\d+\.0\.0$/.test(name);
}

export default function TagsPage() {
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(""); // raw input (uncontrolled during typing)
  const [debouncedSearch, setDebouncedSearch] = useState(""); // actual filter applied after debounce
  const [prefix, setPrefix] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pageSize = 20;

  const fetchTags = async (p: number, pref: string) => {
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
    if (pref) params.set("prefix", pref);
    const result = await apiGet<{ data: TagRecord[]; totalPages: number }>(`${API_BASE}/tags?${params}`);
    if (result.success && result.data) {
      setTags(result.data.data || []);
      setTotalPages(result.data.totalPages || 1);
    }
    setIsLoading(false);
  };

  // Debounce search input to avoid excessive re-renders
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  useEffect(() => {
    fetchTags(page, prefix);
  }, [page, prefix]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    setDeleteError(null);
    const result = await apiDelete(`${API_BASE}/tags/${deleteId}`);
    if (result.success) {
      setTags((prev) => prev.filter((t) => t.id !== deleteId));
      setDeleteId(null);
    } else {
      setDeleteError(result.error ? getFriendlyErrorMessage(result.error) : "删除失败");
    }
    setIsDeleting(false);
  };

  const filtered = debouncedSearch
    ? tags.filter((t) => t.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
    : tags;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tag 管理</h1>
        <Link href="/tags/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            创建 Tag
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索 Tag 名称..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">前缀:</span>
          <Input
            placeholder="如 v"
            value={prefix}
            onChange={(e) => { setPrefix(e.target.value); setPage(1); }}
            className="w-24 font-mono"
          />
        </div>
        {(debouncedSearch || prefix) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearchInput(""); setDebouncedSearch(""); setPrefix(""); setPage(1); }}
          >
            清除筛选
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">加载中...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="暂无 Tag 记录"
          description="创建第一个 Tag 开始管理版本标签"
          action={
            <Link href="/tags/new">
              <Button>创建 Tag</Button>
            </Link>
          }
          className="bg-white rounded-xl border"
        />
      ) : (
        <>
          <div className="bg-white rounded-xl border overflow-hidden mb-6">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Tag 名称</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">版本</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Commit</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">创建时间</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">创建者</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((tag) => {
                  const protected_ = isProtectedTag(tag.name) || tag.protected;
                  return (
                    <tr key={tag.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/tags/${encodeURIComponent(tag.name)}`} className="flex items-center gap-2 hover:underline">
                          {protected_ && <Lock className="w-4 h-4 text-amber-500" />}
                          <Tag className="w-4 h-4 text-blue-500" />
                          <span className="font-mono font-medium text-gray-900">{tag.name}</span>
                          {protected_ && (
                            <Badge variant="warning" className="text-xs">🔒 受保护</Badge>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {tag.versionName || tag.versionId || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-500">
                        {tag.commitHash ? tag.commitHash.slice(0, 7) : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {tag.createdAt ? new Date(tag.createdAt).toLocaleString("zh-CN") : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {tag.createdBy || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          disabled={protected_ || isDeleting}
                          onClick={() => setDeleteId(tag.id)}
                          title={protected_ ? "受保护 Tag 无法删除" : "删除"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl border px-4 py-3">
              <span className="text-sm text-gray-500">第 {page}/{totalPages} 页</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="w-4 h-4" />上一页
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  下一页<ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirm dialog */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold">确认删除</h3>
            </div>
            <p className="text-gray-600 mb-6">
              确定要删除这个 Tag 吗？此操作无法撤销。
            </p>
            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {deleteError}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setDeleteId(null); setDeleteError(null); }}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    删除中...
                  </>
                ) : (
                  "删除"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
