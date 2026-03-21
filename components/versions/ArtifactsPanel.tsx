'use client';

import { useState, useEffect } from "react";
import { useArtifacts } from "@/lib/api/artifacts";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Download,
  Package,
  FileText,
  Image,
  Code,
  Archive,
  Play,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  FileSymlink,
  Clock,
  Trash2,
  History,
  X,
} from "lucide-react";
import { useTriggerBuild, useRebuildVersion } from "@/lib/api/versions";
import type { ArtifactInfo } from "@/lib/api/artifacts";
import { useDownloadHistory } from "@/lib/hooks/useDownloadHistory";

interface ArtifactsPanelProps {
  versionId: string;
  versionName?: string;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["js", "ts", "jsx", "tsx", "css", "html"].includes(ext))
    return <Code className="w-4 h-4 text-blue-500" />;
  if (["png", "jpg", "jpeg", "gif", "svg", "ico", "webp"].includes(ext))
    return <Image className="w-4 h-4 text-purple-500" aria-label="Image file" />;
  if (["zip", "tar", "gz", "tgz"].includes(ext))
    return <Archive className="w-4 h-4 text-amber-500" />;
  if (["json", "xml", "yaml", "yml", "txt", "md", "csv"].includes(ext))
    return <FileText className="w-4 h-4 text-gray-500" />;
  return <FileText className="w-4 h-4 text-gray-400" />;
}

