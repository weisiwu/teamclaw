/**
 * VersionSettingsDialog Component
 * 版本自动升级和自动 Tag 设置对话框
 */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Settings, Save, Loader2, History, Tag } from "lucide-react";
import { VERSION_STATUS_LABELS } from "@/lib/api/constants";

interface VersionSettings {
  autoBump: boolean;
  bumpType: 'patch' | 'minor' | 'major';
  autoTag: boolean;
  tagPrefix: 'v' | 'release' | 'version' | 'custom';
  customPrefix?: string;
  tagOnStatus?: string[];
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
  const defaultSettings: VersionSettings = {
    autoBump: true,
    bumpType: 'patch',
    autoTag: true,
    tagPrefix: 'v',
    tagOnStatus: ['published'],
  };
  const [localSettings, setLocalSettings] = useState<VersionSettings>({ ...defaultSettings, ...settings });
  const [activeTab, setActiveTab] = useState<'version' | 'tag' | 'logs'>('version');

  useEffect(() => {
    setLocalSettings(prev => ({ ...prev, ...settings }));
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h2 className="text-lg font-semibold">版本设置</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex border-b">
          <button
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'version' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('version')}
          >
            版本升级
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'tag' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('tag')}
          >
            <Tag className="w-4 h-4 inline mr-1" />
            自动 Tag
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'logs' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('logs')}
          >
            <History className="w-4 h-4 inline mr-1" />
            发布记录
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'version' && (
            <div className="space-y-6">
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

              {localSettings.autoBump && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">递增类型</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(['patch', 'minor', 'major'] as const).map((type) => (
                        <label
                          key={type}
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                            localSettings.bumpType === type ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="bumpType"
                            value={type}
                            checked={localSettings.bumpType === type}
                            onChange={() => setLocalSettings({ ...localSettings, bumpType: type })}
                            className="mr-3"
                          />
                          <div>
                            <div className="font-medium">{type === 'patch' ? 'Patch (x.x.1)' : type === 'minor' ? 'Minor (x.1.0)' : 'Major (1.0.0)'}</div>
                            <div className="text-sm text-gray-500">
                              {type === 'patch' ? '修复问题时使用' : type === 'minor' ? '新增功能时使用' : '破坏性变更时使用'}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'tag' && (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">自动创建 Git Tag</h3>
                      <p className="text-sm text-gray-500">版本发布时自动创建 Git Tag</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.autoTag}
                        onChange={(e) => setLocalSettings({ ...localSettings, autoTag: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {localSettings.autoTag && (
                <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tag 前缀</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(['v', 'release', 'version', 'custom'] as const).map((prefix) => (
                        <label
                          key={prefix}
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                            localSettings.tagPrefix === prefix ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="tagPrefix"
                            value={prefix}
                            checked={localSettings.tagPrefix === prefix}
                            onChange={() => setLocalSettings({ ...localSettings, tagPrefix: prefix })}
                            className="mr-3"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{prefix === 'v' ? 'v' : prefix === 'release' ? 'release' : prefix === 'version' ? 'version' : '自定义'}</div>
                            <div className="text-sm text-gray-500">
                              {prefix === 'v' ? '例如: v1.0.0' : prefix === 'release' ? '例如: release/v1.0.0' : prefix === 'version' ? '例如: version/v1.0.0' : '使用自定义前缀'}
                            </div>
                          </div>
                          <Tag className="w-5 h-5 text-gray-400" />
                        </label>
                      ))}
                    </div>

                    {localSettings.tagPrefix === 'custom' && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <label className="block text-sm font-medium mb-1">自定义前缀</label>
                        <input
                          type="text"
                          value={localSettings.customPrefix || ''}
                          onChange={(e) => setLocalSettings({ ...localSettings, customPrefix: e.target.value })}
                          placeholder="例如: myapp-"
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">触发时机</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-3">选择哪些状态变更时自动创建 Git Tag</p>
                    <div className="space-y-2">
                      {(['draft', 'published', 'archived'] as (keyof typeof VERSION_STATUS_LABELS)[]).map((status) => {
                        const isSelected = (localSettings.tagOnStatus || []).includes(status);
                        return (
                          <label
                            key={status}
                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const current = localSettings.tagOnStatus || ['published'];
                                const newStatus = e.target.checked
                                  ? [...current, status]
                                  : current.filter((s: string) => s !== status);
                                setLocalSettings({ ...localSettings, tagOnStatus: newStatus });
                              }}
                              className="mr-3 w-4 h-4"
                            />
                            <div>
                              <div className="font-medium">{VERSION_STATUS_LABELS[status]}</div>
                              <div className="text-sm text-gray-500">
                                {status === 'draft' && '版本创建为草稿时自动打 Tag'}
                                {status === 'published' && '版本发布时自动打 Tag'}
                                {status === 'archived' && '版本归档时自动打 Tag'}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {(localSettings.tagOnStatus || []).length === 0 && (
                      <p className="text-sm text-amber-600 mt-2">
                        ⚠️ 未选择任何状态，自动 Tag 将不会触发
                      </p>
                    )}
                  </CardContent>
                </Card>
                </>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3">
              {releaseLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">暂无发布记录</div>
              ) : (
                releaseLogs.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{log.previousVersion}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-mono font-medium text-blue-600">{log.version}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${log.bumpType === 'major' ? 'bg-red-100 text-red-700' : log.bumpType === 'minor' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {log.bumpType}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(log.releasedAt).toLocaleString('zh-CN')} · {log.releasedBy}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
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
