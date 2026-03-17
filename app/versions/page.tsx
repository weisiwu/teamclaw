"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useVersions,
  useCreateVersion,
  useUpdateVersion,
  useDeleteVersion,
  useCreateBranch,
  useSetMainVersion,
  useTriggerBuild,
  useRebuildVersion,
  useDownloadArtifact,
} from "@/lib/api/versions";
import {
  Version,
  VERSION_STATUS_LABELS,
  VERSION_STATUS_BADGE_VARIANT,
  VERSION_STATUS_OPTIONS,
  BUILD_STATUS_LABELS,
  BUILD_STATUS_BADGE_VARIANT,
  CreateVersionRequest,
  UpdateVersionRequest,
  VersionStatus,
  VERSION_TAG_OPTIONS,
  VersionTag,
} from "@/lib/api/types";
import { Pencil, Trash2, Plus, Loader2, Search, X, GitBranch, Star, Play, Download, Calendar, Clock, FileText } from "lucide-react";

export default function VersionsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<Version | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  const pageSize = 10;

  const { data, isLoading, error } = useVersions(page, pageSize, statusFilter);
  const createVersion = useCreateVersion();
  const updateVersion = useUpdateVersion();
  const deleteVersion = useDeleteVersion();
  const createBranch = useCreateBranch();
  const setMainVersion = useSetMainVersion();
  const triggerBuild = useTriggerBuild();
  const rebuildVersion = useRebuildVersion();
  const downloadArtifact = useDownloadArtifact();

  const versions = data?.data || [];
  // 前端标签筛选
  const filteredVersions = tagFilter === "all" 
    ? versions 
    : versions.filter((v) => v.tags.includes(tagFilter as VersionTag));
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

  const handleCreateBranch = async (version: Version) => {
    try {
      const branchName = `v${version.version.replace(/\./g, '-')}-branch`;
      await createBranch.mutateAsync({ versionId: version.id, branchName });
      setActionMessage({ type: 'success', text: `分支创建成功: feature/${branchName}` });
    } catch {
      setActionMessage({ type: 'error', text: '创建分支失败' });
    }
  };

  const handleSetMain = async (version: Version) => {
    try {
      await setMainVersion.mutateAsync(version.id);
      setActionMessage({ type: 'success', text: `已将 ${version.version} 设为主版本` });
    } catch {
      setActionMessage({ type: 'error', text: '设置主版本失败' });
    }
  };

  const handleBuild = async (version: Version) => {
    try {
      await triggerBuild.mutateAsync(version.id);
      setActionMessage({ type: 'success', text: `已触发 ${version.version} 构建` });
    } catch {
      setActionMessage({ type: 'error', text: '触发构建失败' });
    }
  };

  const handleRebuild = async (version: Version) => {
    try {
      await rebuildVersion.mutateAsync(version.id);
      setActionMessage({ type: 'success', text: `已重新构建 ${version.version}` });
    } catch {
      setActionMessage({ type: 'error', text: '重新构建失败' });
    }
  };

  const handleDownload = async (version: Version) => {
    try {
      const result = await downloadArtifact.mutateAsync(version.id);
      if (result.success && result.url) {
        window.open(result.url, '_blank');
        setActionMessage({ type: 'success', text: '开始下载产物' });
      } else {
        setActionMessage({ type: 'error', text: '下载链接不存在' });
      }
    } catch {
      setActionMessage({ type: 'error', text: '下载失败' });
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
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">状态:</span>
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
          <div className="flex items-center gap-2 ml-6">
            <span className="text-sm text-gray-600">标签:</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={tagFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setTagFilter("all");
                setPage(1);
              }}
            >
              全部
            </Button>
            {VERSION_TAG_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={tagFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setTagFilter(option.value);
                  setPage(1);
                }}
                className={tagFilter === option.value ? "" : `${option.color.replace('bg-', 'border-').replace(' text-', ' border-')}`}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* 操作消息提示 */}
      {actionMessage && (
        <div className={`mb-4 p-3 rounded-lg ${actionMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {actionMessage.text}
          <button onClick={() => setActionMessage(null)} className="ml-2 underline">
            关闭
          </button>
        </div>
      )}

      {/* 版本列表 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">加载中...</span>
          </div>
        ) : filteredVersions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">暂无版本记录</div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">版本</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">标题</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">标签</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">状态</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">构建</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">发布时间</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">变更文件</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">提交数</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredVersions.map((version) => (
                  <tr 
                    key={version.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedVersion(version)}
                  >
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
                      <div className="flex flex-wrap gap-1">
                        {version.tags.map((tag) => {
                          const tagOption = VERSION_TAG_OPTIONS.find((t) => t.value === tag);
                          return (
                            <span
                              key={tag}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${tagOption?.color || 'bg-gray-100 text-gray-800'}`}
                            >
                              {tag}
                            </span>
                          );
                        })}
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
                      <Badge variant={BUILD_STATUS_BADGE_VARIANT[version.buildStatus]}>
                        {BUILD_STATUS_LABELS[version.buildStatus]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {version.isMain && (
                          <Badge variant="success" className="mr-1">
                            <Star className="w-3 h-3 mr-1" />主版本
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(version)}
                          disabled={updateVersion.isPending}
                          title="编辑"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCreateBranch(version)}
                          disabled={createBranch.isPending}
                          title="创建分支"
                        >
                          <GitBranch className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetMain(version)}
                          disabled={version.isMain || setMainVersion.isPending}
                          title="设为主版本"
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBuild(version)}
                          disabled={version.buildStatus === 'building' || triggerBuild.isPending}
                          title="构建"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRebuild(version)}
                          disabled={rebuildVersion.isPending}
                          title="重新构建"
                        >
                          <Loader2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(version)}
                          disabled={!version.artifactUrl || downloadArtifact.isPending}
                          title="下载产物"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmId(version.id)}
                          disabled={deleteVersion.isPending}
                          className="text-red-600 hover:text-red-700"
                          title="删除"
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

      {/* 版本详情弹窗 */}
      {selectedVersion && (
        <VersionDetailDialog
          version={selectedVersion}
          onClose={() => setSelectedVersion(null)}
        />
      )}
    </div>
  );
}

