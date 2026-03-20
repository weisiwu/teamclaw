"use client";

import { useState } from "react";
import { GitTag } from "@/lib/api/types";
import { Tag, Calendar, User, GitCommit, RotateCcw, FileText, Plus, Minus, CheckCircle2, XCircle, Loader2 } from "lucide-react";
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
  protected: { label: "已发布", variant: "info" as const },
};

const buildStatusConfig: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
  success: { icon: <CheckCircle2 className="w-3 h-3 text-emerald-500" />, label: "构建成功", className: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  failed:  { icon: <XCircle className="w-3 h-3 text-red-500" />, label: "构建失败", className: "text-red-600 bg-red-50 border-red-200" },
  building:{ icon: <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />, label: "构建中", className: "text-blue-600 bg-blue-50 border-blue-200" },
  pending: { icon: <Loader2 className="w-3 h-3 text-gray-400" />, label: "待构建", className: "text-gray-500 bg-gray-50 border-gray-200" },
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

const FILE_TYPE_STYLES: Record<string, { className: string; label: string }> = {
  component: {
    className: "bg-indigo-100 text-indigo-700 border-indigo-200",
    label: "组件",
  },
  api: {
    className: "bg-cyan-100 text-cyan-700 border-cyan-200",
    label: "API",
  },
  hook: {
    className: "bg-violet-100 text-violet-700 border-violet-200",
    label: "Hook",
  },
  config: {
    className: "bg-amber-100 text-amber-700 border-amber-200",
    label: "配置",
  },
  styles: {
    className: "bg-pink-100 text-pink-700 border-pink-200",
    label: "样式",
  },
  types: {
    className: "bg-teal-100 text-teal-700 border-teal-200",
    label: "类型",
  },
  docs: {
    className: "bg-sky-100 text-sky-700 border-sky-200",
    label: "文档",
  },
  test: {
    className: "bg-green-100 text-green-700 border-green-200",
    label: "测试",
  },
};

function getFileTypeStyle(file: string): { className: string; label: string } {
  const lower = file.toLowerCase();
  if (/\/(components?|ui|layout|versions?|tokens?|theme|branch|members|messages|team|agent-team|providers)\//.test(lower)) {
    return FILE_TYPE_STYLES.component;
  }
  if (/\/api\//.test(lower) || lower.includes("api")) {
    return FILE_TYPE_STYLES.api;
  }
  if (/\/hooks?\//.test(lower) || /use[A-Z]/.test(file)) {
    return FILE_TYPE_STYLES.hook;
  }
  if (/\.(json|yaml|yml|toml|config|env)/.test(lower) || lower.includes("config")) {
    return FILE_TYPE_STYLES.config;
  }
  if (/\.(css|scss|less|styl)/.test(lower)) {
    return FILE_TYPE_STYLES.styles;
  }
  if (/\.(d\.)?tsx?/.test(lower) && (lower.includes("types") || lower.includes("interface") || lower.includes("type "))) {
    return FILE_TYPE_STYLES.types;
  }
  if (/\.(md|mdx|txt)/.test(lower)) {
    return FILE_TYPE_STYLES.docs;
  }
  if (/[.\-_](test|spec|stories)\./.test(lower) || lower.includes("__tests__")) {
    return FILE_TYPE_STYLES.test;
  }
  return FILE_TYPE_STYLES.component;
}

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
          <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
            {/* Build status badge */}
            {tag.buildStatus && (
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${buildStatusConfig[tag.buildStatus]?.className || ""}`}>
                {buildStatusConfig[tag.buildStatus]?.icon || null}
                <span>{buildStatusConfig[tag.buildStatus]?.label || tag.buildStatus}</span>
              </div>
            )}

            {/* Changed files preview */}
            {changedFiles.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <FileText className="w-3 h-3 text-gray-400" />
                {changedFiles.map((f, i) => {
                  const ft = getFileTypeStyle(f);
                  return (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-0.5 font-mono text-xs px-1.5 py-0.5 rounded border ${ft.className}`}
                      title={`${ft.label}: ${f}`}
                    >
                      {f}
                    </span>
                  );
                })}
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
