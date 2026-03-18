"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  useVersions,
  useCreateVersion,
  useUpdateVersion,
  useDeleteVersion,
  useCreateBranchForVersion,
  useSetMainVersion,
  useTriggerBuild,
  useRebuildVersion,
  useDownloadArtifact,
  useDownloadHistory,
  useAddDownloadRecord,
  useCreateGitTag,
  useVersionSnapshots,
  useCreateSnapshot,
  useRestoreSnapshot,
  useBranches,
  useCreateBranch,
  useDeleteBranch,
  useSetMainBranch,
  useVersionScreenshots,
  useLinkScreenshot,
  useUnlinkScreenshot,
  useVersionChangelog,
  useGenerateChangelog,
  storeVersionVector,
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
  CreateSnapshotRequest,
  DOWNLOAD_FORMAT_OPTIONS,
} from "@/lib/api/types";
import { Pencil, Trash2, Plus, Loader2, Search, X, GitBranch as GitBranchIcon, GitMerge, Star, Play, Download, Calendar, Clock, FileText, GitCompare, Tag, Image, FileCode, History, FolderOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MessageSelector, MessageItem, ScreenshotGallery, ChangelogPanel, BuildLogViewer, getBuildHistory, addBuildLog, clearBuildHistory, SnapshotCompareDialog, VersionTimeline, SimilarVersionsPanel, TagLifecyclePanel, BatchTagOperations, TagGroupManager, useTagGroups, useFavoriteTags } from "@/components/versions";
import { BranchCompareDialog, BranchMergeDialog } from "@/components/branch";

