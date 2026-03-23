"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Tag, Lock, Trash2, Edit3, Check, X, AlertTriangle, User, GitCommit, Clock } from "lucide-react";
import Link from "next/link";

const API_BASE = "/api/v1";

interface TagDetail {
  id: string;
  name: string;
  versionId?: string;
  versionName?: string;
  commitHash?: string;
  message?: string;
  annotation?: string;
  createdAt: string;
  protected?: boolean;
  archived?: boolean;
  createdBy?: string;
  author?: string | null;
  authorEmail?: string | null;
  taggerDate?: string | null;
  date?: string;
  commit?: string;
  hasRecord?: boolean;
}

function isProtectedTag(name: string): boolean {
  return /^v\d+\.0\.0$/.test(name);
}

export default function TagDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawName = params.name as string;
  const tagName = decodeURIComponent(rawName);

  const [tag, setTag] = useState<TagDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!tagName) return;
    setIsLoading(true);
    // Use dedicated tag detail endpoint which includes author info
    fetch(`${API_BASE}/tags/${encodeURIComponent(tagName)}`)
      .then((r) => r.json())
      .then((json) => {
        if ((json.code === 200 || json.code === 0) && json.data) {
          setTag(json.data);
        } else {
          // Fallback to list endpoint
          return fetch(`${API_BASE}/tags?prefix=${encodeURIComponent(tagName)}`).then(r => r.json());
        }
      })
      .then((json) => {
        if (json && (json.code === 200 || json.code === 0) && json.data?.data?.length > 0) {
          const found = json.data.data.find((t: TagDetail) => t.name === tagName);
          setTag(found || json.data.data[0]);
        } else if (!tag) {
          setTag(null);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagName]);

  const handleRename = async () => {
    if (!tag?.id || !newName.trim() || newName === tag.name) return;
    setIsRenaming(true);
    setRenameError(null);
    try {
      const res = await fetch(`${API_BASE}/tags/${tag.id}/rename`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const json = await res.json();
      if (json.code === 200 || json.code === 0) {
        setActionMsg({ type: "success", text: `已重命名为: ${newName}` });
        setTag((prev) => prev ? { ...prev, name: newName } : prev);
        setIsRenaming(false);
        router.replace(`/tags/${encodeURIComponent(newName)}`);
      } else {
        setRenameError(json.message || "重命名失败");
      }
    } catch {
      setRenameError("请求失败");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (!tag?.id) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/tags/${tag.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.code === 200 || json.code === 0) {
        router.push("/tags");
      } else {
        setActionMsg({ type: "error", text: json.message || "删除失败" });
        setIsDeleteConfirm(false);
      }
    } catch {
      setActionMsg({ type: "error", text: "请求失败" });
      setIsDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const protected_ = tag ? (isProtectedTag(tag.name) || tag.protected) : false;
  const displayDate = tag?.taggerDate || tag?.date || tag?.createdAt || null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">加载中...</span>
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-500 mb-4">Tag 不存在</p>
        <Link href="/tags">
          <Button variant="outline">返回列表</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/tags">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="w-4 h-4" />
            返回
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Tag className="w-5 h-5 text-blue-500" />
            {isRenaming ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="font-mono font-medium w-48"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename();
                    if (e.key === "Escape") setIsRenaming(false);
                  }}
                />
                <Button size="sm" variant="ghost" onClick={handleRename} disabled={!newName.trim()}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsRenaming(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold font-mono text-gray-900">{tag.name}</h1>
                {protected_ && (
                  <Badge variant="warning" className="gap-1">
                    <Lock className="w-3 h-3" />🔒 受保护
                  </Badge>
                )}
                {!protected_ && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1"
                    onClick={() => { setNewName(tag.name); setIsRenaming(true); }}
                  >
                    <Edit3 className="w-4 h-4" />
                    重命名
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action messages */}
      {actionMsg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${actionMsg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {actionMsg.text}
          <button onClick={() => setActionMsg(null)} className="ml-2 underline">关闭</button>
        </div>
      )}
      {renameError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {renameError}
        </div>
      )}

      <div className="space-y-6">
        {/* Info card - enhanced with author info */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-medium text-gray-500 mb-4">Tag 信息</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Tag 名称</span>
              <span className="font-mono font-medium text-gray-900">{tag.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <GitCommit className="w-3.5 h-3.5" /> Commit Hash
              </span>
              <span className="font-mono text-sm text-gray-900">{tag.commitHash || tag.commit || "-"}</span>
            </div>
            {(tag.author || tag.authorEmail) && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> 作者
                </span>
                <span className="text-sm text-gray-900">
                  {tag.author}
                  {tag.authorEmail && <span className="text-gray-400 ml-1">&lt;{tag.authorEmail}&gt;</span>}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> 创建时间
              </span>
              <span className="text-sm text-gray-900">
                {displayDate ? new Date(displayDate).toLocaleString("zh-CN") : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">版本</span>
              <span className="text-sm text-gray-900">{tag.versionName || tag.versionId || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">创建者</span>
              <span className="text-sm text-gray-900">{tag.createdBy || "-"}</span>
            </div>
          </div>
        </div>

        {/* Commit Message */}
        {tag.message && (
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Commit 信息</h2>
            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-400">
              <p className="text-sm font-medium text-gray-900 mb-1">{tag.message}</p>
            </div>
          </div>
        )}

        {/* Annotation / Message */}
        {(tag.annotation) && tag.annotation !== tag.message && (
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Annotation</h2>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans bg-gray-50 rounded p-3">
              {tag.annotation}
            </pre>
          </div>
        )}

        {/* Danger zone */}
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <h2 className="text-sm font-medium text-red-600 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            危险操作
          </h2>
          {protected_ ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Lock className="w-4 h-4" />
              受保护 Tag 无法删除（匹配 ^v\d+\.0\.0$ 规则）
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">删除此 Tag</div>
                <div className="text-xs text-gray-500">删除后无法恢复</div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1"
                onClick={() => setIsDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4" />
                删除
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm dialog */}
      {isDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold">确认删除</h3>
            </div>
            <p className="text-gray-600 mb-6">
              确定要删除 Tag <span className="font-mono font-medium">{tag.name}</span> 吗？此操作无法撤销。
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setIsDeleteConfirm(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    删除中...
                  </>
                ) : (
                  "删除"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
