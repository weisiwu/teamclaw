"use client";

import { useState } from "react";
import { GitTag } from "@/lib/api/types";
import { Tag, Calendar, User, GitCommit, RotateCcw, FileText, Plus, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "./CopyButton";
import { Button } from "@/components/ui/button";

interface VersionTagsListItemProps {
  tag: GitTag;
  onClick: (tag: GitTag) => void;
  onRollbackClick?: (tag: GitTag) => void;
}

const statusConfig = {
  active: { label: "活跃", variant: "success" as const },
  archived: { label: "已归档", variant: "warning" as const },
  protected: { label: "保护", variant: "info" as const },
};

const commitTypeConfig: Record<string, { label: string; className: string; icon: string }> = {
  feat:    { label: "feat",  className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "✨" },
  fix:     { label: "fix",   className: "bg-red-100 text-red-700 border-red-200",           icon: "🐛" },
  docs:    { label: "docs",  className: "bg-blue-100 text-blue-700 border-blue-200",         icon: "📖" },
  style:   { label: "style", className: "bg-purple-100 text-purple-700 border-purple-200",   icon: "💄" },
  refactor:{ label: "ref",   className: "bg-orange-100 text-orange-700 border-orange-200",   icon: "♻️" },
  perf:    { label: "perf",  className: "bg-yellow-100 text-yellow-700 border-yellow-200",   icon: "⚡" },
  ci:      { label: "ci",    className: "bg-slate-100 text-slate-700 border-slate-200",     icon: "🔧" },
  test:    { label: "test",  className: "bg-pink-100 text-pink-700 border-pink-200",       icon: "🧪" },
  chore:   { label: "chore", className: "bg-gray-100 text-gray-600 border-gray-200",         icon: "🔩" },
};

function detectCommitType(subject: string): { label: string; className: string; icon: string } | null {
  const match = subject.match(/^(\w+)[\(:]/);
  if (!match) return null;
  const type = match[1].toLowerCase();
  return commitTypeConfig[type] || null;
}

// Parse changed files from commit subject
function parseChangedFiles(subject: string): string[] {
  const patterns = [
    /[\w.-]+\/[\w./-]+\.(ts|tsx|js|jsx|json|css|md|yaml|yml)/g,
    /\*\*[\w./-]+\*\*/g,
    /`[\w./-]+`/g,
  ];
  const files = new Set<string>();
  for (const p of patterns) {
    const matches = subject.match(p);
    if (matches) {
      for (const m of matches) {
        files.add(m.replace(/^\*\*|`|[\*]`$/g, ""));
      }
    }
  }
  return Array.from(files).slice(0, 3);
}

// Parse additions/deletions hints from subject
function parseChangeHints(subject: string): { added: number; removed: number } | null {
  const match = subject.match(/\+(\d+)\s+-(\d+)/);
  if (!match) return null;
  return { added: parseInt(match[1]), removed: parseInt(match[2]) };
}

export function VersionTagsListItem({ tag, onClick, onRollbackClick }: VersionTagsListItemProps) {
  const [hovered, setHovered] = useState(false);
  const status = statusConfig[tag.status];
  const commitType = detectCommitType(tag.subject);
  const date = new Date(tag.taggerDate).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const changedFiles = parseChangedFiles(tag.subject);
  const changeHints = parseChangeHints(tag.subject);

  return (
    <div
      className="group relative flex flex-col gap-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Main row */}
      <div
        className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all bg-white ${
          hovered ? "border-blue-200 shadow-sm rounded-b-none" : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
        }`}
        onClick={() => onClick(tag)}
      >
        {/* Tag icon + version */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Tag className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="font-mono font-semibold text-gray-900 text-sm">
              {tag.name}
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <Badge variant={status.variant} className="text-[10px]">
                {status.label}
              </Badge>
              {commitType && (
                <span
                  className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border font-mono font-medium ${commitType.className}`}
                  title={tag.subject}
                >
                  {commitType.icon} {commitType.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Commit message */}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-700 truncate" title={tag.subject}>
            {tag.subject}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <GitCommit className="w-3 h-3" />
              <span className="font-mono">{tag.commit}</span>
              <CopyButton text={tag.commit} size="sm" />
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {tag.author}
            </span>
          </div>
        </div>

        {/* Actions: rollback + date + copy tag */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {onRollbackClick && (
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              onClick={(e) => {
                e.stopPropagation();
                onRollbackClick(tag);
              }}
              title="快速回退到此版本"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              回退
            </Button>
          )}

          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-gray-500 justify-end">
              <Calendar className="w-3 h-3" />
              {date}
            </div>
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-xs font-mono text-blue-600">{tag.name}</span>
              <CopyButton text={tag.name} size="sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Hover preview panel */}
      {hovered && (
        <div className="border border-t-0 border-blue-200 rounded-b-xl bg-blue-50/60 px-4 py-3 space-y-2">
          <div className="flex items-center gap-4 text-xs text-gray-600">
            {/* Changed files preview */}
            {changedFiles.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <FileText className="w-3 h-3 text-gray-400" />
                {changedFiles.map((f, i) => (
                  <span key={i} className="font-mono text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                    {f}
                  </span>
                ))}
                <span className="text-gray-400">等文件</span>
              </div>
            )}

            {/* Change hints */}
            {changeHints && (
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-0.5 text-emerald-600">
                  <Plus className="w-3 h-3" />
                  {changeHints.added}
                </span>
                <span className="flex items-center gap-0.5 text-red-600">
                  <Minus className="w-3 h-3" />
                  {changeHints.removed}
                </span>
              </div>
            )}

            {/* Author email hint */}
            {tag.authorEmail && (
              <span className="text-gray-400 truncate max-w-[200px]" title={tag.authorEmail}>
                {tag.authorEmail}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
