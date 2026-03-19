/**
 * VersionSummaryPanel Component
 * 版本摘要面板 - 展示版本摘要，支持 AI 生成和手动编辑
 */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Edit2, X, Check } from "lucide-react";
import { VersionSummary } from "@/lib/api/types";
import { getVersionSummary, saveVersionSummary, refreshVersionSummary } from "@/lib/api/versions";

interface VersionSummaryPanelProps {
  versionId: string;
  versionName?: string;
}

export function VersionSummaryPanel({
  versionId,
  versionName,
}: VersionSummaryPanelProps) {
  const [summary, setSummary] = useState<VersionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editFeatures, setEditFeatures] = useState<string[]>([]);
  const [editFixes, setEditFixes] = useState<string[]>([]);
  const [editChanges, setEditChanges] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await getVersionSummary(versionId);
      setSummary(data || null);
    } catch {
      console.error("Failed to load summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [versionId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      await refreshVersionSummary(versionId);
      await loadSummary();
      setMessage({ type: "success", text: "摘要生成成功" });
    } catch {
      setMessage({ type: "error", text: "生成失败，请重试" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveVersionSummary(versionId, {
        content: editContent,
        features: editFeatures.filter(Boolean),
        changes: editChanges.filter(Boolean),
        fixes: editFixes.filter(Boolean),
        createdBy: "manual",
      });
      if (result) {
        setSummary(result);
        setEditing(false);
        setMessage({ type: "success", text: "保存成功" });
      } else {
        setMessage({ type: "error", text: "保存失败" });
      }
    } catch {
      setMessage({ type: "error", text: "保存失败" });
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    if (summary) {
      setEditContent(summary.content || "");
      setEditFeatures(summary.features || []);
      setEditFixes(summary.fixes || []);
      setEditChanges(summary.changes || []);
    } else {
      setEditContent("");
      setEditFeatures([]);
      setEditFixes([]);
      setEditChanges([]);
    }
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditContent("");
    setEditFeatures([]);
    setEditFixes([]);
    setEditChanges([]);
  };

  const addItem = (list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter([...list, ""]);
  };

  const updateItem = (list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    const updated = [...list];
    updated[index] = value;
    setter(updated);
  };

  const removeItem = (list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(list.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">加载摘要...</span>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">编辑版本摘要</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={cancelEditing} disabled={saving}>
              <X className="w-4 h-4 mr-1" />
              取消
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              保存
            </Button>
          </div>
        </div>

        {/* 概述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">概述</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px] resize-y"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="版本概述内容..."
          />
        </div>

        {/* 新增功能 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">新增功能</label>
            <Button variant="ghost" size="sm" onClick={() => addItem(editFeatures, setEditFeatures)}>
              + 添加
            </Button>
          </div>
          {editFeatures.map((item, i) => (
            <div key={i} className="flex gap-2 mb-1">
              <input
                className="flex-1 border rounded px-2 py-1 text-sm"
                value={item}
                onChange={(e) => updateItem(editFeatures, setEditFeatures, i, e.target.value)}
                placeholder="新增功能..."
              />
              <Button variant="ghost" size="sm" onClick={() => removeItem(editFeatures, setEditFeatures, i)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* Bug 修复 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Bug 修复</label>
            <Button variant="ghost" size="sm" onClick={() => addItem(editFixes, setEditFixes)}>
              + 添加
            </Button>
          </div>
          {editFixes.map((item, i) => (
            <div key={i} className="flex gap-2 mb-1">
              <input
                className="flex-1 border rounded px-2 py-1 text-sm"
                value={item}
                onChange={(e) => updateItem(editFixes, setEditFixes, i, e.target.value)}
                placeholder="Bug 修复..."
              />
              <Button variant="ghost" size="sm" onClick={() => removeItem(editFixes, setEditFixes, i)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* 优化改进 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">优化改进</label>
            <Button variant="ghost" size="sm" onClick={() => addItem(editChanges, setEditChanges)}>
              + 添加
            </Button>
          </div>
          {editChanges.map((item, i) => (
            <div key={i} className="flex gap-2 mb-1">
              <input
                className="flex-1 border rounded px-2 py-1 text-sm"
                value={item}
                onChange={(e) => updateItem(editChanges, setEditChanges, i, e.target.value)}
                placeholder="优化改进..."
              />
              <Button variant="ghost" size="sm" onClick={() => removeItem(editChanges, setEditChanges, i)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1" />
            )}
            AI 生成摘要
          </Button>
          <Button variant="outline" size="sm" onClick={startEditing}>
            <Edit2 className="w-4 h-4 mr-1" />
            手动编辑
          </Button>
        </div>
        {summary?.generatedBy && (
          <Badge variant="info" className="text-xs">
            {summary.generatedBy === "AI" ? "🤖 AI 生成" : summary.generatedBy === "manual" ? "✏️ 手动编辑" : "⚙️ 系统生成"}
          </Badge>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`text-sm px-3 py-2 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
          {message.text}
        </div>
      )}

      {/* Summary content */}
      {!summary ? (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">暂无版本摘要</p>
          <p className="text-sm">点击「AI 生成摘要」自动生成，或「手动编辑」添加摘要</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Title */}
          {summary.title && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{summary.title}</h3>
            </div>
          )}

          {/* Content/Overview */}
          {summary.content && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{summary.content}</p>
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-4 text-sm">
            {summary.features && summary.features.length > 0 && (
              <Badge variant="success" className="gap-1">
                ✨ {summary.features.length} 新功能
              </Badge>
            )}
            {summary.fixes && summary.fixes.length > 0 && (
              <Badge variant="warning" className="gap-1">
                🐛 {summary.fixes.length} Bug 修复
              </Badge>
            )}
            {summary.changes && summary.changes.length > 0 && (
              <Badge variant="info" className="gap-1">
                ⚡ {summary.changes.length} 优化改进
              </Badge>
            )}
            {summary.breaking && summary.breaking.length > 0 && (
              <Badge variant="error" className="gap-1">
                💥 {summary.breaking.length} 破坏性变更
              </Badge>
            )}
          </div>

          {/* Detail lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.features && summary.features.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">✨ 新增功能</h4>
                <ul className="space-y-1">
                  {summary.features.map((f, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-green-500">•</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.fixes && summary.fixes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">🐛 Bug 修复</h4>
                <ul className="space-y-1">
                  {summary.fixes.map((f, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-yellow-500">•</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.changes && summary.changes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">⚡ 优化改进</h4>
                <ul className="space-y-1">
                  {summary.changes.map((c, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.breaking && summary.breaking.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">💥 破坏性变更</h4>
                <ul className="space-y-1">
                  {summary.breaking.map((b, i) => (
                    <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Meta info */}
          {summary.generatedAt && (
            <div className="text-xs text-gray-400 pt-2 border-t">
              生成时间: {new Date(summary.generatedAt).toLocaleString("zh-CN")}
              {versionName && <span className="ml-2">版本: {versionName}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
