/**
 * VersionChangeLogPanel Component
 * 变更记录面板 - 展示版本关联的消息截图和变更摘要
 */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, RefreshCw, Image as ImageIcon, FileText, CheckCircle, XCircle } from "lucide-react";
import { ChangeTimeline } from "./ChangeTimeline";
import { ScreenshotGallery } from "./ScreenshotGallery";
import { MessageSelector, MessageItem } from "./MessageSelector";
import {
  VersionChangelog,
  VersionMessageScreenshot,
  LinkScreenshotRequest,
} from "@/lib/api/types";
import {
  getVersionChangelog,
  getVersionScreenshots,
  linkScreenshot,
  generateChangelog,
  unlinkScreenshot,
  useAddTimelineEvent,
} from "@/lib/api/versions";

interface ChangeLogPanelProps {
  versionId: string;
  versionCreatedAt?: string;
}

export function VersionChangeLogPanel({
  versionId,
  versionCreatedAt,
}: ChangeLogPanelProps) {
  const [activeSection, setActiveSection] = useState<"timeline" | "screenshots">(
    "timeline"
  );
  const [changelog, setChangelog] = useState<VersionChangelog | null>(null);
  const [screenshots, setScreenshots] = useState<VersionMessageScreenshot[]>([]);
  const [loadingChangelog, setLoadingChangelog] = useState(false);
  const [loadingScreenshots, setLoadingScreenshots] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [messageSelectorOpen, setMessageSelectorOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastVisible, setToastVisible] = useState(false);
  const addNoteMutation = useAddTimelineEvent();

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

  const loadChangelog = async () => {
    setLoadingChangelog(true);
    try {
      const data = await getVersionChangelog(versionId);
      setChangelog(data?.data || null);
    } catch (e) {
      console.error("Failed to load changelog:", e);
    } finally {
      setLoadingChangelog(false);
    }
  };

  const loadScreenshots = async () => {
    setLoadingScreenshots(true);
    try {
      const data = await getVersionScreenshots(versionId);
      setScreenshots(data?.data || []);
    } catch (e) {
      console.error("Failed to load screenshots:", e);
    } finally {
      setLoadingScreenshots(false);
    }
  };

  const handleGenerateChangelog = async () => {
    setGenerating(true);
    try {
      await generateChangelog({ versionId });
      await loadChangelog();
    } catch (e) {
      console.error("Failed to generate changelog:", e);
    } finally {
      setGenerating(false);
    }
  };

  const handleLinkScreenshot = async () => {
    setMessageSelectorOpen(true);
  };

  const handleMessageSelected = async (message: MessageItem) => {
    setLinkLoading(true);
    try {
      // 构建截图请求：消息内容作为关联说明，截图 URL 由后端从飞书消息获取
      const req: LinkScreenshotRequest = {
        messageId: message.id,
        messageContent: message.content,
        senderName: message.senderName,
        senderAvatar: message.senderAvatar,
        // screenshotUrl 由后端通过飞书 API 获取，此处传 messageId 供后端查询
        screenshotUrl: `feishu://message/${message.id}/screenshot`,
        thumbnailUrl: message.senderAvatar,
      };
      await linkScreenshot(versionId, req);
      await loadScreenshots();
      setMessageSelectorOpen(false);
      showToast("截图关联成功");
    } catch (e) {
      console.error("Failed to link screenshot:", e);
      showToast("关联截图失败，请重试", "error");
    } finally {
      setLinkLoading(false);
    }
  };

  const handleUnlinkScreenshot = async (screenshotId: string) => {
    try {
      await unlinkScreenshot(screenshotId);
      await loadScreenshots();
      showToast("截图已解除关联");
    } catch (e) {
      console.error("Failed to unlink screenshot:", e);
      showToast("解除关联失败，请重试", "error");
    }
  };

  // Initial load
  if (changelog === null && !loadingChangelog) {
    loadChangelog();
  }
  if (screenshots.length === 0 && !loadingScreenshots && activeSection === "screenshots") {
    loadScreenshots();
  }

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 border-b w-full">
          <button
            onClick={() => {
              setActiveSection("timeline");
              if (changelog === null) loadChangelog();
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSection === "timeline"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-4 w-4" />
            变更摘要
          </button>
          <button
            onClick={() => {
              setActiveSection("screenshots");
              if (screenshots.length === 0) loadScreenshots();
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSection === "screenshots"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            消息截图
            {screenshots.length > 0 && (
              <Badge variant="default" className="ml-1">
                {screenshots.length}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* Timeline section */}
      {activeSection === "timeline" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">版本变更摘要</h3>
              {loadingChangelog && <Loader2 className="h-4 w-4 animate-spin" />}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-6 px-2"
                onClick={() => setNoteDialogOpen(!noteDialogOpen)}
              >
                <Plus className="h-3 w-3 mr-1" />
                添加备注
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadChangelog}
                disabled={loadingChangelog}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                刷新
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleGenerateChangelog}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                {changelog ? "重新生成" : "生成摘要"}
              </Button>
            </div>
          </div>

          {noteDialogOpen && (
            <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
              <textarea
                className="w-full text-sm border rounded-md p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                rows={3}
                placeholder="输入备注内容..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setNoteDialogOpen(false); setNoteText(""); }}
                >
                  取消
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  disabled={!noteText.trim() || addNoteMutation.isPending}
                  onClick={async () => {
                    try {
                      await addNoteMutation.mutateAsync({
                        versionId,
                        data: { note: noteText.trim() },
                      });
                      setNoteText("");
                      setNoteDialogOpen(false);
                      await loadChangelog();
                    } catch (e) {
                      console.error("Failed to add note:", e);
                    }
                  }}
                >
                  {addNoteMutation.isPending ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : null}
                  保存备注
                </Button>
              </div>
            </div>
          )}

          {changelog ? (
            <ChangeTimeline
              changelog={changelog}
              screenshots={screenshots}
              versionCreatedAt={versionCreatedAt}
            />
          ) : (
            !loadingChangelog && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">暂无变更摘要</p>
                <p className="text-xs mt-1">
                  点击「生成摘要」从 Git 提交记录生成
                </p>
              </div>
            )
          )}
        </div>
      )}

      {/* Screenshots section */}
      {activeSection === "screenshots" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">关联消息截图</h3>
              {loadingScreenshots && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleLinkScreenshot}
              disabled={linkLoading}
            >
              {linkLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              添加截图
            </Button>
          </div>

          {screenshots.length > 0 ? (
            <ScreenshotGallery
              screenshots={screenshots}
              onUnlink={handleUnlinkScreenshot}
              onLink={loadScreenshots}
              loading={loadingScreenshots}
            />
          ) : (
            !loadingScreenshots && (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">暂无关联截图</p>
                <p className="text-xs mt-1">点击「添加截图」关联消息记录</p>
              </div>
            )
          )}
        </div>
      )}

      {/* 消息选择器 Dialog */}
      <MessageSelector
        open={messageSelectorOpen}
        onOpenChange={setMessageSelectorOpen}
        onSelect={handleMessageSelected}
      />

      {/* Toast 通知 */}
      {toastVisible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm text-white ${
              toastType === "success" ? "bg-gray-900" : "bg-red-600"
            }`}
          >
            {toastType === "success" ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <XCircle className="w-4 h-4 text-white" />
            )}
            <span>{toastMsg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
