/**
 * Version Details Modal
 * 显示版本完整信息、构建日志、产物列表
 */
"use client";

import { useState } from "react";
import { Version, BUILD_STATUS_LABELS, BUILD_STATUS_BADGE_VARIANT } from "@/lib/api/types";
import { useBuildArtifacts } from "@/lib/api/versions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Calendar,
  Clock,
  GitBranch,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  Play,
} from "lucide-react";
import { BuildTriggerDialog } from "./BuildTriggerDialog";

interface VersionDetailsProps {
  version: Version | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 构建完成回调，用于更新外部构建历史 */
  onBuildComplete?: (buildId: string, versionName: string, status: 'success' | 'failed') => void;
}

export function VersionDetails({ version, open, onOpenChange, onBuildComplete }: VersionDetailsProps) {
  const [activeTab, setActiveTab] = useState<"info" | "logs" | "artifacts">("info");
  const [buildDialogOpen, setBuildDialogOpen] = useState(false);

  // 从 API 获取真实产物列表（version.title 可用，因为 open=true 时 version 必定存在）
  const { data: realArtifacts = [] } = useBuildArtifacts(version?.title);

  if (!version || !open) return null;

  // 模拟构建日志（实际应从 API 获取）
  const buildLogs = [
    { time: "10:30:00", message: "开始构建 v1.2.0", status: "info" },
    { time: "10:31:15", message: "安装依赖完成", status: "success" },
    { time: "10:32:00", message: "运行测试用例...", status: "info" },
    { time: "10:33:45", message: "测试通过 (45/45)", status: "success" },
    { time: "10:34:20", message: "开始打包...", status: "info" },
    { time: "10:35:00", message: "构建成功", status: "success" },
    { time: "10:35:30", message: "上传产物到存储", status: "info" },
    { time: "10:36:00", message: "构建完成", status: "success" },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      
      {/* 模态框 */}
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden m-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <h2 className="text-lg font-semibold">{version.title}</h2>
              <Badge variant={BUILD_STATUS_BADGE_VARIANT[version.buildStatus]}>
                {BUILD_STATUS_LABELS[version.buildStatus]}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBuildDialogOpen(true)}
            >
              <Play className="w-4 h-4 mr-1" />
              开始构建
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 标签切换 */}
        <div className="flex border-b">
          <button
            className={`flex-1 py-3 text-sm font-medium ${activeTab === "info" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-500"}`}
            onClick={() => setActiveTab("info")}
          >
            版本信息
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium ${activeTab === "logs" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-500"}`}
            onClick={() => setActiveTab("logs")}
          >
            构建日志
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium ${activeTab === "artifacts" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-500"}`}
            onClick={() => setActiveTab("artifacts")}
          >
            产物列表
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {activeTab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">版本号</label>
                  <p className="font-semibold">{version.version}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">状态</label>
                  <p>{version.status}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">创建时间</label>
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {new Date(version.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">发布时间</label>
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {version.releasedAt ? new Date(version.releasedAt).toLocaleString("zh-CN") : "未发布"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">主版本</label>
                  <p>{version.isMain ? "✓ 是主版本" : "—"}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">提交数</label>
                  <p className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-gray-400" />
                    {version.commitCount} 次提交
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">描述</label>
                <p>{version.description || "无描述"}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">变更文件</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {version.changedFiles.length > 0 ? (
                    version.changedFiles.map((file, i) => (
                      <Badge key={i} variant="default">
                        <FileText className="w-3 h-3 mr-1" />
                        {file}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-gray-400">无变更文件</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">标签</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {version.tags.map((tag) => (
                    <Badge key={tag} variant="default">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm">
              {buildLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 py-1">
                  <span className="text-gray-500 shrink-0">{log.time}</span>
                  {getStatusIcon(log.status)}
                  <span className={log.status === "error" ? "text-red-400" : log.status === "success" ? "text-green-400" : "text-gray-300"}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "artifacts" && (
            <div className="space-y-2">
              {realArtifacts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Download className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无构建产物</p>
                  <p className="text-xs mt-1">请先执行构建任务</p>
                </div>
              ) : (
                realArtifacts.map((artifact, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <Download className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-mono text-sm block truncate">{artifact.filename}</span>
                        <span className="text-xs text-gray-400">{artifact.platform} / {artifact.arch} / {artifact.env}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-sm text-gray-500">{artifact.size}</span>
                      <a
                        href={artifact.downloadUrl}
                        download={artifact.filename}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        下载
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <BuildTriggerDialog
        open={buildDialogOpen}
        onOpenChange={setBuildDialogOpen}
        presetVersion={version}
        onBuildComplete={onBuildComplete}
      />
    </div>
  );
}
