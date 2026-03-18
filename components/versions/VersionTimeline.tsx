"use client";

import { useState } from "react";
import { History, MessageSquare, FileText, Search, Filter, Download, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { VersionMessageScreenshot, VersionChangelog } from "@/lib/api/types";

interface VersionTimelineProps {
  screenshots: VersionMessageScreenshot[];
  changelog: VersionChangelog | null;
  versionInfo: {
    version: string;
    createdAt: string;
    createdBy: string;
  };
  isOpen: boolean;
  onClose: () => void;
  /** 可选的分支列表，用于筛选 */
  availableBranches?: string[];
}

interface TimelineEvent {
  id: string;
  type: "screenshot" | "changelog" | "version";
  title: string;
  description: string;
  timestamp: string;
  branchName?: string;
  data?: VersionMessageScreenshot | VersionChangelog | { createdBy: string };
}

export function VersionTimeline({ screenshots, changelog, versionInfo, isOpen, onClose, availableBranches = [] }: VersionTimelineProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "screenshot" | "changelog">("all");
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [branchFilter, setBranchFilter] = useState<string>("all");

  // 构建时间线事件
  const events: TimelineEvent[] = [
    {
      id: "version-created",
      type: "version" as const,
      title: "版本创建",
      description: `版本 ${versionInfo.version} 已创建`,
      timestamp: versionInfo.createdAt,
      data: { createdBy: versionInfo.createdBy },
    },
    ...changelog
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
      : [],
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
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as "all" | "screenshot" | "changelog")}
              className="text-sm border rounded-md px-2 py-1"
            >
              <option value="all">全部</option>
              <option value="screenshot">截图</option>
              <option value="changelog">变更摘要</option>
            </select>
          </div>
          {availableBranches.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">分支:</span>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="text-sm border rounded-md px-2 py-1"
              >
                <option value="all">全部分支</option>
                {availableBranches.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={exportToMarkdown}>
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
        </div>

        {/* 时间线 */}
        <div className="flex-1 overflow-y-auto py-4">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>暂无变更记录</p>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredEvents.map((event, index) => (
                <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* 连接线 */}
                  {index < filteredEvents.length - 1 && (
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
                    </div>

                    <p className="text-sm text-muted-foreground">{event.description}</p>

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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
