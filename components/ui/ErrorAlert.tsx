"use client";

import React, { useState } from "react";
import { AlertCircle, RefreshCw, X } from "lucide-react";
import { getFriendlyErrorMessage } from "@/lib/api-safe-fetch";

export interface ErrorAlertProps {
  /** 错误信息（ApiError 对象或字符串） */
  error?: unknown;
  /** 自定义友好消息（优先使用） */
  message?: string;
  /** 是否显示重试按钮 */
  showRetry?: boolean;
  /** 重试回调 */
  onRetry?: () => void;
  /** 是否可关闭 */
  dismissible?: boolean;
  /** 关闭回调 */
  onDismiss?: () => void;
  /** 额外的 CSS class */
  className?: string;
}

/**
 * 统一错误提示组件
 * 展示友好的中文错误信息，而非原始 JSON/HTML 错误
 */
export function ErrorAlert({
  error,
  message,
  showRetry = true,
  onRetry,
  dismissible = false,
  onDismiss,
  className = "",
}: ErrorAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // 从 ApiError 或 error 对象中提取友好消息
  const friendlyMessage = message || getFriendlyMessage(error);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 ${className}`}
      role="alert"
    >
      <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-800 dark:text-red-200">{friendlyMessage}</p>
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            重试
          </button>
        )}
      </div>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
          aria-label="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Inline 错误提示（更紧凑，适合表格行内）
 */
export function InlineError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
      <AlertCircle className="w-3 h-3" />
      {getFriendlyMessage(error)}
      {onRetry && (
        <button onClick={onRetry} className="hover:underline ml-1">
          重试
        </button>
      )}
    </span>
  );
}

/** 从各种错误格式中提取友好消息 */
function getFriendlyMessage(error: unknown): string {
  if (!error) return "发生未知错误，请稍后重试";

  if (typeof error === "string") return error;

  // ApiError 格式
  const e = error as Record<string, unknown>;
  if (e.message && typeof e.message === "string") {
    return getFriendlyErrorMessage({
      message: e.message,
      code: e.code as number,
      isNetworkError: e.isNetworkError as boolean,
      isContentTypeError: e.isContentTypeError as boolean,
    } as Parameters<typeof getFriendlyErrorMessage>[0]);
  }

  // Error 实例
  if (error instanceof Error) {
    if (error.message.includes("fetch") || error.message.includes("network"))
      return "网络连接失败，请检查网络或稍后重试";
    return error.message;
  }

  return "发生未知错误，请稍后重试";
}
