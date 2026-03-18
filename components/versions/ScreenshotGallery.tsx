"use client";

import { useState } from "react";
import { Trash2, ExternalLink, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VersionMessageScreenshot } from "@/lib/api/types";

interface ScreenshotGalleryProps {
  screenshots: VersionMessageScreenshot[];
  onUnlink?: (screenshotId: string) => void;
  loading?: boolean;
}

export function ScreenshotGallery({ screenshots, onUnlink, loading }: ScreenshotGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-sm font-medium mb-2">消息截图</div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="aspect-video rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (screenshots.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-sm font-medium mb-2">消息截图</div>
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">暂无关联截图</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium mb-2">消息截图 ({screenshots.length})</div>
      <div className="grid grid-cols-2 gap-3">
        {screenshots.map((screenshot) => (
          <div
            key={screenshot.id}
            className="group relative aspect-video rounded-lg border overflow-hidden bg-muted cursor-pointer"
            onClick={() => setSelectedImage(screenshot.screenshotUrl)}
          >
            {/* 缩略图占位符 */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <ImageIcon className="h-8 w-8 text-primary/40" />
            </div>

            {/* 悬停覆盖层 */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(screenshot.screenshotUrl);
                }}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                查看
              </Button>
              {onUnlink && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnlink(screenshot.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除
                </Button>
              )}
            </div>

            {/* 消息内容 */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
              <p className="text-xs text-white line-clamp-2">
                {screenshot.messageContent}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-white/70">{screenshot.senderName}</span>
                <span className="text-xs text-white/50">
                  {new Date(screenshot.createdAt).toLocaleDateString("zh-CN")}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 图片预览对话框 */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>截图预览</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[400px] bg-muted rounded-lg">
            {selectedImage && (
              <div className="text-center">
                <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">截图预览</p>
                <p className="text-xs text-muted-foreground mt-2">{selectedImage}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