export default function VersionsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<Version | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [compareVersions, setCompareVersions] = useState<[string, string] | null>(null);
  const [isTagPanelOpen, setIsTagPanelOpen] = useState(false);
  // Tag 收藏和分组状态
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavoriteTags();
  const { groups: tagGroups, updateGroups } = useTagGroups();
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloadFormat, setDownloadFormat] = useState<Record<string, string>>({});
  const [downloadRetryCount, setDownloadRetryCount] = useState<Record<string, number>>({});
  
  // 下载历史（云同步）
  const { data: downloadHistoryData } = useDownloadHistory();
  const addDownloadRecord = useAddDownloadRecord();
  
  // 本地下载历史（用于显示）
  const [localDownloadHistory, setLocalDownloadHistory] = useState<Array<{versionId: string; version: string; format: string; time: string; url: string}>>([]);
  
  // 合并下载历史（云端 + 本地）
  const downloadHistory = downloadHistoryData?.length 
    ? downloadHistoryData.map(d => ({
        versionId: d.versionId,
        version: d.version,
        format: d.format,
        time: d.downloadedAt,
        url: d.url,
      }))
    : localDownloadHistory;
  
  // 分支管理状态
  const [isBranchPanelOpen, setIsBranchPanelOpen] = useState(false);
  const [isCreateBranchOpen, setIsCreateBranchOpen] = useState(false);
  
  // Tag 生命周期管理状态
  const [isTagLifecycleOpen, setIsTagLifecycleOpen] = useState(false);
  const [isBatchTagOpen, setIsBatchTagOpen] = useState(false);
  const [deleteBranchConfirmId, setDeleteBranchConfirmId] = useState<string | null>(null);
  const [newBranchForm, setNewBranchForm] = useState({
    name: '',
    baseBranch: '',
    versionId: '',
  });
  
  // 分支对比/合并对话框状态
  const [isBranchCompareOpen, setIsBranchCompareOpen] = useState(false);
  const [isBranchMergeOpen, setIsBranchMergeOpen] = useState(false);

  // 消息截图相关状态
  const [isMessageSelectorOpen, setIsMessageSelectorOpen] = useState(false);
  const [screenshotVersionId, setScreenshotVersionId] = useState<string | null>(null);

  // 构建历史相关状态
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [buildHistory, setBuildHistory] = useState<Array<{id: string; versionName: string; buildId: string; startTime: Date; endTime?: Date; status: 'success' | 'failed' | 'building'; logs: string[]}>>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeBuildId, setActiveBuildId] = useState<string | null>(null);
  const [isBuildLogViewerOpen, setIsBuildLogViewerOpen] = useState(false);

  // 加载构建历史
  useEffect(() => {
    setBuildHistory(getBuildHistory());
  }, []);

  // Load download history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('downloadHistory');
    if (saved) {
      try {
        setLocalDownloadHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse download history:', e);
      }
    }
  }, []);

  // Save download history to localStorage and cloud
  const saveDownloadHistory = (entry: {versionId: string; version: string; format: string; time: string; url: string}) => {
    // Save to local
    const newHistory = [entry, ...localDownloadHistory].slice(0, 20);
    setLocalDownloadHistory(newHistory);
    localStorage.setItem('downloadHistory', JSON.stringify(newHistory));
    
    // Cloud sync (async)
    addDownloadRecord.mutate({
      versionId: entry.versionId,
      version: entry.version,
      format: entry.format,
      url: entry.url,
    });
  };

  const pageSize = 10;

  const { data, isLoading, error } = useVersions(page, pageSize, statusFilter);
  const createVersion = useCreateVersion();
  const updateVersion = useUpdateVersion();
  const deleteVersion = useDeleteVersion();
  const createBranchForVersion = useCreateBranchForVersion();
  const setMainVersion = useSetMainVersion();
  const triggerBuild = useTriggerBuild();
  const rebuildVersion = useRebuildVersion();
  const downloadArtifact = useDownloadArtifact();
  const createGitTag = useCreateGitTag();
  const versionSnapshots = useVersionSnapshots(selectedVersion?.id || "");
  const createSnapshot = useCreateSnapshot();
  const restoreSnapshot = useRestoreSnapshot();
  
  // 分支管理 hooks
  const { data: branchesData, isLoading: isLoadingBranches } = useBranches();
  const createBranch = useCreateBranch();
  const deleteBranch = useDeleteBranch();
  const setMainBranch = useSetMainBranch();

  // 截图和变更摘要 hooks
  const versionScreenshots = useVersionScreenshots(selectedVersion?.id || "");
  const linkScreenshot = useLinkScreenshot();
  const unlinkScreenshot = useUnlinkScreenshot();
  const versionChangelog = useVersionChangelog(selectedVersion?.id || "");
  const generateChangelog = useGenerateChangelog();

  const branches = branchesData?.data || [];

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
        const updated = await updateVersion.mutateAsync({
          id: editingVersion.id,
          request: formData as UpdateVersionRequest,
        });
        // 更新版本向量
        if (updated) storeVersionVector(updated);
      } else {
        const created = await createVersion.mutateAsync(formData as CreateVersionRequest);
        // 存储版本向量
        if (created) storeVersionVector(created);
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
      await createBranchForVersion.mutateAsync({ versionId: version.id, branchName });
      setActionMessage({ type: 'success', text: `分支创建成功: feature/${branchName}` });
    } catch {
      setActionMessage({ type: 'error', text: '创建分支失败' });
    }
  };

  // 分支管理处理函数
  const handleCreateNewBranch = async () => {
    if (!newBranchForm.name.trim()) {
      setActionMessage({ type: 'error', text: '请输入分支名称' });
      return;
    }
    try {
      await createBranch.mutateAsync({
        name: newBranchForm.name,
        baseBranch: newBranchForm.baseBranch || undefined,
        versionId: newBranchForm.versionId || undefined,
      });
      setIsCreateBranchOpen(false);
      setNewBranchForm({ name: '', baseBranch: '', versionId: '' });
      setActionMessage({ type: 'success', text: `分支创建成功: ${newBranchForm.name}` });
    } catch {
      setActionMessage({ type: 'error', text: '创建分支失败' });
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    try {
      await deleteBranch.mutateAsync(branchId);
      setDeleteBranchConfirmId(null);
      setActionMessage({ type: 'success', text: '分支删除成功' });
    } catch {
      setActionMessage({ type: 'error', text: '删除分支失败' });
    }
  };

  const handleSetAsMainBranch = async (branchId: string) => {
    try {
      await setMainBranch.mutateAsync(branchId);
      setActionMessage({ type: 'success', text: '已设为主分支' });
    } catch {
      setActionMessage({ type: 'error', text: '设置主分支失败' });
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
      // 添加构建历史记录
      const buildLog = addBuildLog({
        versionName: version.version,
        buildId: `build-${Date.now()}`,
        startTime: new Date(),
        status: 'building',
        logs: [`[${new Date().toLocaleTimeString()}] 开始构建版本 ${version.version}...`],
      });
      setActiveBuildId(buildLog.id);
      setBuildHistory(getBuildHistory());
      
      await triggerBuild.mutateAsync(version.id);
      setActionMessage({ type: 'success', text: `已触发 ${version.version} 构建` });
    } catch {
      setActionMessage({ type: 'error', text: '触发构建失败' });
    }
  };

  const handleRebuild = async (version: Version) => {
    try {
      // 添加构建历史记录
      const buildLog = addBuildLog({
        versionName: version.version,
        buildId: `rebuild-${Date.now()}`,
        startTime: new Date(),
        status: 'building',
        logs: [`[${new Date().toLocaleTimeString()}] 开始重新构建版本 ${version.version}...`],
      });
      setActiveBuildId(buildLog.id);
      setBuildHistory(getBuildHistory());
      
      await rebuildVersion.mutateAsync(version.id);
      setActionMessage({ type: 'success', text: `已重新构建 ${version.version}` });
    } catch {
      setActionMessage({ type: 'error', text: '重新构建失败' });
    }
  };

  // 下载重试函数
  const downloadWithRetry = async (
    versionId: string, 
    format: string, 
    retries: number = 3
  ): Promise<{ success: boolean; url: string }> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await downloadArtifact.mutateAsync({ versionId, format });
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.log(`Download attempt ${attempt} failed, retrying...`);
        if (attempt === retries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 指数退避
      }
    }
    return { success: false, url: '' };
  };

  const handleDownload = async (version: Version) => {
    const format = downloadFormat[version.id] || 'zip';
    const maxRetries = 3;
    let currentRetry = downloadRetryCount[version.id] || 0;
    
    try {
      // Start progress simulation
      setDownloadProgress(prev => ({ ...prev, [version.id]: 10 }));
      
      const result = await downloadWithRetry(version.id, format, maxRetries);
      
      // Simulate progress
      setDownloadProgress(prev => ({ ...prev, [version.id]: 50 }));
      
      if (result.success && result.url) {
        // Save to history with format
        saveDownloadHistory({
          versionId: version.id,
          version: version.version,
          format,
          time: new Date().toLocaleString('zh-CN'),
          url: result.url
        });
        
        setDownloadProgress(prev => ({ ...prev, [version.id]: 100 }));
        
        // Open download URL
        window.open(result.url, '_blank');
        setActionMessage({ type: 'success', text: `开始下载 (${format})` });
        
        // Clear progress and retry count after a short delay
        setTimeout(() => {
          setDownloadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[version.id];
            return newProgress;
          });
          setDownloadRetryCount(prev => {
            const newRetry = { ...prev };
            delete newRetry[version.id];
            return newRetry;
          });
        }, 1000);
      } else {
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[version.id];
          return newProgress;
        });
        setActionMessage({ type: 'error', text: '下载链接不存在' });
      }
    } catch {
      // Handle retry
      currentRetry++;
      if (currentRetry < maxRetries) {
        setDownloadRetryCount(prev => ({ ...prev, [version.id]: currentRetry }));
        setActionMessage({ type: 'error', text: `下载失败，正在重试 (${currentRetry}/${maxRetries})` });
        // 自动重试
        await new Promise(resolve => setTimeout(resolve, 1000 * currentRetry));
        return handleDownload(version);
      }
      
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[version.id];
        return newProgress;
      });
      setDownloadRetryCount(prev => {
        const newRetry = { ...prev };
        delete newRetry[version.id];
        return newRetry;
      });
      setActionMessage({ type: 'error', text: `下载失败，已重试 ${maxRetries} 次` });
    }
  };

  // 处理格式选择
  const handleFormatChange = (versionId: string, format: string) => {
    setDownloadFormat(prev => ({ ...prev, [versionId]: format }));
  };

  const handleCreateTag = async (version: Version, options?: { tagName?: string; message?: string; force?: boolean }) => {
    try {
      const result = await createGitTag.mutateAsync({ 
        versionId: version.id,
        request: options ? { 
          versionId: version.id,
          ...options 
        } : undefined 
      });
      if (result.success) {
        setActionMessage({ type: 'success', text: `已创建 Git Tag: ${result.tagName}` });
      } else {
        setActionMessage({ type: 'error', text: result.error || '创建 Tag 失败' });
      }
    } catch {
      setActionMessage({ type: 'error', text: '创建 Tag 失败' });
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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsBranchPanelOpen(true)}
            className="gap-2"
          >
            <GitBranchIcon className="w-4 h-4" />
            分支管理
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsTagPanelOpen(true)}
            className="gap-2"
          >
            <Tag className="w-4 h-4" />
            版本面板
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsTagLifecycleOpen(true)}
            className="gap-2"
          >
            <Tag className="w-4 h-4" />
            Tag 生命周期
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsBatchTagOpen(true)}
            className="gap-2"
          >
            <Tag className="w-4 h-4" />
            批量 Tag
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setBuildHistory(getBuildHistory());
              setIsBuildLogViewerOpen(true);
            }}
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            构建历史
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              if (versions.length >= 2) {
                setCompareVersions([versions[0].id, versions[1].id]);
              }
            }} 
            disabled={versions.length < 2}
            className="gap-2"
          >
            <GitCompare className="w-4 h-4" />
            版本对比
          </Button>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            新建版本
          </Button>
        </div>
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
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Git Tag</th>
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
                      {version.gitTag ? (
                        <Badge variant="default" className="font-mono">
                          <Tag className="w-3 h-3 mr-1" />
                          {version.gitTag}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
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
                          disabled={createBranchForVersion.isPending}
                          title="创建分支"
                        >
                          <GitBranchIcon className="w-4 h-4" />
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
                          onClick={() => handleCreateTag(version)}
                          disabled={!!version.gitTag || createGitTag.isPending}
                          title="创建 Tag"
                        >
                          <Tag className="w-4 h-4" />
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
                        <div className="relative group">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(version)}
                            disabled={!version.artifactUrl || downloadArtifact.isPending || !!downloadProgress[version.id]}
                            title="下载产物"
                            className={downloadProgress[version.id] ? "text-blue-600" : ""}
                          >
                            {downloadProgress[version.id] ? (
                              <div className="flex items-center gap-1">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-xs">{downloadProgress[version.id]}%</span>
                                {downloadRetryCount[version.id] > 0 && (
                                  <span className="text-xs text-orange-500">({downloadRetryCount[version.id]})</span>
                                )}
                              </div>
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                          {/* 格式选择下拉 */}
                          <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-10 hidden group-hover:block min-w-[140px]">
                            {DOWNLOAD_FORMAT_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFormatChange(version.id, opt.value);
                                  handleDownload(version);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                                  downloadFormat[version.id] === opt.value ? 'bg-blue-50 text-blue-600' : ''
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
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
          onDownload={handleDownload}
          onCreateSnapshot={(data) => {
            createSnapshot.mutate({ versionId: selectedVersion.id, request: data });
          }}
          onRestoreSnapshot={(snapshotId) => {
            restoreSnapshot.mutate(snapshotId);
          }}
          downloadProgress={downloadProgress[selectedVersion.id]}
          downloadHistory={downloadHistory.filter(h => h.versionId === selectedVersion.id)}
          snapshots={versionSnapshots.data?.data}
          isLoadingSnapshots={versionSnapshots.isLoading}
          isCreatingSnapshot={createSnapshot.isPending}
          isRestoringSnapshot={restoreSnapshot.isPending}
          // 截图和变更摘要相关
          screenshots={versionScreenshots.data?.data || []}
          isLoadingScreenshots={versionScreenshots.isLoading}
          onLinkScreenshot={() => {
            setScreenshotVersionId(selectedVersion.id);
            setIsMessageSelectorOpen(true);
          }}
          onUnlinkScreenshot={(screenshotId) => {
            unlinkScreenshot.mutate({ screenshotId, versionId: selectedVersion.id });
          }}
          changelog={versionChangelog.data?.data || null}
          isLoadingChangelog={versionChangelog.isLoading}
          onGenerateChangelog={() => {
            generateChangelog.mutate({ versionId: selectedVersion.id });
          }}
          isGeneratingChangelog={generateChangelog.isPending}
          onSelectVersion={(version) => {
            setSelectedVersion(version);
          }}
        />
      )}

      {/* 版本对比弹窗 */}
      {compareVersions && (
        <VersionCompareDialog
          versionIds={compareVersions}
          versions={versions}
          onClose={() => setCompareVersions(null)}
        />
      )}

      {/* 版本面板弹窗 */}
      {isTagPanelOpen && (
        <TagPanelDialog
          versions={versions}
          favorites={favorites}
          isFavorite={isFavorite}
          onAddFavorite={addFavorite}
          onRemoveFavorite={removeFavorite}
          tagGroups={tagGroups}
          onTagGroupsChange={updateGroups}
          onClose={() => setIsTagPanelOpen(false)}
          onSelectVersion={(version) => {
            setSelectedVersion(version);
            setIsTagPanelOpen(false);
          }}
          onOpenCompare={() => {
            // 选择前两个 Tag 进行对比
            if (filteredVersions.length >= 2) {
              setCompareVersions([filteredVersions[0].id, filteredVersions[1].id]);
            }
            setIsTagPanelOpen(false);
          }}
        />
      )}

      {/* 构建历史弹窗 */}
      {isBuildLogViewerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Play className="w-6 h-6" />
                <h3 className="text-xl font-semibold">构建历史</h3>
                <span className="text-sm text-gray-500">({buildHistory.length} 条记录)</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsBuildLogViewerOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <BuildLogViewer
              buildLogs={buildHistory}
              onClear={() => {
                clearBuildHistory();
                setBuildHistory([]);
              }}
            />
          </div>
        </div>
      )}

      {/* 分支管理弹窗 */}
      {isBranchPanelOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <GitBranchIcon className="w-6 h-6" />
                <h3 className="text-xl font-semibold">分支管理</h3>
                <span className="text-sm text-gray-500">({branches.length} 个分支)</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setIsBranchCompareOpen(true)}
                  className="gap-1"
                >
                  <GitCompare className="w-4 h-4" />
                  对比
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setIsBranchMergeOpen(true)}
                  className="gap-1"
                >
                  <GitMerge className="w-4 h-4" />
                  合并
                </Button>
                <Button 
                  onClick={() => setIsCreateBranchOpen(true)}
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  创建分支
                </Button>
                <Button variant="outline" onClick={() => setIsBranchPanelOpen(false)}>
                  关闭
                </Button>
              </div>
            </div>

            {isLoadingBranches ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">加载中...</span>
              </div>
            ) : branches.length === 0 ? (
              <div className="text-center py-12 text-gray-500">暂无分支</div>
            ) : (
              <div className="space-y-2">
                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    className={`p-4 rounded-lg border ${branch.isMain ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {branch.isMain ? (
                          <Star className="w-5 h-5 text-blue-500 fill-blue-500" />
                        ) : (
                          <GitBranchIcon className="w-5 h-5 text-gray-400" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-gray-900">{branch.name}</span>
                            {branch.isMain && (
                              <Badge variant="success" className="text-xs">主分支</Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {branch.commitMessage}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-500 text-right">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            创建于 {new Date(branch.createdAt).toLocaleDateString('zh-CN')}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-gray-400">作者:</span>
                            <span>{branch.author}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {!branch.isMain && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetAsMainBranch(branch.id)}
                                disabled={setMainBranch.isPending}
                                title="设为主分支"
                              >
                                <Star className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteBranchConfirmId(branch.id)}
                                disabled={deleteBranch.isPending}
                                className="text-red-600 hover:text-red-700"
                                title="删除分支"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 删除分支确认 */}
            {deleteBranchConfirmId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold mb-4">确认删除分支</h3>
                  <p className="text-gray-600 mb-6">确定要删除这个分支吗？此操作无法撤销。</p>
                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => setDeleteBranchConfirmId(null)}>
                      取消
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteBranch(deleteBranchConfirmId)}
                      disabled={deleteBranch.isPending}
                    >
                      {deleteBranch.isPending ? (
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
        </div>
      )}

      {/* 分支对比弹窗 */}
      <BranchCompareDialog
        isOpen={isBranchCompareOpen}
        onClose={() => setIsBranchCompareOpen(false)}
        branches={branches}
      />

      {/* 分支合并弹窗 */}
      <BranchMergeDialog
        isOpen={isBranchMergeOpen}
        onClose={() => setIsBranchMergeOpen(false)}
        branches={branches}
        onMerge={async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
        }}
      />

      {/* Tag 生命周期管理弹窗 */}
      <Dialog open={isTagLifecycleOpen} onOpenChange={setIsTagLifecycleOpen}>
        <DialogContent className="max-w-2xl" title="Tag 生命周期管理">
          <div className="py-4">
            <TagLifecyclePanel />
          </div>
        </DialogContent>
      </Dialog>

      {/* 批量 Tag 操作弹窗 */}
      <Dialog open={isBatchTagOpen} onOpenChange={setIsBatchTagOpen}>
        <DialogContent className="max-w-2xl" title="批量 Tag 操作">
          <div className="py-4">
            <BatchTagOperations />
          </div>
        </DialogContent>
      </Dialog>

      {/* 创建分支弹窗 */}
      {isCreateBranchOpen && (
        <Dialog open={isCreateBranchOpen} onOpenChange={setIsCreateBranchOpen}>
          <DialogContent title="创建新分支">
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分支名称 <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="例如: feature/new-feature"
                  value={newBranchForm.name}
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  基于分支
                </label>
                <select
                  className="flex h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newBranchForm.baseBranch}
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, baseBranch: e.target.value })}
                >
                  <option value="">选择基础分支</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.name}>
                      {branch.name} {branch.isMain ? '(主分支)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  基于版本（可选）
                </label>
                <select
                  className="flex h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newBranchForm.versionId}
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, versionId: e.target.value })}
                >
                  <option value="">选择版本</option>
                  {versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {version.version} - {version.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateBranchOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleCreateNewBranch}
                disabled={createBranch.isPending || !newBranchForm.name.trim()}
              >
                {createBranch.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  "创建"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 消息选择器 */}
      <MessageSelector
        open={isMessageSelectorOpen}
        onOpenChange={setIsMessageSelectorOpen}
        onSelect={(message: MessageItem) => {
          if (screenshotVersionId) {
            linkScreenshot.mutate({
              versionId: screenshotVersionId,
              request: {
                messageId: message.id,
                messageContent: message.content,
                senderName: message.senderName,
                senderAvatar: message.senderAvatar,
                screenshotUrl: `https://example.com/screenshots/${message.id}.png`,
                thumbnailUrl: `https://example.com/screenshots/${message.id}-thumb.png`,
              },
            });
            setScreenshotVersionId(null);
          }
        }}
      />
    </div>
  );
}

