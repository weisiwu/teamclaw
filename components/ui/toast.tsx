'use client';

import { toast as sonnerToast } from 'sonner';

// ============================================================================
// shadcn/ui Sonner Toast 包装层
// 保留 useToast API 签名，确保现有代码兼容
// ============================================================================

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

interface ToastOptions {
  description?: string;
  duration?: number;
}

// 保留原有 API 签名，内部委托给 sonner
const toastImpl = {
  success: (message: string, opts?: ToastOptions) =>
    sonnerToast.success(message, { description: opts?.description }),
  error: (message: string, opts?: ToastOptions) =>
    sonnerToast.error(message, { description: opts?.description }),
  info: (message: string, opts?: ToastOptions) =>
    sonnerToast(message, { description: opts?.description }),
  warning: (message: string, opts?: ToastOptions) =>
    sonnerToast.warning(message, { description: opts?.description }),
  loading: (message: string, opts?: ToastOptions) =>
    sonnerToast.loading(message, { description: opts?.description }),
};

// 保留原有 useToast Hook 签名（返回 toast/success/error/info 函数）
// 兼容现有所有调用 useToast() 的代码
export function useToast() {
  return toastImpl;
}

// 直接导出的 toast 函数（shadcn 风格）
export { sonnerToast as toast };
