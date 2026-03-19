"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Version, BUILD_STATUS_LABELS, BUILD_STATUS_BADGE_VARIANT, VERSION_STATUS_LABELS, VERSION_STATUS_BADGE_VARIANT } from "@/lib/api/types";
import { getVersion } from "@/lib/api/versions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Tag, Calendar, Clock, GitBranch, FileText, Star, RefreshCw, History, Download } from "lucide-react";
import Link from "next/link";
import { BumpHistoryPanel } from "@/components/versions/BumpHistoryPanel";
import { ArtifactsPanel } from "@/components/versions/ArtifactsPanel";

const API_BASE = "/api/v1";

export default function VersionDetailPage() {
  const params = useParams();
  // const router = useRouter();
  const id = params.id as string;

  const [version, setVersion] = useState<Version | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegeneratingTag, setIsRegeneratingTag] = useState(false);
  const [tagMessage, setTagMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "bumpHistory" | "artifacts">("details");

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    getVersion(id)
      .then((v) => { setVersion(v); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleRegenerateTag = async () => {
    if (!version?.gitTag) return;
    setIsRegeneratingTag(true);
    setTagMessage(null);
    try {
      const res = await fetch(`${API_BASE}/versions/${id}/git-tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagName: version.gitTag }),
      });
      const json = await res.json();
      if (json.code === 200 || json.code === 0) {
        setTagMessage("Tag 重新生成成功");
        // Refresh version data
        const refreshed = await getVersion(id);
        setVersion(refreshed);
      } else {
        setTagMessage(`失败: ${json.message}`);
      }
    } catch {
      setTagMessage("请求失败");
    } finally {
      setIsRegeneratingTag(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">加载中...</span>
      </div>
    );
  }

  if (!version) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-500 mb-4">版本不存在</p>
        <Link href="/versions">
          <Button variant="outline">返回列表</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/versions">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="w-4 h-4" />
            返回
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-gray-900">{version.version}</h1>
            <Badge variant={VERSION_STATUS_BADGE_VARIANT[version.status]}>
              {VERSION_STATUS_LABELS[version.status]}
            </Badge>
            <Badge variant={BUILD_STATUS_BADGE_VARIANT[version.buildStatus]}>
              {BUILD_STATUS_LABELS[version.buildStatus]}
            </Badge>
            {version.isMain && (
              <Badge variant="success" className="gap-1">
                <Star className="w-3 h-3" />主版本
              </Badge>
            )}
          </div>
          <p className="text-gray-500 mt-1">{version.title}</p>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-1">
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "details"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-500 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("details")}
          >
            基本信息
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "bumpHistory"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-500 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("bumpHistory")}
          >
            <History className="w-4 h-4" />
            Bump 历史
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "artifacts"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-500 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("artifacts")}
          >
            <Download className="w-4 h-4" />
            产物下载
          </button>
        </div>
      </div>

      {activeTab === "artifacts" ? (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <Download className="w-4 h-4" />
            构建产物下载
          </h2>
          <ArtifactsPanel versionId={id} versionName={version.version} />
        </div>
      ) : activeTab === "bumpHistory" ? (
        <div>
          <BumpHistoryPanel versionId={id} />
        </div>
      ) : (
        <div className="space-y-6">
        {/* Description */}
        {version.description && (
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-sm font-medium text-gray-500 mb-2">描述</h2>
            <p className="text-gray-900">{version.description}</p>
          </div>
        )}

        {/* Git Tag */}
        {version.gitTag && (
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Git Tag
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-medium text-lg text-blue-600">{version.gitTag}</span>
                  {version.gitTagCreatedAt && (
                    <span className="text-sm text-gray-400">
                      创建于 {new Date(version.gitTagCreatedAt).toLocaleString("zh-CN")}
                    </span>
                  )}
                </div>
                {tagMessage && (
                  <p className={`text-sm ${tagMessage.includes("成功") ? "text-green-600" : "text-red-600"}`}>
                    {tagMessage}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleRegenerateTag}
                disabled={isRegeneratingTag}
              >
                {isRegeneratingTag ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                重新生成 Tag
              </Button>
            </div>
          </div>
        )}

        {/* Info grid */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-medium text-gray-500 mb-4">版本信息</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-400">创建时间</div>
                <div className="text-sm text-gray-900">
                  {version.createdAt ? new Date(version.createdAt).toLocaleString("zh-CN") : "-"}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-400">发布时间</div>
                <div className="text-sm text-gray-900">
                  {version.releasedAt ? new Date(version.releasedAt).toLocaleString("zh-CN") : "-"}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <GitBranch className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-400">提交数</div>
                <div className="text-sm text-gray-900">{version.commitCount} 次提交</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-400">变更文件</div>
                <div className="text-sm text-gray-900">{version.changedFiles.length} 个文件</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-medium text-gray-500 mb-3">标签</h2>
          <div className="flex flex-wrap gap-2">
            {version.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                {tag}
              </span>
            ))}
            {version.tags.length === 0 && <span className="text-gray-400 text-sm">无标签</span>}
          </div>
        </div>

        {/* Changed files */}
        {version.changedFiles.length > 0 && (
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-sm font-medium text-gray-500 mb-3">变更文件</h2>
            <div className="max-h-60 overflow-y-auto">
              <ul className="space-y-1">
                {version.changedFiles.map((file, i) => (
                  <li key={i} className="text-sm font-mono text-gray-600 truncate">
                    {file}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  );
}
