/**
 * UpgradeConfigDialog Component
 * 版本升级规则配置对话框
 */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Settings, Save, Loader2, GitBranch, Play, Clock } from "lucide-react";

interface VersionUpgradeConfig {
  id: string;
  versionId: string;
  bumpType: 'major' | 'minor' | 'patch' | 'custom';
  customPattern?: string;
  autoTrigger: boolean;
  triggerOn: ('create' | 'publish' | 'tag' | 'manual')[];
  enablePreview: boolean;
  historyRetention: number;
  createdAt: string;
  updatedAt: string;
}

interface UpgradeConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  versionId: string;
  versionName: string;
  initialConfig?: VersionUpgradeConfig | null;
  onSave: (config: Partial<VersionUpgradeConfig>) => void;
  onPreview: () => void;
  isSaving: boolean;
  isLoading: boolean;
}

const TRIGGER_OPTIONS = [
  { value: 'create', label: '创建版本时', icon: '➕' },
  { value: 'publish', label: '发布版本时', icon: '🚀' },
  { value: 'tag', label: '创建 Tag 时', icon: '🏷️' },
  { value: 'manual', label: '手动触发', icon: '👆' },
] as const;

const BUMP_OPTIONS = [
  { value: 'major', label: 'Major (x.0.0)', desc: '破坏性变更', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'minor', label: 'Minor (x.x.0)', desc: '新增功能', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'patch', label: 'Patch (x.x.x)', desc: '修复问题', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'custom', label: '自定义', desc: '使用自定义模式', color: 'bg-blue-100 text-blue-700 border-blue-200' },
] as const;

export function UpgradeConfigDialog({
  isOpen,
  onClose,
  versionId,
  versionName,
  initialConfig,
  onSave,
  onPreview,
  isSaving,
  isLoading,
}: UpgradeConfigDialogProps) {
  // Version ID for future use (e.g., API calls)
  console.debug('UpgradeConfigDialog versionId:', versionId);
  
  const [config, setConfig] = useState<Partial<VersionUpgradeConfig>>({
    bumpType: 'patch',
    autoTrigger: true,
    triggerOn: ['publish'],
    enablePreview: true,
    historyRetention: 30,
    customPattern: '',
  });

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  if (!isOpen) return null;

  const handleTriggerToggle = (trigger: 'create' | 'publish' | 'tag' | 'manual') => {
    const current = config.triggerOn || [];
    if (current.includes(trigger)) {
      setConfig({ ...config, triggerOn: current.filter(t => t !== trigger) });
    } else {
      setConfig({ ...config, triggerOn: [...current, trigger] });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h2 className="text-lg font-semibold">升级规则配置</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Version Info */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              配置版本 <span className="font-mono font-bold">{versionName}</span> 的自动升级规则
            </p>
          </div>

          {/* Auto Trigger */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="w-4 h-4" />
                自动触发
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium">启用自动升级</p>
                  <p className="text-sm text-gray-500">满足条件时自动升级版本号</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.autoTrigger ?? false}
                    onChange={(e) => setConfig({ ...config, autoTrigger: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {config.autoTrigger && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">触发条件</p>
                  <div className="grid grid-cols-2 gap-2">
                    {TRIGGER_OPTIONS.map(opt => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          config.triggerOn?.includes(opt.value)
                            ? 'bg-blue-50 border-blue-300'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={config.triggerOn?.includes(opt.value) ?? false}
                          onChange={() => handleTriggerToggle(opt.value)}
                          className="sr-only"
                        />
                        <span>{opt.icon}</span>
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bump Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                版本号递增类型
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {BUMP_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                      config.bumpType === opt.value
                        ? opt.color.replace('100', '50').replace('700', '600')
                        : 'hover:bg-gray-50'
                    } ${config.bumpType === opt.value ? 'border-current' : ''}`}
                  >
                    <input
                      type="radio"
                      name="bumpType"
                      value={opt.value}
                      checked={config.bumpType === opt.value}
                      onChange={() => setConfig({ ...config, bumpType: opt.value })}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-sm opacity-75">{opt.desc}</div>
                    </div>
                  </label>
                ))}

                {config.bumpType === 'custom' && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium mb-1">自定义模式</label>
                    <input
                      type="text"
                      value={config.customPattern || ''}
                      onChange={(e) => setConfig({ ...config, customPattern: e.target.value })}
                      placeholder="例如: v{{major}}.{{minor}}.0"
                      className="w-full px-3 py-2 border rounded-md text-sm font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      可用变量: {'{{major}}'}, {'{{minor}}'}, {'{{patch}}'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview & History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                其他设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">预览升级结果</p>
                  <p className="text-sm text-gray-500">触发前显示变更预览</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enablePreview ?? true}
                    onChange={(e) => setConfig({ ...config, enablePreview: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">历史保留天数</label>
                <input
                  type="number"
                  min={7}
                  max={365}
                  value={config.historyRetention || 30}
                  onChange={(e) => setConfig({ ...config, historyRetention: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between">
          <Button variant="outline" onClick={onPreview} disabled={isLoading}>
            <Loader2 className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            预览
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>取消</Button>
            <Button onClick={() => onSave(config)} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              保存
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpgradeConfigDialog;