// 版本详情弹窗组件
function VersionDetailDialog({ 
  version, 
  onClose 
}: { 
  version: Version; 
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold">版本详情</h3>
            <Badge variant={VERSION_STATUS_BADGE_VARIANT[version.status]}>
              {VERSION_STATUS_LABELS[version.status]}
            </Badge>
            {version.isMain && (
              <Badge variant="success">
                <Star className="w-3 h-3 mr-1" />主版本
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* 基本信息 */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-3">基本信息</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">版本号</span>
                <span className="font-mono font-medium text-gray-900">{version.version}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">标题</span>
                <span className="font-medium text-gray-900">{version.title}</span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-gray-600">描述</span>
                <span className="text-gray-900 text-right max-w-[60%]">{version.description || '-'}</span>
              </div>
            </div>
          </div>

          {/* 标签 */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-3">标签</h4>
            <div className="flex flex-wrap gap-2">
              {version.tags.length > 0 ? version.tags.map((tag) => {
                const tagOption = VERSION_TAG_OPTIONS.find((t) => t.value === tag);
                return (
                  <span
                    key={tag}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${tagOption?.color || 'bg-gray-100 text-gray-800'}`}
                  >
                    {tagOption?.label || tag}
                  </span>
                );
              }) : <span className="text-gray-400">无标签</span>}
            </div>
          </div>

          {/* 构建信息 */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-3">构建信息</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">构建状态</span>
                <Badge variant={BUILD_STATUS_BADGE_VARIANT[version.buildStatus]}>
                  {BUILD_STATUS_LABELS[version.buildStatus]}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">产物URL</span>
                <span className="text-gray-900 truncate max-w-[60%]">
                  {version.artifactUrl || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* 时间线 */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-3">时间线</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 w-20">创建时间</span>
                <span className="text-gray-900">
                  {version.createdAt ? new Date(version.createdAt).toLocaleString('zh-CN') : '-'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 w-20">发布时间</span>
                <span className="text-gray-900">
                  {version.releasedAt ? new Date(version.releasedAt).toLocaleString('zh-CN') : '-'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 w-20">变更文件</span>
                <span className="text-gray-900">{version.changedFiles.length} 个文件</span>
              </div>
              <div className="flex items-center gap-3">
                <GitBranch className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 w-20">提交数</span>
                <span className="text-gray-900">{version.commitCount} 次提交</span>
              </div>
            </div>
          </div>

          {/* 变更文件列表 */}
          {version.changedFiles.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-3">变更文件</h4>
              <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                <ul className="space-y-1">
                  {version.changedFiles.map((file, index) => (
                    <li key={index} className="text-sm text-gray-600 font-mono truncate">
                      {file}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
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
    tags: version?.tags || [],
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">标签</label>
            <div className="flex flex-wrap gap-2">
              {VERSION_TAG_OPTIONS.map((option) => {
                const isSelected = formData.tags?.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      const currentTags = formData.tags || [];
                      const newTags = isSelected
                        ? currentTags.filter((t) => t !== option.value)
                        : [...currentTags, option.value];
                      setFormData({ ...formData, tags: newTags });
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isSelected
                        ? option.color
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
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
