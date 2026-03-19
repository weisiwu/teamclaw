/**
 * Branches Page — 分支管理页面
 * 展示分支列表，支持创建、删除、设置主分支、保护、重命名等操作
 */
"use client";

import { BranchManager } from "@/components/versions/BranchManager";

export default function BranchesPage() {
  return (
    <div className="h-[calc(100vh-64px)]">
      <BranchManager />
    </div>
  );
}
