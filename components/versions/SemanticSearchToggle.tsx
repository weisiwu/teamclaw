"use client";

import { Search } from "lucide-react";

interface SemanticSearchToggleProps {
  isSemanticSearch: boolean;
  onToggle: (enabled: boolean) => void;
}

export function SemanticSearchToggle({ isSemanticSearch, onToggle }: SemanticSearchToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onToggle(!isSemanticSearch)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
          isSemanticSearch
            ? "bg-purple-100 text-purple-700 border border-purple-300"
            : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
        }`}
        title={isSemanticSearch ? "语义搜索已开启" : "点击开启语义搜索"}
      >
        <Search className="w-4 h-4" />
        <span>语义搜索</span>
      </button>
    </div>
  );
}
