"use client";

import { useState, useMemo } from "react";
import { GitTag, Version } from "@/lib/api/types";
import { useTags } from "@/lib/api/tags";
import { Tag, Zap, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VersionTagsSearchBar } from "./VersionTagsSearchBar";
import { VersionSortToggle } from "./VersionSortToggle";
import { VersionTagsListItem } from "./VersionTagsListItem";
import { VersionTagsDetailDrawer } from "./VersionTagsDetailDrawer";
import { VersionTagsEmptyState } from "./VersionTagsEmptyState";
import { VersionTagsSkeleton } from "./VersionTagsSkeleton";
import { CopyToast } from "./CopyToast";
import { RollbackDialog } from "./RollbackDialog";
import { TaskBumpPanel } from "./TaskBumpPanel";
import { VersionStatsOverview } from "./VersionStatsOverview";

type SortOrder = "asc" | "desc";
type SortType = "date" | "semver";
type StatusFilter = "all" | "active" | "protected" | "archived";

const NOW = new Date();
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function getTimeGroup(tag: GitTag): "week" | "month" | "older" {
  const tagTime = new Date(tag.taggerDate).getTime();
  const diff = NOW.getTime() - tagTime;
  if (diff < WEEK_MS) return "week";
  if (diff < MONTH_MS) return "month";
  return "older";
}

const TIME_GROUP_LABEL: Record<string, string> = {
  week: "本周",
  month: "本月",
  older: "更早",
};

function semverCompare(a: GitTag, b: GitTag, desc: boolean): number {
  const parse = (v: string) =>
    (v || "")
      .replace(/^v/, "")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  const va = parse(a.version || a.name);
  const vb = parse(b.version || b.name);
  const len = Math.max(va.length, vb.length);
  for (let i = 0; i < len; i++) {
    const da = va[i] ?? 0;
    const db = vb[i] ?? 0;
    if (da !== db) return desc ? db - da : da - db;
  }
  return 0;
}

export function VersionTagsPanel() {
  const { data, isLoading, isError } = useTags();
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [sortType, setSortType] = useState<SortType>("date");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedTag, setSelectedTag] = useState<GitTag | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [rollbackVersion, setRollbackVersion] = useState<Version | null>(null);
  const [bumpExpanded, setBumpExpanded] = useState(false);
  const [bumpTaskId, setBumpTaskId] = useState<string>("");
  const [bumpVersionId, setBumpVersionId] = useState<string>("");

  const tags = useMemo(() => data?.data || [], [data]);

  const filteredAndSortedTags = useMemo(() => {
    let result = [...tags];

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((tag) => tag.status === statusFilter);
    }

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

    // Sort
    result.sort((a, b) => {
      if (sortType === "semver") {
        return semverCompare(a, b, sortOrder === "desc");
      }
      const dateA = new Date(a.taggerDate).getTime();
      const dateB = new Date(b.taggerDate).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [tags, search, sortOrder, sortType, statusFilter]);

  // Group by time
  const groupedTags = useMemo(() => {
    const groups: Record<string, GitTag[]> = {
      week: [],
      month: [],
      older: [],
    };
    for (const tag of filteredAndSortedTags) {
      groups[getTimeGroup(tag)].push(tag);
    }
    return groups;
  }, [filteredAndSortedTags]);

  const handleTagClick = (tag: GitTag) => {
    setSelectedTag(tag);
  };

  const handleRollbackClick = (tag: GitTag) => {
    const versionLike: Version = {
      id: tag.commitHash || tag.commit || tag.name,
      version: tag.version || tag.name,
      title: tag.subject || tag.name,
      description: "",
      status: (tag.status === "active" ? "published" : tag.status) as Version["status"],
      releasedAt: tag.taggerDate,
      createdAt: tag.taggerDate,
      changedFiles: [],
      commitCount: 0,
      isMain: false,
      buildStatus: "idle" as Version["buildStatus"],
      artifactUrl: null,
      tags: [],
      gitTag: tag.name,
    };
    setRollbackVersion(versionLike);
    setRollbackDialogOpen(true);
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

  const renderTagList = (tagList: GitTag[]) => (
    <div className="space-y-3">
      {tagList.map((tag) => (
        <VersionTagsListItem
          key={tag.name}
          tag={tag}
          onClick={handleTagClick}
          onRollbackClick={handleRollbackClick}
        />
      ))}
    </div>
  );

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

        {/* Stats overview + Search + Sort row */}
        <div className="flex flex-col gap-3">
          {/* Stats filter */}
          {!isLoading && (
            <VersionStatsOverview
              tags={tags}
              activeFilter={statusFilter}
              onFilterChange={(f) => setStatusFilter(f as StatusFilter)}
            />
          )}

          {/* Search + Sort */}
          <div className="flex items-center gap-3 flex-wrap">
            <VersionTagsSearchBar
              value={search}
              onChange={setSearch}
              className="flex-1 min-w-[240px]"
            />
            <VersionSortToggle
              order={sortOrder}
              onChange={setSortOrder}
              sortType={sortType}
              onSortTypeChange={setSortType}
            />
            <Button
              size="sm"
              variant={bumpExpanded ? "default" : "outline"}
              className="gap-1.5"
              onClick={() => setBumpExpanded((v) => !v)}
            >
              <Zap className="w-3.5 h-3.5" />
              快速升级
            </Button>
          </div>
        </div>

        {/* Auto-Bump expanded section */}
        {bumpExpanded && (
          <div className="mt-3 p-4 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-sm text-amber-700 mb-3">
              输入任务 ID 和版本 ID，触发版本自动升级
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="任务 ID (task_xxx)"
                value={bumpTaskId}
                onChange={(e) => setBumpTaskId(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border rounded-md"
              />
              <input
                type="text"
                placeholder="版本 ID (v_xxx)"
                value={bumpVersionId}
                onChange={(e) => setBumpVersionId(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border rounded-md"
              />
            </div>
            {bumpTaskId && bumpVersionId && (
              <TaskBumpPanel
                taskId={bumpTaskId}
                versionId={bumpVersionId}
                currentVersion={tags.find((t) => t.name.includes("."))?.version}
              />
            )}
            {(!bumpTaskId || !bumpVersionId) && (
              <p className="text-xs text-amber-500">
                请在上方输入任务 ID 和版本 ID
              </p>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <VersionTagsSkeleton />
        ) : filteredAndSortedTags.length === 0 ? (
          <VersionTagsEmptyState hasSearch={!!search.trim()} />
        ) : (
          <div className="space-y-6">
            {/* Time-grouped rendering */}
            {(["week", "month", "older"] as const).map((group) => {
              const groupTags = groupedTags[group];
              if (groupTags.length === 0) return null;
              return (
                <div key={group}>
                  {/* Group header */}
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-600">
                      {TIME_GROUP_LABEL[group]}
                    </span>
                    <Badge variant="default" className="text-xs">
                      {groupTags.length}
                    </Badge>
                  </div>
                  {renderTagList(groupTags)}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <VersionTagsDetailDrawer tag={selectedTag} onClose={handleCloseDrawer} />

      {/* Rollback Dialog */}
      {rollbackVersion && (
        <RollbackDialog
          version={rollbackVersion}
          open={rollbackDialogOpen}
          onOpenChange={(open) => {
            setRollbackDialogOpen(open);
            if (!open) setRollbackVersion(null);
          }}
          onRollbackComplete={() => {}}
        />
      )}

      {/* Toast */}
      <CopyToast
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
        message="已复制到剪贴板"
      />
    </div>
  );
}
