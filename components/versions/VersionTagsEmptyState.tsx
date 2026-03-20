"use client";

import { Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VersionTagsEmptyStateProps {
  hasSearch?: boolean;
  onClear?: () => void;
}

export function VersionTagsEmptyState({ hasSearch, onClear }: VersionTagsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      <Tag className="w-12 h-12 mb-4 text-gray-300" />
      <p className="text-lg font-medium">
        {hasSearch ? "未找到匹配的版本" : "暂无版本标签"}
      </p>
      <p className="text-sm mt-1 text-gray-400">
        {hasSearch
          ? "尝试更换搜索关键词"
          : "创建版本后会生成对应的 Git Tag"}
      </p>
      {onClear && hasSearch && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-4 gap-1.5 text-gray-400 hover:text-gray-600"
          onClick={onClear}
        >
          <X className="w-3.5 h-3.5" />
          清除筛选
        </Button>
      )}
    </div>
  );
}
