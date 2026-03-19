"use client";

import { useState, useMemo } from "react";
import { GitTag } from "@/lib/api/types";
import { useTags } from "@/lib/api/tags";
import { Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VersionTagsSearchBar } from "./VersionTagsSearchBar";
import { VersionSortToggle } from "./VersionSortToggle";
import { VersionTagsListItem } from "./VersionTagsListItem";
import { VersionTagsDetailDrawer } from "./VersionTagsDetailDrawer";
import { VersionTagsEmptyState } from "./VersionTagsEmptyState";
import { VersionTagsSkeleton } from "./VersionTagsSkeleton";
import { CopyToast } from "./CopyToast";

type SortOrder = "asc" | "desc";

export function VersionTagsPanel() {
  const { data, isLoading, isError } = useTags();
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedTag, setSelectedTag] = useState<GitTag | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const tags = useMemo(() => data?.data || [], [data]);

  const filteredAndSortedTags = useMemo(() => {
    let result = [...tags];

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (tag) =>
          tag.name.toLowerCase().includes(query) ||
          tag.author.toLowerCase().includes(query) ||
          tag.subject.toLowerCase().includes(query) ||
          tag.commit.toLowerCase().includes(query) ||
          tag.commitHash.toLowerCase().includes(query) ||
          tag.version.toLowerCase().includes(query)
      );
    }

    // Sort by taggerDate
    result.sort((a, b) => {
      const dateA = new Date(a.taggerDate).getTime();
      const dateB = new Date(b.taggerDate).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [tags, search, sortOrder]);

  const handleTagClick = (tag: GitTag) => {
    setSelectedTag(tag);
  };

  const handleCloseDrawer = () => {
    setSelectedTag(null);
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <p className="text-lg font-medium">加载失败</p>
        <p className="text-sm mt-1 text-gray-400">请稍后重试</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-3 mb-4">
          <Tag className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">版本标签</h2>
          {!isLoading && (
            <Badge variant="default">
              {filteredAndSortedTags.length} 个标签
            </Badge>
          )}
        </div>

        {/* Search + Sort */}
        <div className="flex items-center gap-3 flex-wrap">
          <VersionTagsSearchBar
            value={search}
            onChange={setSearch}
            className="flex-1 min-w-[240px]"
          />
          <VersionSortToggle order={sortOrder} onChange={setSortOrder} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <VersionTagsSkeleton />
        ) : filteredAndSortedTags.length === 0 ? (
          <VersionTagsEmptyState hasSearch={!!search.trim()} />
        ) : (
          <div className="space-y-3">
            {filteredAndSortedTags.map((tag) => (
              <VersionTagsListItem
                key={tag.name}
                tag={tag}
                onClick={handleTagClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <VersionTagsDetailDrawer
        tag={selectedTag}
        onClose={handleCloseDrawer}
      />

      {/* Toast */}
      <CopyToast
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
        message="已复制到剪贴板"
      />
    </div>
  );
}
