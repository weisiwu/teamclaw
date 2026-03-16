"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useVersions,
  useCreateVersion,
  useUpdateVersion,
  useDeleteVersion,
} from "@/lib/api/versions";
import {
  Version,
  VERSION_STATUS_LABELS,
  VERSION_STATUS_BADGE_VARIANT,
  VERSION_STATUS_OPTIONS,
  CreateVersionRequest,
  UpdateVersionRequest,
  VersionStatus,
} from "@/lib/api/types";
import { Pencil, Trash2, Plus, Loader2, Search, X } from "lucide-react";

export default function VersionsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<Version | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const pageSize = 10;

  const { data, isLoading, error } = useVersions(page, pageSize, statusFilter);
  const createVersion = useCreateVersion();
  const updateVersion = useUpdateVersion();
  const deleteVersion = useDeleteVersion();

  const versions = data?.data || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  const handleAdd = () => {
    setEditingVersion(null);
    setIsFormOpen(true);
  };

  const handleEdit = (version: Version) => {
    setEditingVersion(version);
    setIsFormOpen(true);
  };

  const handleSubmit = async (formData: CreateVersionRequest | UpdateVersionRequest) => {
    try {
      if (editingVersion) {
        await updateVersion.mutateAsync({
          id: editingVersion.id,
          request: formData as UpdateVersionRequest,
        });
      } else {
        await createVersion.mutateAsync(formData as CreateVersionRequest);
      }
      setIsFormOpen(false);
      setEditingVersion(null);
    } catch (err) {
      console.error("Failed to save version:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVersion.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to delete version:", err);
    }
  };

  const getStatusBadgeVariant = (status: VersionStatus) => {
    return VERSION_STATUS_BADGE_VARIANT[status] || "default";
  };

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">版本管理</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
          加载数据失败，请刷新页面重试
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">版本管理</h1>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          新建版本
        </Button>
      </div>

      {/* 筛选器 */}
      <div className="bg-white rounded-xl border p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">状态筛选:</span>
          </div>
          <div className="flex gap-2">
            {VERSION_STATUS_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={statusFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setStatusFilter(option.value);
                  setPage(1);
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* 版本列表 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">加载中...</span>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">暂无版本记录</div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">版本</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">标题</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">状态</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">发布时间</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">变更文件</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">提交数</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {versions.map((version) => (
                  <tr key={version.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium text-gray-900">{version.version}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[200px]">
                        <div className="font-medium text-gray-900 truncate">{version.title}</div>
                        <div className="text-sm text-gray-500 truncate">{version.description}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusBadgeVariant(version.status)}>
                        {VERSION_STATUS_LABELS[version.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {version.releasedAt
                        ? new Date(version.releasedAt).toLocaleDateString("zh-CN")
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {version.changedFiles.length} 个文件
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {version.commitCount} 次提交
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(version)}
                          disabled={updateVersion.isPending}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmId(version.id)}
                          disabled={deleteVersion.isPending}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <div className="text-sm text-gray-500">
                  共 {total} 条记录，第 {page}/{totalPages} 页
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 创建/编辑表单弹窗 */}
      {isFormOpen && (
        <VersionForm
          version={editingVersion}
          onSubmit={handleSubmit}
          onClose={() => {
            setIsFormOpen(false);
            setEditingVersion(null);
          }}
          isPending={createVersion.isPending || updateVersion.isPending}
        />
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">确认删除</h3>
            <p className="text-gray-600 mb-6">确定要删除这个版本吗？此操作无法撤销。</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleteVersion.isPending}
              >
                {deleteVersion.isPending ? (
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

// 版本表单组件
interface VersionFormProps {
  version: Version | null;
  onSubmit: (data: CreateVersionRequest | UpdateVersionRequest) => void;
  onClose: () => void;
  isPending: boolean;
}

function VersionForm({ version, onSubmit, onClose, isPending }: VersionFormProps) {
  const [formData, setFormData] = useState<CreateVersionRequest>({
    version: version?.version || "",
    title: version?.title || "",
    description: version?.description || "",
    status: version?.status || "draft",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">{version ? "编辑版本" : "新建版本"}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              版本号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              placeholder="如: v1.0.0"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="版本标题"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="版本描述"
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as VersionStatus })
              }
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
              <option value="archived">已归档</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
