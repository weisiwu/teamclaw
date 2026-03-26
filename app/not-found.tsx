"use client";

import { Button } from "@/components/ui/button";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-6">
        <span className="text-8xl font-bold text-gray-200 dark:text-gray-700 select-none">
          404
        </span>
      </div>
      
      <div className="mb-4 p-4 rounded-full bg-gray-100 dark:bg-slate-800">
        <FileQuestion className="w-10 h-10 text-gray-400 dark:text-gray-500" />
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        页面不存在
      </h2>
      
      <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
        您访问的页面可能已被删除或地址有误，请检查链接是否正确。
      </p>
      
      <div className="flex gap-3">
        <Link href="/tasks">
          <Button className="gap-2">
            <Home className="w-4 h-4" />
            返回任务
          </Button>
        </Link>
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回上一页
        </Button>
      </div>
    </div>
  );
}
