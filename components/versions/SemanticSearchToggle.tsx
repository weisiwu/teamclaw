/**
 * SemanticSearchToggle Component
 * 搜索模式切换开关
 */
"use client";

import { Search, Sparkles } from "lucide-react";

interface SemanticSearchToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function SemanticSearchToggle({ enabled, onToggle }: SemanticSearchToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onToggle(!enabled)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
          enabled 
            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title={enabled ? '语义搜索已启用' : '启用语义搜索'}
      >
        {enabled ? (
          <>
            <Sparkles className="w-4 h-4" />
            <span>语义搜索</span>
          </>
        ) : (
          <>
            <Search className="w-4 h-4" />
            <span>关键词搜索</span>
          </>
        )}
      </button>
    </div>
  );
}

export default SemanticSearchToggle;
