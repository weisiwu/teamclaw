"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("[Error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 p-5 rounded-full bg-red-50 dark:bg-red-900/20">
        <AlertTriangle className="w-12 h-12 text-red-500" />
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        出现了一些问题
      </h2>
      
      <p className="text-gray-500 dark:text-gray-400 mb-2 max-w-md">
        {error.message || "发生了未知错误，请稍后重试。"}
      </p>
      
      {error.digest && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-6 font-mono">
          错误码: {error.digest}
        </p>
      )}
      
      <div className="flex gap-3">
        <Button
          onClick={reset}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          重试
        </Button>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <Home className="w-4 h-4" />
            返回首页
          </Button>
        </Link>
      </div>
    </div>
  );
}
