"use client";

import { GitTag } from "@/lib/api/types";
import { X, Tag, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface VersionTagsDetailDrawerProps {
  tag: GitTag | null;
  onClose: () => void;
}

const statusConfig = {
  active: { label: "活跃", variant: "success" as const },
  archived: { label: "已归档", variant: "warning" as const },
  protected: { label: "保护", variant: "info" as const },
};

export function VersionTagsDetailDrawer({ tag, onClose }: VersionTagsDetailDrawerProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!tag) return null;

  const status = statusConfig[tag.status];
  const date = new Date(tag.taggerDate).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">版本详情</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Tag name + status */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-bold text-gray-900">
              {tag.name}
            </span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>

          {/* Version */}
          <DetailItem
            label="版本号"
            value={tag.version}
            copyValue={tag.version}
            onCopy={handleCopy}
            copied={copiedField === "version"}
          />

          {/* Commit hash */}
          <DetailItem
            label="Commit Hash"
            value={tag.commitHash}
            copyValue={tag.commitHash}
            onCopy={handleCopy}
            copied={copiedField === "commitHash"}
            isMonospace
          />

          {/* Short commit */}
          <DetailItem
            label="Short Hash"
            value={tag.commit}
            copyValue={tag.commit}
            onCopy={handleCopy}
            copied={copiedField === "commit"}
            isMonospace
          />

          {/* Commit message */}
          <DetailItem
            label="提交信息"
            value={tag.subject}
          />

          {/* Author */}
          <DetailItem
            label="作者"
            value={tag.author}
          />

          {/* Email */}
          <DetailItem
            label="邮箱"
            value={tag.authorEmail}
          />

          {/* Date */}
          <DetailItem
            label="创建时间"
            value={date}
          />

          {/* Project */}
          <DetailItem
            label="项目"
            value={tag.projectName}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => handleCopy(tag.commitHash, "commitHash")}
          >
            {copiedField === "commitHash" ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                已复制
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                复制 Commit Hash
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

function DetailItem({
  label,
  value,
  copyValue,
  onCopy,
  copied,
  isMonospace,
}: {
  label: string;
  value: string;
  copyValue?: string;
  onCopy?: (text: string, field: string) => void;
  copied?: boolean;
  isMonospace?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-1.5">{label}</div>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-sm text-gray-700",
            isMonospace && "font-mono text-gray-800"
          )}
        >
          {value}
        </span>
        {copyValue && onCopy && (
          <button
            onClick={() => onCopy(copyValue, label.toLowerCase().replace(/\s/g, ""))}
            className={cn(
              "p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            )}
            title="复制"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
