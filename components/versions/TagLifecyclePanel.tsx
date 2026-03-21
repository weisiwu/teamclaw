"use client";

import { useState, useEffect } from "react";
import { TagLifecycleRecord } from "@/lib/api/types";
import { useAllTags, useArchiveTag, useTagProtection, useDeleteTag, useRenameTag, useCreateGitTag } from "@/lib/api/versions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Archive, Lock, Unlock, Trash2, RefreshCw, Pencil, Check, X, GitCommit, Calendar, MessageSquare, ChevronDown, ChevronRight, Filter, Loader2 } from "lucide-react";

interface TagLifecyclePanelProps {
  versionId?: string;
}

export function TagLifecyclePanel({ versionId }: TagLifecyclePanelProps) {
  const { data: tags = [], isLoading, isError, refetch } = useAllTags();
  const archiveTag = useArchiveTag();
  const setProtection = useTagProtection();
  const deleteTag = useDeleteTag();
  const renameTag = useRenameTag();
  const createGitTag = useCreateGitTag();

  // Batch selection
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createTagName, setCreateTagName] = useState("");
  const [createVersionId, setCreateVersionId] = useState(versionId || "");

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "auto" | "manual">("all");
  const [archivedFilter, setArchivedFilter] = useState<"all" | "active" | "archived">("active");
  const [showFilters, setShowFilters] = useState(false);

  // Toast 通知
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
  };

  useEffect(() => {
    if (toastVisible) {
      const timer = setTimeout(() => setToastVisible(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastVisible]);

  // Filter tags by versionId if provided, plus search + source filter
  let filteredTags = versionId
    ? tags.filter(t => t.versionId === versionId)
    : tags;

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredTags = filteredTags.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.commit?.toLowerCase().includes(q) ||
      t.annotation?.toLowerCase().includes(q) ||
      t.version?.toLowerCase().includes(q)
    );
  }

  // Archive filter
  if (archivedFilter === "active") {
    filteredTags = filteredTags.filter(t => !t.archived);
  } else if (archivedFilter === "archived") {
    filteredTags = filteredTags.filter(t => t.archived);
  }

  const handleArchive = async (tag: TagLifecycleRecord) => {
    await archiveTag.mutateAsync({ tagId: tag.id, archive: !tag.archived });
    refetch();
  };

  const handleSetProtection = async (tag: TagLifecycleRecord) => {
    await setProtection.mutateAsync({ tagId: tag.id, protect: !tag.protected });
    refetch();
  };

  const handleDelete = async (tag: TagLifecycleRecord) => {
    if (tag.protected) {
      showToast("无法删除受保护的标签", "error");
      return;
    }
    await deleteTag.mutateAsync(tag.id);
    refetch();
  };

  const startRename = (tag: TagLifecycleRecord) => {
    if (tag.protected) return;
    setRenamingId(tag.id);
    setRenameValue(tag.name);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const confirmRename = async (tag: TagLifecycleRecord) => {
    if (!renameValue.trim() || renameValue === tag.name) {
      cancelRename();
      return;
    }
    await renameTag.mutateAsync({ tagId: tag.id, name: renameValue.trim() });
    cancelRename();
    refetch();
  };

  const toggleExpand = (tagName: string) => {
    const newExpanded = new Set(expandedTags);
    if (newExpanded.has(tagName)) {
      newExpanded.delete(tagName);
    } else {
      newExpanded.add(tagName);
    }
    setExpandedTags(newExpanded);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const shortHash = (hash?: string) => {
    if (!hash) return "-";
    return hash.length > 8 ? hash.substring(0, 8) : hash;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Tag Lifecycle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading tags...</div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Tag Lifecycle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">加载标签失败</div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-2 h-7">
            <RefreshCw className="w-3 h-3 mr-1" />
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">
            Tag Lifecycle ({filteredTags.length})
          </CardTitle>
          {tags.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-7 px-2"
            >
              <Filter className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedTags.size > 0 && (
            <div className="flex items-center gap-1 mr-2">
              <span className="text-xs text-muted-foreground">{selectedTags.size} 已选</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setSelectedTags(new Set())}
              >
                取消
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={async () => {
                  for (const id of Array.from(selectedTags)) {
                    const tag = tags.find(t => t.id === id);
                    if (tag && !tag.archived && !tag.protected) {
                      await archiveTag.mutateAsync({ tagId: id, archive: true });
                    }
                  }
                  setSelectedTags(new Set());
                  refetch();
                }}
                disabled={archiveTag.isPending}
              >
                <Archive className="h-3 w-3 mr-1" />
                批量归档
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                onClick={async () => {
                  for (const id of Array.from(selectedTags)) {
                    const tag = tags.find(t => t.id === id);
                    if (tag && !tag.protected) {
                      await deleteTag.mutateAsync(id);
                    }
                  }
                  setSelectedTags(new Set());
                  refetch();
                }}
                disabled={deleteTag.isPending}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                批量删除
              </Button>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setShowCreateDialog(true)}
          >
            <span className="text-xs">+ 新建标签</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filter bar */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 mb-3 p-2 bg-muted/30 rounded-md">
            <Input
              placeholder="搜索 tag、commit、版本..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 text-xs flex-1 min-w-[160px]"
            />
            <div className="flex gap-1">
              {(["all", "auto", "manual"] as const).map((s) => (
                <Button
                  key={s}
                  variant={sourceFilter === s ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setSourceFilter(s)}
                >
                  {s === "all" ? "全部" : s === "auto" ? "自动" : "手动"}
                </Button>
              ))}
            </div>
            <div className="flex gap-1">
              {(["active", "archived", "all"] as const).map((s) => (
                <Button
                  key={s}
                  variant={archivedFilter === s ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setArchivedFilter(s)}
                >
                  {s === "active" ? "有效" : s === "archived" ? "已归档" : "全部"}
                </Button>
              ))}
            </div>
          </div>
        )}

        {filteredTags.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No tags found</p>
        ) : (
          <div className="space-y-2">
            {filteredTags.map((tag) => {
              const isExpanded = expandedTags.has(tag.name);
              const hasCommitInfo = !!(tag.commit || tag.annotation || tag.date);

              return (
                <div key={tag.id || tag.name} className="border rounded-md overflow-hidden">
                  {/* Main row */}
                  <div className="flex items-center justify-between p-2 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Batch select checkbox */}
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={selectedTags.has(tag.id)}
                        onChange={(e) => {
                          const next = new Set(selectedTags);
                          if (e.target.checked) {
                            next.add(tag.id);
                          } else {
                            next.delete(tag.id);
                          }
                          setSelectedTags(next);
                        }}
                      />

                      {/* Expand button */}
                      {hasCommitInfo && (
                        <button
                          onClick={() => toggleExpand(tag.name)}
                          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      )}

                      {/* Tag name */}
                      <span className="font-mono text-sm font-medium truncate">{tag.name}</span>

                      {/* Commit hash badge */}
                      {tag.commit && (
                        <Badge variant="info" className="text-xs font-mono flex-shrink-0">
                          <GitCommit className="h-3 w-3 mr-1" />
                          {shortHash(tag.commit)}
                        </Badge>
                      )}

                      {/* Badges */}
                      {tag.source === "auto" && (
                        <Badge variant="info" className="text-xs flex-shrink-0">自动</Badge>
                      )}
                      {tag.source === "manual" && (
                        <Badge variant="default" className="text-xs flex-shrink-0">手动</Badge>
                      )}
                      {tag.archived && (
                        <Badge variant="default" className="text-xs flex-shrink-0">
                          <Archive className="h-3 w-3 mr-1" />
                          Archived
                        </Badge>
                      )}
                      {tag.protected && (
                        <Badge variant="warning" className="text-xs flex-shrink-0">
                          <Lock className="h-3 w-3 mr-1" />
                          Protected
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {renamingId === tag.id ? (
                        <>
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="h-7 text-sm font-mono w-32"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") confirmRename(tag);
                              if (e.key === "Escape") cancelRename();
                            }}
                          />
                          <Button size="sm" variant="ghost" onClick={() => confirmRename(tag)} disabled={renameTag.isPending}>
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelRename}>
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {!tag.protected && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startRename(tag)}
                              title="Rename"
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchive(tag)}
                            disabled={archiveTag.isPending || tag.protected}
                            title={tag.archived ? "Unarchive" : "Archive"}
                            className="h-8 w-8 p-0"
                          >
                            {tag.archived ? (
                              <Unlock className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Archive className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetProtection(tag)}
                            disabled={setProtection.isPending}
                            title={tag.protected ? "Unprotect" : "Protect"}
                            className="h-8 w-8 p-0"
                          >
                            {tag.protected ? (
                              <Unlock className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(tag)}
                            disabled={deleteTag.isPending || tag.protected}
                            title={tag.protected ? "Cannot delete protected tag" : "Delete"}
                            className={`h-8 w-8 p-0 ${tag.protected ? "opacity-50" : ""}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded commit info */}
                  {isExpanded && hasCommitInfo && (
                    <div className="border-t bg-muted/20 px-3 py-2 space-y-1.5">
                      {tag.commit && (
                        <div className="flex items-start gap-2 text-xs">
                          <GitCommit className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="text-muted-foreground">Commit: </span>
                            <span className="font-mono text-blue-600">{tag.commit}</span>
                          </div>
                        </div>
                      )}
                      {tag.date && (
                        <div className="flex items-start gap-2 text-xs">
                          <Calendar className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div>
                            <span className="text-muted-foreground">时间: </span>
                            <span>{formatDate(tag.date)}</span>
                          </div>
                        </div>
                      )}
                      {tag.annotation && (
                        <div className="flex items-start gap-2 text-xs">
                          <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="text-muted-foreground">说明: </span>
                            <span className="break-all">{tag.annotation}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Toast 通知 */}
    {toastVisible && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm text-white ${
            toastType === "success" ? "bg-gray-900" : "bg-red-600"
          }`}
        >
          {toastType === "success" ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <X className="w-4 h-4 text-white" />
          )}
          <span>{toastMsg}</span>
        </div>
      </div>
    )}

    {/* Create Tag Dialog */}
    {showCreateDialog && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={() => setShowCreateDialog(false)}
      >
        <div
          className="bg-white rounded-lg shadow-xl w-full mx-4 max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-900">新建 Git Tag</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowCreateDialog(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">版本</label>
              <Input
                placeholder="输入版本 ID（如 v1.0.0）"
                value={createVersionId}
                onChange={(e) => setCreateVersionId(e.target.value)}
                className="w-full font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Tag 名称</label>
              <Input
                placeholder="如：v1.0.0"
                value={createTagName}
                onChange={(e) => setCreateTagName(e.target.value)}
                className="w-full font-mono"
              />
              <p className="text-xs text-gray-400">留空则自动使用版本号前加 v</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-gray-50 rounded-b-lg">
            <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                if (!createVersionId.trim()) {
                  showToast("请输入版本", "error");
                  return;
                }
                try {
                  const result = await createGitTag.mutateAsync({
                    versionId: createVersionId.trim(),
                    request: createTagName.trim() ? { versionId: createVersionId.trim(), tagName: createTagName.trim() } : undefined,
                  });
                  if (result.success) {
                    showToast(`标签 ${result.tagName} 创建成功`);
                    setShowCreateDialog(false);
                    setCreateTagName("");
                    setCreateVersionId("");
                    refetch();
                  } else {
                    showToast(result.error || "创建失败", "error");
                  }
                } catch {
                  showToast("创建失败，请重试", "error");
                }
              }}
              disabled={createGitTag.isPending}
            >
              {createGitTag.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : null}
              创建标签
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default TagLifecyclePanel;