export function ArtifactsPanel({ versionId, versionName }: ArtifactsPanelProps) {
  const { data, isLoading, error, refetch } = useArtifacts(versionId);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [isCreatingPackage, setIsCreatingPackage] = useState(false);
  const [packageMessage, setPackageMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [buildId, setBuildId] = useState<string | null>(null);
  const [buildMessage, setBuildMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [previewArtifact, setPreviewArtifact] = useState<ArtifactInfo | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const triggerBuild = useTriggerBuild();
  const rebuildVersion = useRebuildVersion();
  const { records, addRecord, removeRecord, clearHistory } = useDownloadHistory();

  const isBuilding = triggerBuild.isPending || rebuildVersion.isPending;

  // Get latest build ID for this version
  useEffect(() => {
    if (!versionId) return;
    fetch(`/api/v1/builds/latest/${encodeURIComponent(versionId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.id) setBuildId(json.data.id);
      })
      .catch(() => {});
  }, [versionId]);

  // Clear transient messages after 4s
  useEffect(() => {
    if (downloadMessage) {
      const t = setTimeout(() => setDownloadMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [downloadMessage]);

  const handleDownload = async (artifact: ArtifactInfo) => {
    if (!data) return;
    setDownloading(artifact.path);
    setDownloadMessage(null);
    try {
      // Validate URL exists
      const artifactData = data.artifacts.find((a) => a.path === artifact.path);
      if (!artifactData) {
        setDownloadMessage({ type: "error", text: "未找到产物信息，请刷新重试" });
        return;
      }
      const url = artifactData.url;
      if (!url) {
        setDownloadMessage({ type: "error", text: "产物下载链接无效" });
        return;
      }

      // Use fetch + blob approach for reliable cross-browser download
      const res = await fetch(url);
      if (!res.ok) {
        setDownloadMessage({ type: "error", text: `下载失败 (HTTP ${res.status})，请刷新后重试` });
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = artifact.name;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      setDownloadMessage({ type: "success", text: `「${artifact.name}」下载已开始` });
      // Record download history
      addRecord({
        versionId,
        versionName: versionName || versionId,
        artifactName: artifact.name,
        artifactPath: artifact.path,
        fileSize: artifactData?.size ?? 0,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setDownloadMessage({ type: "error", text: `下载失败: ${msg}` });
    } finally {
      setTimeout(() => setDownloading(null), 2000);
    }
  };

  const isPreviewableImage = (artifact: ArtifactInfo) =>
    ["png", "jpg", "jpeg", "gif", "svg", "ico", "webp"].includes(artifact.name.split(".").pop()?.toLowerCase() || "");

  const isPreviewableText = (artifact: ArtifactInfo) =>
    ["json", "xml", "yaml", "yml", "txt", "md", "csv", "js", "ts", "jsx", "tsx", "css", "html"].includes(artifact.name.split(".").pop()?.toLowerCase() || "");

  const handlePreview = async (artifact: ArtifactInfo) => {
    if (!isPreviewableImage(artifact) && !isPreviewableText(artifact)) return;
    setPreviewArtifact(artifact);
    setPreviewContent(null);
    setPreviewLoading(true);
    try {
      const res = await fetch(artifact.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (isPreviewableImage(artifact)) {
        // Images: load as data URL
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onload = () => setPreviewContent(reader.result as string);
        reader.onerror = () => { setPreviewContent(null); };
        reader.readAsDataURL(blob);
      } else {
        // Text files: load as text
        const text = await res.text();
        setPreviewContent(text.slice(0, 50000)); // cap at 50k chars
      }
    } catch {
      setPreviewContent(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCopyUrl = async (artifact: ArtifactInfo) => {
    const url = `${window.location.origin}/api/v1/artifacts/${versionId}/${data?.buildNumber}?file=${encodeURIComponent(artifact.path)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPath(artifact.path);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch {
      setDownloadMessage({ type: "error", text: "复制链接失败，请手动复制" });
    }
  };

  const handleTriggerBuild = async () => {
    setBuildMessage(null);
    try {
      const result = await triggerBuild.mutateAsync(versionId);
      if (result.success) {
        setBuildId(result.buildId);
        setBuildMessage({ type: "success", text: "构建已开始..." });
        refetch();
      }
    } catch (e) {
      setBuildMessage({ type: "error", text: `构建失败: ${e instanceof Error ? e.message : String(e)}` });
    }
  };

  const handleRebuild = async () => {
    setBuildMessage(null);
    try {
      await rebuildVersion.mutateAsync(versionId);
      setBuildMessage({ type: "success", text: "重新构建已开始..." });
      refetch();
    } catch (e) {
      setBuildMessage({ type: "error", text: `重新构建失败: ${e instanceof Error ? e.message : String(e)}` });
    }
  };

  const handlePackageDownload = async (format: "zip" | "tar.gz") => {
    if (!buildId) {
      setPackageMessage({ type: "error", text: "无可用构建记录，请先触发构建" });
      return;
    }
    setIsCreatingPackage(true);
    setPackageMessage(null);
    try {
      // 1. Create package
      const res = await fetch(`/api/v1/builds/${buildId}/package`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      const json = await res.json();
      if (json.code !== 200 && json.code !== 0) {
        setPackageMessage({ type: "error", text: `打包失败: ${json.message || "请先确保构建成功"}` });
        return;
      }

      // 2. Download via blob (more reliable than direct redirect)
      const dlRes = await fetch(`/api/v1/builds/${buildId}/package/download?format=${format}`);
      if (!dlRes.ok) {
        setPackageMessage({ type: "error", text: "打包成功，但下载失败，请稍后重试" });
        return;
      }
      const blob = await dlRes.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `build-${versionName || versionId}.${format === "tar.gz" ? "tar.gz" : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      setPackageMessage({ type: "success", text: `${format.toUpperCase()} 打包下载已开始` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setPackageMessage({ type: "error", text: `打包失败: ${msg}` });
    } finally {
      setIsCreatingPackage(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">加载构建产物中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4">
        <p className="text-sm text-red-500 mb-2">加载失败: {String(error)}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>重试</Button>
      </div>
    );
  }

  const artifacts = data?.artifacts || [];
  const hasArtifacts = artifacts.length > 0;

  return (
    <div className="space-y-4">
      {/* Download result message */}
      {downloadMessage && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
            downloadMessage.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {downloadMessage.type === "success" ? (
            <Check className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          )}
          {downloadMessage.text}
        </div>
      )}

      {/* Build trigger buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-500">构建操作：</span>
        {buildId || hasArtifacts ? (
          <Button
            variant="default"
            size="sm"
            className="gap-1.5"
            onClick={handleRebuild}
            disabled={isBuilding}
          >
            {isBuilding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            重新构建
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="gap-1.5"
            onClick={handleTriggerBuild}
            disabled={isBuilding}
          >
            {isBuilding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            触发构建
          </Button>
        )}
        {buildMessage && (
          <span className={`text-sm ${buildMessage.type === "error" ? "text-red-500" : "text-green-600"}`}>
            {buildMessage.text}
          </span>
        )}
        {isBuilding && (
          <span className="text-sm text-blue-600 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            构建中...
          </span>
        )}
      </div>

      {/* Package download buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-500">快速下载：</span>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => handlePackageDownload("zip")}
          disabled={isCreatingPackage}
        >
          {isCreatingPackage ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Package className="w-4 h-4" />
          )}
          ZIP 打包下载
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => handlePackageDownload("tar.gz")}
          disabled={isCreatingPackage}
        >
          {isCreatingPackage ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Archive className="w-4 h-4" />
          )}
          TAR.GZ 打包下载
        </Button>
        {packageMessage && (
          <span className={`text-sm ${packageMessage.type === "error" ? "text-red-500" : "text-green-600"}`}>
            {packageMessage.text}
          </span>
        )}
      </div>

      {/* Individual artifact list */}
      {!hasArtifacts ? (
        <div className="text-center py-8 text-gray-400 border border-dashed rounded-lg">
          <FileSymlink className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">暂无构建产物</p>
          <p className="text-xs mt-1">完成构建后即可下载产物</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b">
            <span className="text-sm font-medium text-gray-700">
              产物列表 ({artifacts.length} 个文件)
            </span>
            <span className="text-xs text-gray-400">
              总计 {data?.totalSizeFormatted || "0 B"}
            </span>
          </div>
          <div className="divide-y max-h-72 overflow-y-auto">
            {artifacts.map((artifact) => (
              <div
                key={artifact.path}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
              >
                {getFileIcon(artifact.name)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      className="text-sm font-medium text-gray-800 truncate hover:text-blue-600 cursor-pointer text-left min-w-0"
                      title={artifact.name}
                      onClick={() => handlePreview(artifact)}
                    >
                      {artifact.name}
                    </button>
                    {artifact.type && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded border border-gray-200 shrink-0 font-mono">
                        {artifact.type}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 truncate" title={artifact.path}>
                    <span className="truncate">{artifact.path}</span>
                    {artifact.modifiedAt && (
                      <span className="shrink-0">更新于 {new Date(artifact.modifiedAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400 tabular-nums">{artifact.sizeFormatted}</span>
                  {/* Copy URL button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    onClick={() => handleCopyUrl(artifact)}
                    title="复制下载链接"
                  >
                    {copiedPath === artifact.path ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  {/* Open in new tab */}
                  <a
                    href={artifact.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    title="在新窗口打开"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {/* Download button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => handleDownload(artifact)}
                    disabled={downloading === artifact.path}
                  >
                    {downloading === artifact.path ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    下载
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Download history section */}
      {records.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              下载历史
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 gap-1"
              onClick={clearHistory}
            >
              <Trash2 className="w-3 h-3" />
              清空
            </Button>
          </div>
          <div className="divide-y max-h-48 overflow-y-auto">
            {records.slice(0, 10).map((record) => (
              <div
                key={record.id}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors group"
              >
                <Clock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800 truncate">
                    <span className="font-medium">{record.versionName}</span>
                    {' — '}
                    <span className="text-gray-600">{record.artifactName}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {record.fileSizeFormatted} · {new Date(record.downloadedAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeRecord(record.id)}
                  title="删除记录"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Artifact Preview Modal */}
      {previewArtifact && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => { setPreviewArtifact(null); setPreviewContent(null); }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2 min-w-0">
                {getFileIcon(previewArtifact.name)}
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{previewArtifact.name}</div>
                  <div className="text-xs text-gray-400">{previewArtifact.sizeFormatted} · {previewArtifact.path}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setPreviewArtifact(null); setPreviewContent(null); }}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Modal content */}
            <div className="flex-1 overflow-auto p-4">
              {previewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : previewContent === null ? (
                <div className="text-center py-12 text-gray-400">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">预览加载失败</p>
                </div>
              ) : isPreviewableImage(previewArtifact) ? (
                <div className="flex justify-center">
                  <img
                    src={previewContent}
                    alt={previewArtifact.name}
                    className="max-w-full max-h-[60vh] object-contain rounded"
                  />
                </div>
              ) : (
                <pre className="text-xs font-mono bg-gray-50 rounded p-3 overflow-auto max-h-[60vh] whitespace-pre-wrap break-all">
                  {previewContent}
                </pre>
              )}
            </div>
            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-2 border-t">
              <a
                href={previewArtifact.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                在新窗口打开 →
              </a>
              <Button size="sm" variant="outline" onClick={() => { setPreviewArtifact(null); setPreviewContent(null); }}>
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
