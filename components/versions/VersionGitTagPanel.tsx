"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Tag, GitBranch, Clock, RefreshCw, Plus, Copy, Check } from "lucide-react";
import { Version } from "@/lib/api/types";

interface VersionGitTagPanelProps {
  version: Version;
  onRefresh: (v: Version) => void;
}

const API_BASE = "/api/v1";

export function VersionGitTagPanel({ version, onRefresh }: VersionGitTagPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const hasTag = !!version.gitTag;

  const handleCreateTag = async () => {
    setIsCreating(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/versions/${version.id}/create-tag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.code === 200 || json.code === 0) {
        setMessage({ type: "success", text: `Tag "${json.data?.tagName}" 创建成功` });
        // Refresh parent
        const refreshed = await fetch(`${API_BASE}/versions/${version.id}`).then(r => r.json());
        if (refreshed.data) onRefresh(refreshed.data);
      } else {
        setMessage({ type: "error", text: json.message || "创建失败" });
      }
    } catch {
      setMessage({ type: "error", text: "请求失败" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRegenerateTag = async () => {
    if (!version.gitTag) return;
    setIsRegenerating(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/versions/${version.id}/git-tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagName: version.gitTag, message: `Release ${version.version} - ${version.title || ""}` }),
      });
      const json = await res.json();
      if (json.code === 200 || json.code === 0) {
        setMessage({ type: "success", text: "Tag 重新生成成功" });
        const refreshed = await fetch(`${API_BASE}/versions/${version.id}`).then(r => r.json());
        if (refreshed.data) onRefresh(refreshed.data);
      } else {
        setMessage({ type: "error", text: json.message || "重新生成失败" });
      }
    } catch {
      setMessage({ type: "error", text: "请求失败" });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyTagName = () => {
    if (!version.gitTag) return;
    navigator.clipboard.writeText(version.gitTag).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-400" />
          <h3 className="font-medium text-gray-900">Git Tag</h3>
          {hasTag && <Badge variant="success" className="text-xs">已创建</Badge>}
          {!hasTag && <Badge variant="default" className="text-xs">未创建</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {!hasTag && (
            <Button size="sm" className="gap-1.5" onClick={handleCreateTag} disabled={isCreating}>
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              创建 Tag
            </Button>
          )}
          {hasTag && (
            <>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCopyTagName}>
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                复制
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleRegenerateTag} disabled={isRegenerating}>
                {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                重新生成
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`text-sm px-3 py-2 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {message.text}
        </div>
      )}

      {/* Tag Info */}
      {hasTag ? (
        <div className="bg-gray-50 rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-semibold text-blue-600">{version.gitTag}</span>
          </div>
          {version.gitTagCreatedAt && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>创建于 {new Date(version.gitTagCreatedAt).toLocaleString("zh-CN")}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <GitBranch className="w-3.5 h-3.5" />
            <span>版本 {version.version} 的 Git tag</span>
          </div>
          <p className="text-sm text-gray-400">
            此 tag 在版本发布时自动创建，标记该版本为一个正式的 Git release。
          </p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl border border-dashed p-6 text-center">
          <Tag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm mb-3">该版本尚未创建 Git Tag</p>
          <p className="text-gray-400 text-xs">
            Git Tag 通常在版本发布时自动创建。点击上方「创建 Tag」手动创建一个。
          </p>
        </div>
      )}

      {/* Tag naming convention */}
      <div className="bg-blue-50 rounded-lg border border-blue-100 p-3">
        <p className="text-xs text-blue-700">
          <strong>Tag 命名规范：</strong> 自动使用 <code className="bg-blue-100 px-1 rounded">v{version.version || "X.Y.Z"}</code> 格式，
          如 <code className="bg-blue-100 px-1 rounded">v1.2.3</code>。Tag 关联到版本的 projectPath 仓库。
        </p>
      </div>
    </div>
  );
}
