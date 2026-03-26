"use client";

import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            页面出现了一些问题
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">
            {this.state.error?.message || "发生了未知错误，请尝试重新加载页面"}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回上一页
            </button>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              重新加载页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 错误展示内联组件（受 ErrorBoundary 管理的子组件可用）
 * 轻量级错误展示，适用于卡片/列表中的错误状态
 */
export function ErrorInline({ message }: { message: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
      <AlertTriangle className="w-3 h-3" />
      {message}
    </span>
  );
}