// 版本详情弹窗组件
function VersionDetailDialog({ 
  version, 
  onClose,
  onDownload,
  onCreateSnapshot,
  onRestoreSnapshot,
  downloadProgress,
  downloadHistory,
  snapshots,
  isLoadingSnapshots,
  isCreatingSnapshot,
  isRestoringSnapshot,
  screenshots,
  isLoadingScreenshots,
  onLinkScreenshot,
  onUnlinkScreenshot,
  changelog,
  isLoadingChangelog,
  onGenerateChangelog,
  isGeneratingChangelog,
}: { 
  version: Version; 
  onClose: () => void;
  onDownload?: (version: Version) => void;
  onCreateSnapshot?: (data: CreateSnapshotRequest) => void;
  onRestoreSnapshot?: (snapshotId: string) => void;
  downloadProgress?: number;
  downloadHistory?: Array<{versionId: string; version: string; time: string; url: string}>;
  snapshots?: Array<{
    id: string;
    versionId: string;
    version: string;
    name: string;
    description: string;
    tags: VersionTag[];
    status: VersionStatus;
    buildStatus: "pending" | "building" | "success" | "failed";
    artifactUrl: string | null;
    gitBranch: string;
    createdAt: string;
  }>;
  isLoadingSnapshots?: boolean;
  isCreatingSnapshot?: boolean;
  isRestoringSnapshot?: boolean;
  screenshots?: Array<{
    id: string;
    versionId: string;
    messageId: string;
    messageContent: string;
    senderName: string;
    senderAvatar?: string;
    screenshotUrl: string;
    thumbnailUrl?: string;
    createdAt: string;
  }>;
  isLoadingScreenshots?: boolean;
  onLinkScreenshot?: () => void;
  onUnlinkScreenshot?: (screenshotId: string) => void;
  changelog?: {
    id: string;
    versionId: string;
    title: string;
    content: string;
    changes: Array<{
      type: "feature" | "fix" | "improvement" | "breaking" | "docs" | "refactor" | "other";
      description: string;
      files?: string[];
    }>;
    generatedAt: string;
    generatedBy: string;
  } | null;
  isLoadingChangelog?: boolean;
  onGenerateChangelog?: () => void;
  isGeneratingChangelog?: boolean;
  onSelectVersion?: (version: Version) => void;
}) {
  const [activeTab, setActiveTab] = useState<"info" | "snapshots" | "screenshots" | "changelog">("info");
  const [isCreateSnapshotOpen, setIsCreateSnapshotOpen] = useState(false);
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
  const [snapshotForm, setSnapshotForm] = useState<CreateSnapshotRequest>({
    name: "",
    description: "",
  });

  const handleCreateSnapshot = () => {
    if (snapshotForm.name.trim()) {
      onCreateSnapshot?.(snapshotForm);
      setSnapshotForm({ name: "", description: "" });
      setIsCreateSnapshotOpen(false);
    }
  };

  const handleRestore = (snapshotId: string) => {
    onRestoreSnapshot?.(snapshotId);
    setRestoreConfirmId(null);
  };

  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

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

        {/* 时间线按钮 */}
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTimelineOpen(true)}
            className="w-full"
          >
            <History className="w-4 h-4 mr-2" />
            查看变更历史时间线
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

          {/* 下载区域 */}
          {version.artifactUrl && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-3">下载</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">产物下载</span>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onDownload?.(version)}
                    disabled={!!downloadProgress}
                    className="gap-1"
                  >
                    {downloadProgress ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        下载中 {downloadProgress}%
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        下载产物
                      </>
                    )}
                  </Button>
                </div>
                {downloadProgress !== undefined && downloadProgress > 0 && downloadProgress < 100 && (
                  <Progress value={downloadProgress} className="h-2" />
                )}
                
                {/* 下载历史 */}
                {downloadHistory && downloadHistory.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs text-gray-500 mb-2">下载历史</div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {downloadHistory.slice(0, 5).map((record, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{record.time}</span>
                          <a 
                            href={record.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate max-w-[200px]"
                          >
                            重新下载
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
                <GitBranchIcon className="w-4 h-4 text-gray-400" />
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

          {/* 快照管理 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-500">版本快照</h4>
              <div className="flex gap-2">
                {snapshots && snapshots.length >= 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCompareDialogOpen(true)}
                  >
                    <GitCompare className="w-4 h-4 mr-1" />
                    对比
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateSnapshotOpen(true)}
                  disabled={isCreatingSnapshot}
                >
                  {isCreatingSnapshot ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : null}
                  创建快照
                </Button>
              </div>
            </div>
            
            {/* Tab 切换 */}
            <div className="flex border-b mb-3">
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === "info" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
                onClick={() => setActiveTab("info")}
              >
                信息
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === "snapshots" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
                onClick={() => setActiveTab("snapshots")}
              >
                快照 ({snapshots?.length || 0})
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === "screenshots" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
                onClick={() => setActiveTab("screenshots")}
              >
                <Image className="w-3 h-3 inline mr-1" />
                截图 ({screenshots?.length || 0})
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === "changelog" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
                onClick={() => setActiveTab("changelog")}
              >
                <FileCode className="w-3 h-3 inline mr-1" />
                变更摘要
              </button>
            </div>

            {/* 快照列表 */}
            {activeTab === "snapshots" && (
              <div className="space-y-2">
                {isLoadingSnapshots ? (
                  <div className="text-center py-4 text-gray-500">
                    <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                    加载中...
                  </div>
                ) : snapshots && snapshots.length > 0 ? (
                  snapshots.map((snapshot) => (
                    <div key={snapshot.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{snapshot.name}</div>
                        <div className="text-xs text-gray-500">{snapshot.description || '无描述'}</div>
                        <div className="text-xs text-gray-400">{new Date(snapshot.createdAt).toLocaleString('zh-CN')}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRestoreConfirmId(snapshot.id)}
                        disabled={isRestoringSnapshot}
                      >
                        恢复
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">暂无快照</div>
                )}
              </div>
            )}

            {/* 创建快照对话框 */}
            {isCreateSnapshotOpen && (
              <div className="mt-3 bg-gray-50 rounded-lg p-3">
                <input
                  type="text"
                  placeholder="快照名称"
                  className="w-full px-3 py-2 border rounded mb-2"
                  value={snapshotForm.name}
                  onChange={(e) => setSnapshotForm({ ...snapshotForm, name: e.target.value })}
                />
                <textarea
                  placeholder="描述（可选）"
                  className="w-full px-3 py-2 border rounded mb-2"
                  value={snapshotForm.description}
                  onChange={(e) => setSnapshotForm({ ...snapshotForm, description: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateSnapshot} disabled={!snapshotForm.name.trim()}>
                    确认
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsCreateSnapshotOpen(false)}>
                    取消
                  </Button>
                </div>
              </div>
            )}

            {/* 截图列表 */}
            {activeTab === "screenshots" && (
              <ScreenshotGallery
                screenshots={screenshots || []}
                loading={isLoadingScreenshots}
                onLink={onLinkScreenshot}
                onUnlink={onUnlinkScreenshot}
              />
            )}

            {/* 变更摘要 */}
            {activeTab === "changelog" && (
              <ChangelogPanel
                changelog={changelog ?? null}
                loading={isLoadingChangelog}
                generating={isGeneratingChangelog}
                onGenerate={onGenerateChangelog || (() => {})}
              />
            )}

            {/* 恢复确认对话框 */}
            {restoreConfirmId && (
              <div className="mt-3 bg-red-50 rounded-lg p-3">
                <p className="text-sm mb-2">确定要恢复此快照吗？</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => handleRestore(restoreConfirmId)}>
                    确认恢复
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setRestoreConfirmId(null)}>
                    取消
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 相似版本 */}
        {version && (
          <SimilarVersionsPanel
            versionId={version.id}
            onSelectVersion={() => {}}
          />
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>

        {/* 快照对比弹窗 */}
        {isCompareDialogOpen && snapshots && (
          <SnapshotCompareDialog
            open={isCompareDialogOpen}
            onOpenChange={setIsCompareDialogOpen}
            snapshots={snapshots}
          />
        )}

        {/* 变更历史时间线 */}
        {isTimelineOpen && (
          <VersionTimeline
            screenshots={screenshots || []}
            changelog={changelog ?? null}
            versionInfo={{
              version: version.version,
              createdAt: version.createdAt,
              createdBy: "",
            }}
            isOpen={isTimelineOpen}
            onClose={() => setIsTimelineOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

// 版本对比弹窗组件
function VersionCompareDialog({ 
  versionIds, 
  versions,
  onClose 
}: { 
  versionIds: [string, string]; 
  versions: Version[];
  onClose: () => void;
}) {
  const v1 = versions.find(v => v.id === versionIds[0]);
  const v2 = versions.find(v => v.id === versionIds[1]);

  if (!v1 || !v2) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">版本对比</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 对比表格 */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 border-b w-1/4">属性</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-900 border-b w-3/8">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{v1.version}</span>
                    {v1.isMain && <Badge variant="success" className="text-xs">主版本</Badge>}
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-900 border-b w-3/8">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{v2.version}</span>
                    {v2.isMain && <Badge variant="success" className="text-xs">主版本</Badge>}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {/* 标题 */}
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-500">标题</td>
                <td className="px-4 py-3 text-sm text-gray-900">{v1.title}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{v2.title}</td>
              </tr>
              {/* 描述 */}
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-500">描述</td>
                <td className="px-4 py-3 text-sm text-gray-600">{v1.description || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{v2.description || '-'}</td>
              </tr>
              {/* 状态 */}
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-500">状态</td>
                <td className="px-4 py-3">
                  <Badge variant={VERSION_STATUS_BADGE_VARIANT[v1.status]}>
                    {VERSION_STATUS_LABELS[v1.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={VERSION_STATUS_BADGE_VARIANT[v2.status]}>
                    {VERSION_STATUS_LABELS[v2.status]}
                  </Badge>
                </td>
              </tr>
              {/* 构建状态 */}
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-500">构建状态</td>
                <td className="px-4 py-3">
                  <Badge variant={BUILD_STATUS_BADGE_VARIANT[v1.buildStatus]}>
                    {BUILD_STATUS_LABELS[v1.buildStatus]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={BUILD_STATUS_BADGE_VARIANT[v2.buildStatus]}>
                    {BUILD_STATUS_LABELS[v2.buildStatus]}
                  </Badge>
                </td>
              </tr>
              {/* 标签 */}
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-500">标签</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {v1.tags.map((tag) => {
                      const tagOption = VERSION_TAG_OPTIONS.find((t) => t.value === tag);
                      return (
                        <span key={tag} className={`px-2 py-0.5 rounded-full text-xs ${tagOption?.color || 'bg-gray-100'}`}>
                          {tagOption?.label || tag}
                        </span>
                      );
                    })}
                    {v1.tags.length === 0 && <span className="text-gray-400 text-sm">无</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {v2.tags.map((tag) => {
                      const tagOption = VERSION_TAG_OPTIONS.find((t) => t.value === tag);
                      return (
                        <span key={tag} className={`px-2 py-0.5 rounded-full text-xs ${tagOption?.color || 'bg-gray-100'}`}>
                          {tagOption?.label || tag}
                        </span>
                      );
                    })}
                    {v2.tags.length === 0 && <span className="text-gray-400 text-sm">无</span>}
                  </div>
                </td>
              </tr>
              {/* 发布时间 */}
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-500">发布时间</td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {v1.releasedAt ? new Date(v1.releasedAt).toLocaleString('zh-CN') : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {v2.releasedAt ? new Date(v2.releasedAt).toLocaleString('zh-CN') : '-'}
                </td>
              </tr>
              {/* 变更文件数 */}
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-500">变更文件</td>
                <td className="px-4 py-3 text-sm text-gray-900">{v1.changedFiles.length} 个文件</td>
                <td className="px-4 py-3 text-sm text-gray-900">{v2.changedFiles.length} 个文件</td>
              </tr>
              {/* 提交数 */}
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-500">提交数</td>
                <td className="px-4 py-3 text-sm text-gray-900">{v1.commitCount} 次</td>
                <td className="px-4 py-3 text-sm text-gray-900">{v2.commitCount} 次</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 差异文件列表 */}
        {(v1.changedFiles.length > 0 || v2.changedFiles.length > 0) && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-500 mb-3">差异文件</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="text-xs font-medium text-gray-500 mb-2">{v1.version} 独有文件</div>
                {v1.changedFiles.filter(f => !v2.changedFiles.includes(f)).length > 0 ? (
                  <ul className="space-y-1">
                    {v1.changedFiles.filter(f => !v2.changedFiles.includes(f)).map((file, index) => (
                      <li key={index} className="text-sm text-green-600 font-mono truncate">+ {file}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-gray-400 text-sm">无独有文件</span>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="text-xs font-medium text-gray-500 mb-2">{v2.version} 独有文件</div>
                {v2.changedFiles.filter(f => !v1.changedFiles.includes(f)).length > 0 ? (
                  <ul className="space-y-1">
                    {v2.changedFiles.filter(f => !v1.changedFiles.includes(f)).map((file, index) => (
                      <li key={index} className="text-sm text-red-600 font-mono truncate">- {file}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-gray-400 text-sm">无独有文件</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
}

// 版本面板弹窗组件 - 显示所有 Git Tags 和提交详情
function TagPanelDialog({ 
  versions, 
  favorites,
  isFavorite,
  onAddFavorite,
  onRemoveFavorite,
  tagGroups,
  onTagGroupsChange,
  onClose,
  onSelectVersion,
  onOpenCompare,
}: { 
  versions: Version[];
  favorites: Array<{ tagName: string; addedAt: string }>;
  isFavorite: (tagName: string) => boolean;
  onAddFavorite: (tagName: string) => void;
  onRemoveFavorite: (tagName: string) => void;
  tagGroups: Array<{ id: string; name: string; color: string; tagNames: string[] }>;
  onTagGroupsChange: (groups: Array<{ id: string; name: string; color: string; tagNames: string[] }>) => void;
  onClose: () => void;
  onSelectVersion: (version: Version) => void;
  onOpenCompare: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showStats, setShowStats] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");

  // 按 Git Tag 创建时间排序（最新的在前）
  const versionsWithTags = versions
    .filter(v => v.gitTag)
    .sort((a, b) => {
      const dateA = a.gitTagCreatedAt ? new Date(a.gitTagCreatedAt).getTime() : 0;
      const dateB = b.gitTagCreatedAt ? new Date(b.gitTagCreatedAt).getTime() : 0;
      return dateB - dateA;
    });

  // 筛选后的版本列表
  const filteredVersions = versionsWithTags.filter(v => {
    // 分组筛选
    if (selectedGroupFilter !== "all") {
      const group = tagGroups.find(g => g.id === selectedGroupFilter);
      if (!group || !group.tagNames.includes(v.gitTag || "")) {
        return false;
      }
    }
    // 搜索筛选
    if (searchQuery && !v.version.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !v.gitTag?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !v.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // 日期范围筛选
    if (dateRange.start || dateRange.end) {
      const tagDate = v.gitTagCreatedAt ? new Date(v.gitTagCreatedAt).getTime() : 0;
      if (dateRange.start) {
        const startDate = new Date(dateRange.start).getTime();
        if (tagDate < startDate) return false;
      }
      if (dateRange.end) {
        const endDate = new Date(dateRange.end).getTime();
        if (tagDate > endDate + 86400000) return false; // 包含结束日期当天
      }
    }
    return true;
  });

  // 收藏的版本（按添加时间倒序）
  const favoriteVersions = versionsWithTags
    .filter(v => v.gitTag && isFavorite(v.gitTag))
    .sort((a, b) => {
      const favA = favorites.find(f => f.tagName === a.gitTag);
      const favB = favorites.find(f => f.tagName === b.gitTag);
      const dateA = favA ? new Date(favA.addedAt).getTime() : 0;
      const dateB = favB ? new Date(favB.addedAt).getTime() : 0;
      return dateB - dateA;
    });

  // 统计最近6个月的发布数量
  const getMonthlyStats = () => {
    const now = new Date();
    const stats: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      stats[key] = 0;
    }
    filteredVersions.forEach(v => {
      if (v.gitTagCreatedAt) {
        const date = new Date(v.gitTagCreatedAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (stats[key] !== undefined) {
          stats[key]++;
        }
      }
    });
    return Object.entries(stats).map(([month, count]) => ({ month, count }));
  };

  const monthlyStats = getMonthlyStats();
  const maxCount = Math.max(...monthlyStats.map(s => s.count), 1);

  // 批量操作
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredVersions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVersions.map(v => v.id)));
    }
  };

  const handleExport = () => {
    const selectedVersions = filteredVersions.filter(v => selectedIds.has(v.id));
    const json = JSON.stringify(selectedVersions.map(v => ({
      version: v.version,
      gitTag: v.gitTag,
      title: v.title,
      status: v.status,
      createdAt: v.gitTagCreatedAt,
      commitCount: v.commitCount,
      changedFiles: v.changedFiles,
    })), null, 2);
    
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `versions-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-5xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Tag className="w-5 h-5 text-blue-600" />
            <h3 className="text-xl font-semibold">版本面板</h3>
            <Badge variant="default">
              {filteredVersions.length} / {versionsWithTags.length} 个 Tag
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onOpenCompare}>
              <GitCompare className="w-4 h-4 mr-1" />对比
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowGroupManager(!showGroupManager)}>
              <FolderOpen className="w-4 h-4 mr-1" />分组
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowStats(!showStats)}>
              <FileText className="w-4 h-4 mr-1" />统计
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 分组管理面板 */}
        {showGroupManager && (
          <div className="mb-4 border rounded-lg p-4 bg-gray-50">
            <TagGroupManager
              groups={tagGroups}
              onGroupsChange={onTagGroupsChange}
              availableTags={versionsWithTags.map(v => v.gitTag).filter(Boolean) as string[]}
            />
          </div>
        )}

        {/* 收藏区域 */}
        {favoriteVersions.length > 0 && (
          <div className="mb-4 border rounded-lg p-4 bg-amber-50">
            <div className="text-sm font-medium mb-2 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              收藏的版本 ({favoriteVersions.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {favoriteVersions.map((version) => (
                <div
                  key={version.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white border rounded-md cursor-pointer hover:bg-amber-100"
                  onClick={() => onSelectVersion(version)}
                >
                  <Tag className="w-3 h-3 text-amber-600" />
                  <span className="text-sm font-mono">{version.gitTag}</span>
                  <button
                    className="text-gray-400 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFavorite(version.gitTag!);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 搜索和筛选区域 */}
        <div className="mb-4 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="搜索版本号、Tag、标题..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-36"
              placeholder="开始日期"
            />
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-36"
              placeholder="结束日期"
            />
            {/* 分组筛选 */}
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">全部分组</option>
              {tagGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.tagNames.length})
                </option>
              ))}
            </select>
            {(searchQuery || dateRange.start || dateRange.end || selectedGroupFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => {
                setSearchQuery("");
                setDateRange({ start: "", end: "" });
                setSelectedGroupFilter("all");
              }}>
                清除筛选
              </Button>
            )}
          </div>

          {/* 统计图表 */}
          {showStats && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="text-sm font-medium mb-3">近6个月发布统计</div>
              <div className="flex items-end justify-between gap-2 h-24">
                {monthlyStats.map(({ month, count }) => (
                  <div key={month} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-blue-500 rounded-t transition-all"
                      style={{ height: `${(count / maxCount) * 80}px`, minHeight: count > 0 ? '4px' : '0' }}
                    />
                    <div className="text-xs text-gray-500 mt-1">{month.slice(5)}</div>
                    <div className="text-xs font-medium">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tag 列表 */}
        <div className="flex-1 overflow-y-auto">
          {filteredVersions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>暂无 Git Tag</p>
              <p className="text-sm mt-1">创建版本后可以生成 Git Tag</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVersions.map((version) => (
                <div
                  key={version.id}
                  className={`border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedIds.has(version.id) ? 'bg-blue-50 border-blue-300' : ''
                  }`}
                  onClick={() => !selectedIds.has(version.id) && onSelectVersion(version)}
                >
                  <div className="flex items-start gap-3">
                    {/* 复选框 */}
                    <input
                      type="checkbox"
                      checked={selectedIds.has(version.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelect(version.id);
                      }}
                      className="mt-2 w-4 h-4 rounded border-gray-300"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-blue-600" />
                            <span className="font-mono font-medium text-gray-900">
                              {version.gitTag}
                            </span>
                            {/* 收藏按钮 */}
                            <button
                              className={`p-1 rounded hover:bg-gray-100 ${
                                isFavorite(version.gitTag || "") ? "text-amber-500" : "text-gray-300"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isFavorite(version.gitTag || "")) {
                                  onRemoveFavorite(version.gitTag!);
                                } else {
                                  onAddFavorite(version.gitTag!);
                                }
                              }}
                            >
                              <Star className="w-4 h-4" fill={isFavorite(version.gitTag || "") ? "currentColor" : "none"} />
                            </button>
                          </div>
                          {version.isMain && (
                            <Badge variant="success" className="text-xs">
                              <Star className="w-3 h-3 mr-1" />主版本
                            </Badge>
                          )}
                          <Badge variant={VERSION_STATUS_BADGE_VARIANT[version.status]}>
                            {VERSION_STATUS_LABELS[version.status]}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          {version.gitTagCreatedAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(version.gitTagCreatedAt).toLocaleDateString('zh-CN')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">版本:</span>
                          <span className="font-medium text-gray-900">{version.version}</span>
                          <span className="text-gray-300">|</span>
                          <span className="text-sm text-gray-500">标题:</span>
                          <span className="text-gray-900">{version.title}</span>
                        </div>

                        {/* 提交信息 */}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <GitBranchIcon className="w-3 h-3" />
                            {version.commitCount} 次提交
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {version.changedFiles.length} 个文件
                          </span>
                          {version.description && (
                            <span className="truncate max-w-[300px] text-gray-400">
                              {version.description}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 变更文件预览 */}
                      {version.changedFiles.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs text-gray-500 mb-2">变更文件:</div>
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                            {version.changedFiles.slice(0, 10).map((file, index) => (
                              <span 
                                key={index} 
                                className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-600 truncate max-w-[200px]"
                              >
                                {file}
                              </span>
                            ))}
                            {version.changedFiles.length > 10 && (
                              <span className="px-2 py-0.5 text-xs text-gray-400">
                                +{version.changedFiles.length - 10} 个文件
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 批量操作栏 */}
        <div className="mt-4 pt-4 border-t flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              已选择 {selectedIds.size} 项
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleSelectAll}
            >
              {selectedIds.size === filteredVersions.length ? '取消全选' : '全选'}
            </Button>
            {selectedIds.size > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-1" />导出
                </Button>
              </>
            )}
          </div>
          <div className="text-sm text-gray-500">
            点击复选框选择，点击行查看详情
          </div>
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
