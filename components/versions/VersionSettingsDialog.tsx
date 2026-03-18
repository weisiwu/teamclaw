/**
 * VersionSettingsDialog Component
 * 版本自动升级设置对话框
 */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Settings, Save, Loader2, History } from "lucide-react";

interface VersionSettings {
  autoBump: boolean;
  bumpType: 'patch' | 'minor' | 'major';
}

interface ReleaseLog {
  id: string;
  versionId: string;
  version: string;
  previousVersion: string;
  bumpType: string;
  releasedAt: string;
  releasedBy: string;
}

interface VersionSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VersionSettings;
  onSaveSettings: (settings: VersionSettings) => void;
  isSaving: boolean;
  releaseLogs?: ReleaseLog[];
}

export function VersionSettingsDialog({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  isSaving,
  releaseLogs = [],
}: VersionSettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState<VersionSettings>(settings);
  const [activeTab, setActiveTab] = useState<'settings' | 'logs'>('settings');

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 对话框 */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* 标题 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h2 className="text-lg font-semibold">版本自动升级设置</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b">
          <button
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'settings' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="w-4 h-4 inline mr-1" />
            升级规则
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'logs' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('logs')}
          >
            <History className="w-4 h-4 inline mr-1" />
            发布记录
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'settings' ? (
            <div className="space-y-6">
              {/* 自动升级开关 */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">自动版本号递增</h3>
                      <p className="text-sm text-gray-500">版本发布时自动递增版本号</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.autoBump}
                        onChange={(e) => setLocalSettings({ ...localSettings, autoBump: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* 递增类型选择 */}
              {localSettings.autoBump && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">递增类型</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[
                        { value: 'patch', label: 'Patch (x.x.1)', desc: '修复问题时使用' },
                        { value: 'minor', label: 'Minor (x.1.0)', desc: '新增功能时使用' },
                        { value: 'major', label: 'Major (1.0.0)', desc: '破坏性变更时使用' },
                      ].map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                            localSettings.bumpType === option.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="bumpType"
                            value={option.value}
                            checked={localSettings.bumpType === option.value}
                            onChange={() => setLocalSettings({ ...localSettings, bumpType: option.value as 'patch' | 'minor' | 'major' })}
                            className="mr-3"
                          />
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-gray-500">{option.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 预览 */}
              {localSettings.autoBump && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    当前版本 <span className="font-mono font-bold">v1.0.0</span> 发布后将自动升级为{' '}
                    <span className="font-mono font-bold text-blue-600">
                      v1.0.{localSettings.bumpType === 'patch' ? '1' : localSettings.bumpType === 'minor' ? '1.0' : '0.0.0'}
                    </span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* 发布记录 */
            <div className="space-y-3">
              {releaseLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无发布记录
                </div>
              ) : (
                releaseLogs.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{log.previousVersion}</span>
                            <span className="text-gray-400">→</span>
                            <span className="font-mono font-medium text-blue-600">{log.version}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              log.bumpType === 'major' ? 'bg-red-100 text-red-700' :
                              log.bumpType === 'minor' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {log.bumpType}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(log.releasedAt).toLocaleString('zh-CN')} · {log.releasedBy}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            保存设置
          </Button>
        </div>
      </div>
    </div>
  );
}

export default VersionSettingsDialog;
