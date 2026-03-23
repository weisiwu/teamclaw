"use client";

import { useState, useEffect } from "react";
import type { Version, BuildEnvironment } from "@/lib/api/types";
import { getVersions } from "@/lib/api/versions";
import { getBuildEnvironments } from "@/lib/api/versions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Package, Clock, X } from "lucide-react";
import { BuildProgress } from "./BuildProgress";

interface BuildTriggerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 预设版本，当从版本详情打开时传入 */
  presetVersion?: Version | null;
  /** 构建完成回调 */
  onBuildComplete?: (buildId: string, versionName: string, status: "success" | "failed") => void;
}

interface BuildJob {
  id: string;
  versionName: string;
  versionId: string;
  env: BuildEnvironment["name"];
  startTime: Date;
  status: "building" | "success" | "failed";
}

export function BuildTriggerDialog({
  open,
  onOpenChange,
  presetVersion,
  onBuildComplete,
}: BuildTriggerDialogProps) {
  const [step, setStep] = useState<"form" | "building">("form");
  const [selectedVersionId, setSelectedVersionId] = useState<string>(presetVersion?.id || "");
  const [selectedEnv, setSelectedEnv] = useState<BuildEnvironment["name"]>("development");
  const [versions, setVersions] = useState<Version[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [currentBuild, setCurrentBuild] = useState<BuildJob | null>(null);

  const environments = getBuildEnvironments();

  // 加载版本列表
  const loadVersions = async () => {
    setLoadingVersions(true);
    try {
      const data = await getVersions(1, 50, "all");
      setVersions(data.data || []);
    } catch (e) {
      console.error("Failed to load versions:", e);
    }
    setLoadingVersions(false);
  };

  // 打开时如果需要版本列表且没有传入 presetVersion，加载版本列表
  useEffect(() => {
    if (open && !presetVersion) {
      loadVersions();
    }
    if (open) {
      setSelectedVersionId(presetVersion?.id || "");
      setStep("form");
      setCurrentBuild(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleTrigger = async () => {
    const version = versions.find((v) => v.id === selectedVersionId) || presetVersion;
    if (!version) return;

    const buildId = `build-${Date.now()}`;
    const buildJob: BuildJob = {
      id: buildId,
      versionName: version.version,
      versionId: version.id,
      env: selectedEnv,
      startTime: new Date(),
      status: "building",
    };

    setCurrentBuild(buildJob);
    setStep("building");

    try {
      const res = await fetch("/api/v1/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: version.id,
          versionName: version.version,
          versionNumber: version.version,
          triggeredBy: 'user',
          triggerType: 'manual',
        }),
      });
      if (!res.ok) {
        throw new Error("Build API error");
      }
    } catch (e) {
      console.error("Build trigger API error:", e);
    }
  };

  const handleBuildComplete = (status: "success" | "failed") => {
    if (currentBuild) {
      setCurrentBuild({ ...currentBuild, status });
      onBuildComplete?.(currentBuild.id, currentBuild.versionName, status);
    }
  };

  const selectedVersion = versions.find((v) => v.id === selectedVersionId) || presetVersion;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">
              {step === "form" ? "触发构建" : "构建中"}
            </h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {step === "form" ? (
            <div className="space-y-4">
              {/* 版本选择 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">目标版本</label>
                {presetVersion ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Badge>{presetVersion.version}</Badge>
                    <span className="text-sm text-muted-foreground">{presetVersion.title}</span>
                  </div>
                ) : (
                  <div className="relative">
                    {loadingVersions ? (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">加载中...</span>
                      </div>
                    ) : (
                      <select
                        value={selectedVersionId}
                        onChange={(e) => setSelectedVersionId(e.target.value)}
                        className="w-full p-2 border rounded-md bg-background text-sm"
                      >
                        <option value="">选择版本</option>
                        {versions.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.version} - {v.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* 环境选择 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">构建环境</label>
                <select
                  value={selectedEnv}
                  onChange={(e) => setSelectedEnv(e.target.value as BuildEnvironment["name"])}
                  className="w-full p-2 border rounded-md bg-background text-sm"
                >
                  {environments.map((env) => (
                    <option key={env.name} value={env.name}>
                      {env.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 预估信息 */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>预估构建时间：约 2-5 分钟</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4">
              {currentBuild && (
                <BuildProgress
                  buildId={currentBuild.id}
                  versionName={currentBuild.versionName}
                  onComplete={handleBuildComplete}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t">
          {step === "form" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                onClick={handleTrigger}
                disabled={!selectedVersion && !selectedVersionId}
              >
                <Play className="w-4 h-4 mr-1" />
                开始构建
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
