'use client';

import { useState, useEffect } from "react";
import { useArtifacts } from "@/lib/api/artifacts";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Package, FileText, Image, Code, Archive, Play, RefreshCw } from "lucide-react";
import { useTriggerBuild, useRebuildVersion } from "@/lib/api/versions";

interface ArtifactsPanelProps {
  versionId: string;
  versionName?: string;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["js", "ts", "jsx", "tsx", "css", "html"].includes(ext)) return <Code className="w-4 h-4 text-blue-500" />;
  if (["png", "jpg", "jpeg", "gif", "svg", "ico", "webp"].includes(ext)) return <Image className="w-4 h-4 text-purple-500" />;
  if (["zip", "tar", "gz", "tgz"].includes(ext)) return <Archive className="w-4 h-4 text-amber-500" />;
  if (["json", "xml", "yaml", "yml", "txt", "md", "csv"].includes(ext)) return <FileText className="w-4 h-4 text-gray-500" />;
  return <FileText className="w-4 h-4 text-gray-400" />;
}

export function ArtifactsPanel({ versionId, versionName }: ArtifactsPanelProps) {
  const { data, isLoading, error, refetch } = useArtifacts(versionId);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [isCreatingPackage, setIsCreatingPackage] = useState(false);
  const [packageMessage, setPackageMessage] = useState<string | null>(null);
  const [buildId, setBuildId] = useState<string | null>(null);
  const [buildMessage, setBuildMessage] = useState<string | null>(null);

  const triggerBuild = useTriggerBuild();
  const rebuildVersion = useRebuildVersion();

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

  const handleDownload = async (artifactPath: string, artifactName: string) => {
    if (!data) return;
    setDownloading(artifactPath);
    try {
      const url = data.artifacts.find((a) => a.path === artifactPath)?.url;
      if (!url) return;
      const link = document.createElement("a");
      link.href = url;
      link.download = artifactName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setDownloading(null), 1000);
    }
  };

  const handleTriggerBuild = async () => {
    setBuildMessage(null);
    try {
      const result = await triggerBuild.mutateAsync(versionId);
      if (result.success) {
        setBuildId(result.buildId);
        setBuildMessage("构建已开始...");
        refetch();
      }
    } catch (e) {
      setBuildMessage(`构建失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleRebuild = async () => {
    setBuildMessage(null);
    try {
      await rebuildVersion.mutateAsync(versionId);
      setBuildMessage("重新构建已开始...");
      refetch();
    } catch (e) {
      setBuildMessage(`重新构建失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handlePackageDownload = async (format: "zip" | "tar.gz") => {
    if (!buildId) {
      setPackageMessage("无可用构建记录，请先触发构建");
      return;
    }
    setIsCreatingPackage(true);
    setPackageMessage(null);
    try {
      const res = await fetch(`/api/v1/builds/${buildId}/package`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      const json = await res.json();
      if (json.code === 200 || json.code === 0) {
        const packageUrl = json.data?.packageUrl;
        if (packageUrl) {
          // Trigger download via the download endpoint
          const dlRes = await fetch(
            `/api/v1/builds/${buildId}/package/download?format=${format}`
          );
          if (dlRes.ok) {
            const blob = await dlRes.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `build-${versionName || versionId}.${format === "tar.gz" ? "tar.gz" : format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
            setPackageMessage(`${format.toUpperCase()} 打包下载已开始`);
          } else {
            setPackageMessage("打包成功，但下载失败");
          }
        } else {
          setPackageMessage("打包成功，但未返回下载链接");
        }
      } else {
        setPackageMessage(`打包失败: ${json.message}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setPackageMessage(`打包失败: ${msg}`);
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
          <span className={`text-sm ${buildMessage.includes("失败") ? "text-red-500" : "text-green-600"}`}>
            {buildMessage}
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
          <span className={`text-sm ${packageMessage.includes("失败") ? "text-red-500" : "text-green-600"}`}>
            {packageMessage}
          </span>
        )}
      </div>

      {/* Individual artifact list */}
      {!hasArtifacts ? (
        <div className="text-center py-8 text-gray-400 border border-dashed rounded-lg">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
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
                  <div className="text-sm font-medium text-gray-800 truncate" title={artifact.name}>
                    {artifact.name}
                  </div>
                  <div className="text-xs text-gray-400 truncate" title={artifact.path}>
                    {artifact.path}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-400">{artifact.sizeFormatted}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => handleDownload(artifact.path, artifact.name)}
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
    </div>
  );
}
