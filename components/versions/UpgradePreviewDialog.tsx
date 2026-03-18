/**
 * UpgradePreviewDialog Component
 * 版本升级预览对话框
 */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, CheckCircle, ArrowRight, Loader2 } from "lucide-react";

interface UpgradeChange {
  field: string;
  oldValue: string;
  newValue: string;
}

interface UpgradePreview {
  currentVersion: string;
  newVersion: string;
  bumpType: string;
  changes: UpgradeChange[];
}

interface UpgradePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  preview: UpgradePreview | null;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  version: '版本号',
  bumpType: '递增类型',
  status: '状态',
  tags: '标签',
};

const BUMP_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  major: { label: 'Major (破坏性变更)', color: 'bg-red-100 text-red-700' },
  minor: { label: 'Minor (新增功能)', color: 'bg-yellow-100 text-yellow-700' },
  patch: { label: 'Patch (修复问题)', color: 'bg-green-100 text-green-700' },
  custom: { label: 'Custom (自定义)', color: 'bg-blue-100 text-blue-700' },
};

export function UpgradePreviewDialog({
  isOpen,
  onClose,
  preview,
  isLoading,
  onConfirm,
  onCancel,
  isConfirming,
}: UpgradePreviewDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">升级预览</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : preview ? (
            <div className="space-y-4">
              {/* Version Change */}
              <div className="flex items-center justify-center gap-4 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">当前版本</p>
                  <p className="text-2xl font-mono font-bold text-gray-700">
                    {preview.currentVersion}
                  </p>
                </div>
                <ArrowRight className="w-8 h-8 text-blue-500" />
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">新版本</p>
                  <p className="text-2xl font-mono font-bold text-blue-600">
                    {preview.newVersion}
                  </p>
                </div>
              </div>

              {/* Bump Type */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">递增类型</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      BUMP_TYPE_LABELS[preview.bumpType]?.color || 'bg-gray-100 text-gray-700'
                    }`}>
                      {BUMP_TYPE_LABELS[preview.bumpType]?.label || preview.bumpType}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Changes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">变更详情</CardTitle>
                </CardHeader>
                <CardContent>
                  {preview.changes.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">无变更</p>
                  ) : (
                    <div className="space-y-3">
                      {preview.changes.map((change, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {FIELD_LABELS[change.field] || change.field}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-red-600 line-through">
                                {change.oldValue || '(空)'}
                              </span>
                              <ArrowRight className="w-3 h-3 text-gray-400" />
                              <span className="text-sm text-green-600 font-medium">
                                {change.newValue}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">无法生成预览</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isConfirming}>
            取消
          </Button>
          <Button onClick={onConfirm} disabled={isLoading || isConfirming}>
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                确认中...
              </>
            ) : (
              '确认升级'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default UpgradePreviewDialog;
