"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { History, MessageSquare, FileText, Search, Filter, Download, ChevronDown, ChevronRight, MessageSquarePlus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { VersionMessageScreenshot, VersionChangelog, TimelineEvent as ApiTimelineEvent } from "@/lib/api/types";
import { useVersionTimeline, useAddTimelineEvent, useDeleteTimelineEvent, useUpdateTimelineEvent } from "@/lib/api/versions";

interface VersionTimelineProps {
  screenshots?: VersionMessageScreenshot[];
  changelog?: VersionChangelog | null;
  versionInfo: {
    version: string;
    createdAt: string;
    createdBy: string;
  };
  isOpen: boolean;
  onClose: () => void;
  /** 可选的分支列表，用于筛选 */
  availableBranches?: string[];
  /** 版本 ID，用于从 API 获取时间线事件 */
  versionId?: string;
}

interface TimelineEvent {
  id: string;
  type: "screenshot" | "changelog" | "version" | "manual_note";
  title: string;
  description: string;
  timestamp: string;
  branchName?: string;
  data?: VersionMessageScreenshot | VersionChangelog | { createdBy: string };
}

export function VersionTimeline({ screenshots = [], changelog, versionInfo, isOpen, onClose, availableBranches = [], versionId }: VersionTimelineProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "screenshot" | "changelog" | "version" | "manual_note">("all");
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [showCount, setShowCount] = useState(5);

  // API-based timeline (when versionId is provided)
  const { data: apiEvents, isLoading: timelineLoading, isError: timelineError } = useVersionTimeline(versionId ?? null);
  const queryClient = useQueryClient();

  // Add note dialog state
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const addNoteMutation = useAddTimelineEvent();
  const deleteEventMutation = useDeleteTimelineEvent();

  // Edit note dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<{ id: string; description: string } | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const updateEventMutation = useUpdateTimelineEvent();

  const handleAddNote = async () => {
    if (!noteText.trim() || !versionId) return;
    try {
      await addNoteMutation.mutateAsync({ versionId, data: { note: noteText.trim() } });
      queryClient.invalidateQueries({ queryKey: ["versionTimeline", versionId] });
      setNoteText("");
      setNoteDialogOpen(false);
    } catch (err) {
      console.error("[VersionTimeline] Failed to add note:", err);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!versionId) return;
    try {
      await deleteEventMutation.mutateAsync({ versionId, eventId });
      queryClient.invalidateQueries({ queryKey: ["versionTimeline", versionId] });
    } catch (err) {
      console.error("[VersionTimeline] Failed to delete event:", err);
    }
  };

  const handleEditEvent = (event: TimelineEvent) => {
    setEditingEvent({ id: event.id, description: event.description });
    setEditNoteText(event.description);
    setEditDialogOpen(true);
  };

  const handleUpdateNote = async () => {
    if (!editingEvent || !versionId || !editNoteText.trim()) return;
    try {
      await updateEventMutation.mutateAsync({
        versionId,
        eventId: editingEvent.id,
        data: { note: editNoteText.trim() }
      });
      queryClient.invalidateQueries({ queryKey: ["versionTimeline", versionId] });
      setEditDialogOpen(false);
      setEditingEvent(null);
      setEditNoteText("");
    } catch (err) {
      console.error("[VersionTimeline] Failed to update note:", err);
    }
  };

  // 构建时间线事件
  const events: TimelineEvent[] = versionId && apiEvents && apiEvents.length > 0
    ? apiEvents.map((evt: ApiTimelineEvent) => ({
        id: evt.id,
        type: evt.type === 'version_created' ? 'version' as const
          : evt.type === 'version_rollback' ? 'version' as const
          : evt.type === 'bump_executed' ? 'version' as const
          : evt.type === 'changelog_generated' ? 'changelog' as const
          : evt.type === 'manual_note' ? 'manual_note' as const
          : 'screenshot' as const,
        title: evt.title,
        description: evt.description || '',
        timestamp: evt.timestamp,
      }))
    : [
        {
          id: "version-created",
          type: "version" as const,
          title: "版本创建",
          description: `版本 ${versionInfo.version} 已创建`,
          timestamp: versionInfo.createdAt,
          data: { createdBy: versionInfo.createdBy },
        },
        ...(changelog
          ? [
              {
                id: "changelog-generated",
                type: "changelog" as const,
                title: "变更摘要生成",
                description: changelog.title || "变更摘要已生成",
                timestamp: changelog.generatedAt || "",
                branchName: changelog.branchName,
                data: changelog,
              },
            ]
          : []),
        ...screenshots.map((screenshot, index) => ({
          id: `screenshot-${index}`,
          type: "screenshot" as const,
          title: "截图关联",
          description: screenshot.messageContent?.slice(0, 50) + "..." || "截图已关联",
          timestamp: screenshot.createdAt,
          branchName: screenshot.branchName,
          data: screenshot,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // 过滤事件
  const filteredEvents = events.filter((event) => {
    if (filterType !== "all" && event.type !== filterType) return false;
    if (branchFilter !== "all" && event.branchName !== branchFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 导出为 Markdown
  const exportToMarkdown = () => {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `version-${versionInfo.version}-changelog.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateMarkdown = () => {
    let md = `# 版本 ${versionInfo.version} 变更追踪\n\n`;
    md += `**创建时间**: ${versionInfo.createdAt}\n`;
    md += `**创建者**: ${versionInfo.createdBy}\n\n`;
    md += `---\n\n`;

    if (changelog) {
      md += `## 变更摘要\n\n`;
      md += `**${changelog.title}**\n\n`;
      md += `${changelog.content}\n\n`;

      if (changelog.changes && changelog.changes.length > 0) {
        md += `### 变更详情\n\n`;
        changelog.changes.forEach((change) => {
          md += `- **${change.type}**: ${change.description}\n`;
          if (change.files && change.files.length > 0) {
            md += `  - 文件: ${change.files.join(", ")}\n`;
          }
        });
        md += "\n";
      }
    }

    if (screenshots.length > 0) {
      md += `## 关联截图\n\n`;
      screenshots.forEach((screenshot, index) => {
        md += `### 截图 ${index + 1}\n\n`;
        md += `- 发送者: ${screenshot.senderName}\n`;
        md += `- 时间: ${screenshot.createdAt}\n`;
        md += `- 内容: ${screenshot.messageContent}\n\n`;
      });
    }

    return md;
  };

  const getEventIcon = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "screenshot":
        return <MessageSquare className="h-4 w-4" />;
      case "changelog":
        return <FileText className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getEventBadge = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "screenshot":
        return <Badge variant="default">截图</Badge>;
      case "changelog":
        return <Badge variant="info">变更摘要</Badge>;
      case "manual_note":
        return <Badge variant="default">备注</Badge>;
      default:
        return <Badge variant="default">版本</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        title="变更历史时间线"
        className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center gap-2 pb-4 border-b">
          <History className="h-5 w-5" />
          <h2 className="text-lg font-semibold">变更历史时间线</h2>
        </div>

        {/* 搜索和过滤 */}
        <div className="flex items-center gap-3 py-3 border-b flex-wrap">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索事件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
              <SelectTrigger className="h-8 text-xs w-auto min-w-[100px]">
                <SelectValue placeholder="筛选类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="screenshot">截图</SelectItem>
                <SelectItem value="changelog">变更摘要</SelectItem>
                <SelectItem value="manual_note">备注</SelectItem>
                <SelectItem value="version">版本</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {availableBranches.length > 0 && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-8 text-xs w-auto min-w-[100px]">
                <SelectValue placeholder="全部分支" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分支</SelectItem>
                {availableBranches.map((branch) => (
                  <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={exportToMarkdown}>
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
          {versionId && (
            <Button variant="outline" size="sm" onClick={() => setNoteDialogOpen(true)}>
              <MessageSquarePlus className="h-4 w-4 mr-1" />
              添加备注
            </Button>
          )}
        </div>

        {/* 时间线 */}
        <div className="flex-1 overflow-y-auto py-4">
          {timelineLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="h-8 w-8 mx-auto mb-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p>加载时间线...</p>
            </div>
          ) : timelineError ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-red-500 mb-3">加载时间线失败</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => versionId && queryClient.invalidateQueries({ queryKey: ["versionTimeline", versionId] })}
              >
                重试
              </Button>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>暂无变更记录</p>
              <p className="text-xs text-gray-400 mt-2">关联截图或生成摘要有助于记录变更历史</p>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredEvents.slice(0, showCount).map((event, index) => (
                <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* 连接线 */}
                  {index < Math.min(showCount, filteredEvents.length) - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border" />
                  )}

                  {/* 图标 */}
                  <div className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {getEventIcon(event.type)}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getEventBadge(event.type)}
                      <span className="font-medium text-sm">{event.title}</span>
                      {event.branchName && (
                        <Badge variant="default" className="text-xs">
                          {event.branchName}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(event.timestamp).toLocaleString("zh-CN")}
                      </span>
                      {event.type === "manual_note" && versionId && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6 px-1 text-muted-foreground hover:text-primary"
                            onClick={() => handleEditEvent(event)}
                            title="编辑备注"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6 px-1 text-muted-foreground hover:text-red-500"
                            onClick={() => handleDeleteEvent(event.id)}
                            disabled={deleteEventMutation.isPending}
                            title="删除备注"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">{event.description}</p>

                    {/* 截图事件：显示消息内容摘要（前50字） */}
                    {event.type === "screenshot" && event.data && "messageContent" in event.data && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        💬 {(event.data as VersionMessageScreenshot).messageContent?.slice(0, 50)}
                        {(event.data as VersionMessageScreenshot).messageContent?.length > 50 ? "…" : ""}
                      </p>
                    )}

                    {/* 摘要生成事件：显示摘要内容预览（前100字） */}
                    {event.type === "changelog" && event.data && "content" in event.data && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        📝 {(event.data as VersionChangelog).content?.slice(0, 100)}
                        {(event.data as VersionChangelog).content?.length > 100 ? "…" : ""}
                      </p>
                    )}

                    {/* 展开详情 */}
                    {event.data && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 px-2"
                        onClick={() => toggleExpand(event.id)}
                      >
                        {expandedEvents.has(event.id) ? (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            收起
                          </>
                        ) : (
                          <>
                            <ChevronRight className="h-3 w-3 mr-1" />
                            展开详情
                          </>
                        )}
                      </Button>
                    )}

                    {expandedEvents.has(event.id) && event.data && (
                      <div className="p-3 bg-muted rounded-lg text-xs space-y-2">
                        {event.type === "changelog" && "changes" in event.data && (
                          <div className="space-y-1">
                            {(event.data as VersionChangelog).changes.map((change: VersionChangelog['changes'][number], i: number) => (
                              <div key={i} className="flex items-start gap-2">
                                <Badge variant="default" className="text-xs">
                                  {change.type}
                                </Badge>
                                <span>{change.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {event.type === "screenshot" && (
                          <div className="space-y-1">
                            <p>
                              <strong>发送者:</strong> {(event.data as VersionMessageScreenshot).senderName}
                            </p>
                            <p className="line-clamp-3">
                              <strong>内容:</strong> {(event.data as VersionMessageScreenshot).messageContent}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {/* 展开更多按钮 */}
              {filteredEvents.length > 5 && (
                <div className="pt-2 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCount((prev) => prev >= filteredEvents.length ? 5 : prev + 5)}
                  >
                    {showCount >= filteredEvents.length
                      ? "收起"
                      : `展开更多（已显示 ${showCount} / 共 ${filteredEvents.length}）`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>

      {/* 添加备注对话框 */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加备注</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <textarea
              className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="输入备注内容..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleAddNote();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleAddNote}
              disabled={!noteText.trim() || addNoteMutation.isPending}
            >
              {addNoteMutation.isPending ? "添加中..." : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑备注对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑备注</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <textarea
              className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="输入备注内容..."
              value={editNoteText}
              onChange={(e) => setEditNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleUpdateNote();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleUpdateNote}
              disabled={!editNoteText.trim() || updateEventMutation.isPending}
            >
              {updateEventMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
