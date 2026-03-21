"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Trash2, Image as ImageIcon, Plus, ZoomIn, X, ChevronLeft, ChevronRight, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { VersionMessageScreenshot } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface ScreenshotGalleryProps {
  screenshots: VersionMessageScreenshot[];
  onUnlink?: (screenshotId: string) => void;
  onLink?: () => void;
  loading?: boolean;
}

export function ScreenshotGallery({ screenshots, onUnlink, onLink, loading }: ScreenshotGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [lightboxImageLoading, setLightboxImageLoading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  
  // Toast 状态
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // 显示 Toast
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  };

  // 包装回调函数，添加 toast 通知
  const handleUnlink = (screenshotId: string) => {
    try {
      onUnlink?.(screenshotId);
      showToast("截图已解除关联", "success");
    } catch {
      showToast("解除关联失败，请重试", "error");
    }
  };

  const handleLink = () => {
    try {
      onLink?.();
      showToast("打开消息选择器", "success");
    } catch {
      showToast("操作失败，请重试", "error");
    }
  };

  const handleImageError = (id: string) => {
    setImageErrors(prev => new Set(prev).add(id));
  };

  const openLightbox = (screenshot: VersionMessageScreenshot, index: number) => {
    setSelectedImage(screenshot.screenshotUrl);
    setSelectedIndex(index);
    setLightboxImageLoading(true);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
    setLightboxImageLoading(false);
  };

  const navigateImage = useCallback((direction: "prev" | "next") => {
    setLightboxImageLoading(true);
    const newIndex = direction === "prev"
      ? (selectedIndex - 1 + screenshots.length) % screenshots.length
      : (selectedIndex + 1) % screenshots.length;
    setSelectedIndex(newIndex);
    setSelectedImage(screenshots[newIndex].screenshotUrl);
  }, [selectedIndex, screenshots]);

  // 键盘导航支持
  useEffect(() => {
    if (!selectedImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          closeLightbox();
          break;
        case "ArrowLeft":
          if (screenshots.length > 1) navigateImage("prev");
          break;
        case "ArrowRight":
          if (screenshots.length > 1) navigateImage("next");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage, screenshots.length, navigateImage]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">消息截图</div>
          {onLink && (
            <Button variant="outline" size="sm" disabled>
              <Plus className="h-4 w-4 mr-1" />
              关联截图
            </Button>
          )}
        </div>
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
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">消息截图</div>
          {onLink && (
            <Button variant="outline" size="sm" onClick={handleLink}>
              <Plus className="h-4 w-4 mr-1" />
              关联截图
            </Button>
          )}
        </div>
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">暂无关联截图</p>
          {onLink && (
            <Button variant="outline" size="sm" className="mt-3" onClick={handleLink}>
              <Plus className="h-4 w-4 mr-1" />
              关联截图
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">消息截图 ({screenshots.length})</div>
        {onLink && (
          <Button variant="outline" size="sm" onClick={handleLink}>
            <Plus className="h-4 w-4 mr-1" />
            关联截图
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {screenshots.map((screenshot, index) => {
          const hasError = imageErrors.has(screenshot.id);
          const imageUrl = screenshot.thumbnailUrl || screenshot.screenshotUrl;

          return (
            <div
              key={screenshot.id}
              className="group relative aspect-video rounded-lg border overflow-hidden bg-muted cursor-pointer"
              onClick={() => openLightbox(screenshot, index)}
            >
              {/* 真实图片或占位符 */}
              {!hasError && imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={`截图 ${index + 1}`}
                  fill
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                  onError={() => handleImageError(screenshot.id)}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                  <ImageIcon className="h-8 w-8 text-primary/40" />
                </div>
              )}

              {/* 分支标签 */}
              {screenshot.branchName && (
                <div className="absolute top-2 left-2">
                  <Badge variant="default" className="text-xs backdrop-blur-sm bg-black/50 text-white border-0">
                    {screenshot.branchName}
                  </Badge>
                </div>
              )}

              {/* 悬停覆盖层 */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openLightbox(screenshot, index);
                  }}
                  className="bg-white"
                >
                  <ZoomIn className="h-4 w-4 mr-1" />
                  查看
                </Button>
                {onUnlink && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDeleteId(screenshot.id);
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
          );
        })}
      </div>

      {/* 图片预览对话框 (Lightbox) */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent title="截图预览" className="max-w-5xl p-0 overflow-hidden">
          <div className="relative bg-black flex items-center justify-center min-h-[500px]">
            {/* 导航按钮 */}
            {screenshots.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage("prev");
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage("next");
                  }}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* 图片加载指示器 */}
            {lightboxImageLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Loader2 className="h-10 w-10 animate-spin text-white/70" />
              </div>
            )}

            {/* 图片 */}
            {selectedImage && (
              <Image
                src={selectedImage}
                alt="截图预览"
                width={1200}
                height={800}
                className="max-w-full max-h-[80vh] object-contain"
                style={{ visibility: lightboxImageLoading ? "hidden" : "visible" }}
                onLoad={() => setLightboxImageLoading(false)}
                onError={() => setLightboxImageLoading(false)}
                placeholder="blur"
                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
              />
            )}

            {/* 图片信息 */}
            {screenshots[selectedIndex] && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-between text-white">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {screenshots[selectedIndex].senderName}
                    </p>
                    <p className="text-xs text-white/70 line-clamp-2">
                      {screenshots[selectedIndex].messageContent}
                    </p>
                    {screenshots[selectedIndex].branchName && (
                      <Badge variant="default" className="mt-1 bg-white/20 text-white border-0">
                        {screenshots[selectedIndex].branchName}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/70">
                      {selectedIndex + 1} / {screenshots.length}
                    </p>
                    <p className="text-xs text-white/50">
                      {new Date(screenshots[selectedIndex].createdAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 关闭按钮 */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={closeLightbox}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* 键盘快捷键提示 */}
            {screenshots.length > 1 && (
              <div className="absolute top-4 left-4 text-xs text-white/40 flex gap-3">
                <span>← → 切换</span>
                <span>Esc 关闭</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={!!pendingDeleteId} onOpenChange={() => setPendingDeleteId(null)}>
        <DialogContent title="确认删除截图">
          <p className="text-sm text-muted-foreground">
            确定要解除关联此截图吗？此操作不会删除消息记录。
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setPendingDeleteId(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingDeleteId) {
                  handleUnlink(pendingDeleteId);
                }
                setPendingDeleteId(null);
              }}
            >
              确认删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast 通知 */}
      {toastVisible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm",
              toastType === "success" ? "bg-gray-900 text-white" : "bg-red-600 text-white"
            )}
          >
            {toastType === "success" ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white" />
            )}
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
