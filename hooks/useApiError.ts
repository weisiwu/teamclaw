"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/toast";
import { getFriendlyErrorMessage } from "@/lib/api-safe-fetch";
import type { ApiError } from "@/lib/api-safe-fetch";

export interface UseApiErrorOptions {
  /** 错误消息的持续时间（ms），0 = 不自动消失 */
  duration?: number;
  /** 是否在控制台输出原始错误（开发模式） */
  devMode?: boolean;
}

export interface UseApiErrorReturn {
  /** 当前错误 */
  error: ApiError | null;
  /** 错误状态 */
  hasError: boolean;
  /** 显示错误（自动从 ApiResult 中提取消息） */
  showError: (err: unknown, fallbackMsg?: string) => void;
  /** 显示友好消息错误 */
  showFriendlyError: (message: string) => void;
  /** 清除错误 */
  clearError: () => void;
}

/**
 * API 错误处理 Hook
 * 自动将 ApiError 转换为友好消息并通过 Toast 显示
 */
export function useApiError(options: UseApiErrorOptions = {}): UseApiErrorReturn {
  const { duration = 5000, devMode = process.env.NODE_ENV === "development" } = options;
  const { error: toastError } = useToast();
  const [error, setError] = useState<ApiError | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const showError = useCallback(
    (err: unknown, fallbackMsg = "请求失败，请稍后重试") => {
      let apiError: ApiError;
      let friendlyMsg: string;

      if (err && typeof err === "object" && "message" in err) {
        const e = err as Record<string, unknown>;
        apiError = {
          message: String(e.message || fallbackMsg),
          code: Number(e.code || 0),
          isNetworkError: Boolean(e.isNetworkError),
          isContentTypeError: Boolean(e.isContentTypeError),
        };
      } else if (err instanceof Error) {
        apiError = {
          message: err.message,
          code: 0,
          isNetworkError: err.message.includes("fetch"),
        };
      } else {
        apiError = { message: fallbackMsg, code: 0 };
      }

      friendlyMsg = getFriendlyErrorMessage(apiError);
      setError(apiError);
      toastError(friendlyMsg);

      if (devMode) {
        console.error("[useApiError] API Error:", apiError, err);
      }
    },
    [toastError, devMode]
  );

  const showFriendlyError = useCallback(
    (message: string) => {
      const apiError: ApiError = { message, code: 0 };
      setError(apiError);
      toastError(message);
    },
    [toastError]
  );

  return { error, hasError: error !== null, showError, showFriendlyError, clearError };
}
