"use client";

import { useState } from "react";
import { RefreshCw, FileText, Sparkles, Loader2, GitCommit, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VersionChangelog, ChangelogChange } from "@/lib/api/types";
import { saveVersionSummary } from "@/lib/api/versions";

interface ChangelogPanelProps {
  changelog: VersionChangelog | null;
  onGenerate: () => void;
  loading?: boolean;
  generating?: boolean;
  versionSummary?: string;
  summaryGeneratedAt?: string;
  summaryGeneratedBy?: string;
  /** 版本 ID，用于保存手动编辑的摘要 */
  versionId?: string;
  onSummarySaved?: (savedAt: string) => void;
}

const changeTypeLabels: Record<ChangelogChange["type"], { label: string; variant: "default" | "success" | "warning" | "error" | "info" }> = {
  feature: { label: "新功能", variant: "success" },
  fix: { label: "修复", variant: "warning" },
  improvement: { label: "改进", variant: "info" },
  breaking: { label: "破坏性变更", variant: "error" },
  docs: { label: "文档", variant: "default" },
  refactor: { label: "重构", variant: "default" },
  other: { label: "其他", variant: "default" },
};

export function ChangelogPanel({ changelog, onGenerate, loading, generating, versionSummary, summaryGeneratedAt, summaryGeneratedBy, versionId, onSummarySaved }: ChangelogPanelProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const startEditing = () => {
    setEditContent(changelog?.content || versionSummary || "");
    setEditing(true);
    setSaveSuccess(null);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditContent("");
    setSaveSuccess(null);
  };

  const handleSave = async () => {
    if (!versionId) return;
    setSaving(true);
    try {
      const result = await saveVersionSummary(versionId, { content: editContent, createdBy: "manual" });
      if (result) {
        const savedAt = new Date().toLocaleString("zh-CN");
        setSaveSuccess(savedAt);
        setEditing(false);
        onSummarySaved?.(savedAt);
      }
    } catch (e) {
      console.error("Failed to save changelog:", e);
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">变更摘要</div>
        </div>
        <div className="space-y-3">
          <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
          <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
          <div className="h-20 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  // 如果有 version.summary 内容但没有完整 changelog，展示摘要文本
  if (!changelog && versionSummary) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">版本摘要</div>
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {generating ? "刷新中..." : "刷新摘要"}
          </Button>
        </div>
        <div className="p-4 rounded-lg border bg-card space-y-3">
          <p className="text-sm whitespace-pre-wrap">{versionSummary}</p>
          {(summaryGeneratedAt || summaryGeneratedBy) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-2 mt-3">
              {summaryGeneratedAt && <span>生成时间: {new Date(summaryGeneratedAt).toLocaleString("zh-CN")}</span>}
              {summaryGeneratedBy && <span>生成方式: {summaryGeneratedBy === 'AI' ? '🤖 AI' : summaryGeneratedBy === 'manual' ? '✏️ 手动' : '🔧 系统'}</span>}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!changelog) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">变更摘要</div>
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {generating ? "生成中..." : "生成变更摘要"}
          </Button>
        </div>
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">暂无变更摘要</p>
          <p className="text-xs text-muted-foreground mt-1">
            点击上方按钮自动生成版本变更摘要
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">变更摘要</div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelEditing}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                {saving ? "保存中..." : "保存"}
              </Button>
            </>
          ) : (
            <>
              {versionId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startEditing}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  编辑
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerate}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {generating ? "生成中..." : "重新生成"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 保存成功提示 */}
      {saveSuccess && (
        <div className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-md">
          ✅ 变更摘要已保存于 {saveSuccess}
        </div>
      )}

      {/* 编辑模式 */}
      {editing ? (
        <div className="space-y-3">
          <textarea
            className="w-full min-h-[200px] p-3 text-sm border rounded-lg bg-background resize-y font-mono"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="在此编辑变更摘要内容（支持 Markdown）..."
          />
          <p className="text-xs text-muted-foreground">
            支持 Markdown 格式。保存后将覆盖现有变更摘要。
          </p>
        </div>
      ) : (
        <>
          {/* 标题和生成信息 */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{changelog.title}</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{changelog.content}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                生成时间: {new Date(changelog.generatedAt).toLocaleString("zh-CN")}
              </span>
              <span>生成者: {changelog.generatedBy}</span>
            </div>
          </div>

          {/* 变更列表 */}
          <div className="space-y-3">
            {changelog.changes.map((change, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border bg-card"
              >
                <div className="flex items-start gap-2 mb-2">
                  <Badge variant={changeTypeLabels[change.type].variant}>
                    {changeTypeLabels[change.type].label}
                  </Badge>
                </div>
                <p className="text-sm">{change.description}</p>
                {change.files && change.files.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {change.files.map((file, fileIndex) => (
                      <Badge key={fileIndex} variant="default" className="text-xs bg-transparent border border-gray-300 text-gray-600">
                        <GitCommit className="h-3 w-3 mr-1" />
                        {file}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
