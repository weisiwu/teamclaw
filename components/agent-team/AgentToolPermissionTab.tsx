'use client';

import { useState } from 'react';
import {
  useAgentToolPermissions,
  useSetAgentToolBindings,
} from '@/hooks/useAgentToolBindings';
import { Switch } from '@/components/ui/switch';
import {
  Loader2,
  Save,
  AlertTriangle,
  CheckCircle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  file: '📁 文件操作',
  git: '🔀 Git 版本控制',
  shell: '💻 Shell 执行',
  api: '🌐 API 调用',
  browser: '🌐 浏览器操作',
  custom: '⚙️ 自定义工具',
};

const RISK_COLORS: Record<string, string> = {
  low: 'text-green-600 bg-green-50 border-green-200',
  medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  high: 'text-red-600 bg-red-50 border-red-200',
};

interface ToolPermissionRowProps {
  toolId: string;
  toolName: string;
  toolDisplayName: string;
  toolCategory: string;
  toolRiskLevel: string;
  toolEnabled: boolean;
  toolRequiresApproval: boolean;
  enabled: boolean;
  requiresApproval: boolean;
  hasExplicitBinding: boolean;
  onToggle: (toolId: string, enabled: boolean) => void;
  onToggleApproval: (toolId: string, requiresApproval: boolean) => void;
  pendingChanges: Set<string>;
}

function ToolPermissionRow({
  toolId,
  toolDisplayName,
  toolRiskLevel,
  toolEnabled,
  toolRequiresApproval,
  enabled,
  requiresApproval,
  hasExplicitBinding,
  onToggle,
  onToggleApproval,
  pendingChanges,
}: ToolPermissionRowProps) {
  const riskColor = RISK_COLORS[toolRiskLevel] || RISK_COLORS.medium;
  const isToolDisabled = !toolEnabled;
  const isModified = pendingChanges.has(toolId);

  return (
    <div
      className={[
        'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all',
        isToolDisabled
          ? 'opacity-50 bg-gray-50 border-gray-100'
          : isModified
          ? 'bg-blue-50 border-blue-200'
          : 'bg-white border-gray-100 hover:border-gray-200',
      ].join(' ')}
    >
      {/* Tool info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{toolDisplayName}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded border ${riskColor}`}>
            {toolRiskLevel === 'high' ? '🔴高风险' : toolRiskLevel === 'medium' ? '🟡中风险' : '🟢低风险'}
          </span>
          {isToolDisabled && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 border border-gray-200">
              Tool已禁用
            </span>
          )}
          {hasExplicitBinding && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 border border-blue-200">
              自定义
            </span>
          )}
        </div>
        {toolRequiresApproval && (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-amber-500">
            <ShieldAlert className="w-3 h-3" />
            Tool默认需要审批
          </div>
        )}
      </div>

      {/* 审批覆盖开关 */}
      {requiresApproval || toolRequiresApproval ? (
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" title="需要审批" />
          <Switch
            checked={requiresApproval}
            onCheckedChange={(v) => onToggleApproval(toolId, v)}
            disabled={isToolDisabled}
            size="sm"
          />
        </div>
      ) : (
        <div className="w-9" title="该Tool默认不需要审批" />
      )}

      {/* 启用开关 */}
      <Switch
        checked={enabled}
        onCheckedChange={(v) => onToggle(toolId, v)}
        disabled={isToolDisabled}
      />
    </div>
  );
}

interface CategoryGroupProps {
  category: string;
  tools: ToolPermissionRowProps[];
  onToggle: (toolId: string, enabled: boolean) => void;
  onToggleApproval: (toolId: string, requiresApproval: boolean) => void;
  pendingChanges: Set<string>;
}

function CategoryGroup({
  category,
  tools,
  onToggle,
  onToggleApproval,
  pendingChanges,
}: CategoryGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChanges = tools.some(t => pendingChanges.has(t.toolId));

  return (
    <div className="space-y-1">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-gray-50 rounded-lg transition-colors text-left"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
        <span className="text-sm font-semibold text-gray-700">
          {CATEGORY_LABELS[category] || category}
        </span>
        <span className="text-xs text-gray-400">
          ({tools.filter(t => t.enabled).length}/{tools.length})
        </span>
        {hasChanges && (
          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
        )}
      </button>

      {!collapsed && (
        <div className="space-y-1.5 pl-2">
          {tools.map(tool => (
            <ToolPermissionRow
              key={tool.toolId}
              {...tool}
              onToggle={onToggle}
              onToggleApproval={onToggleApproval}
              pendingChanges={pendingChanges}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AgentToolPermissionTabProps {
  agentName: string;
}

export function AgentToolPermissionTab({ agentName }: AgentToolPermissionTabProps) {
  const { data: permissions, isLoading, error } = useAgentToolPermissions(agentName);
  const setBindings = useSetAgentToolBindings();

  // 本地变更状态
  const [localBindings, setLocalBindings] = useState<Record<string, { enabled: boolean; requiresApproval: boolean }>>({});
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // 初始化本地状态
  const effectivePermissions = (permissions || []).map(p => ({
    ...p,
    enabled: localBindings[p.toolId]?.enabled ?? p.enabled,
    requiresApproval: localBindings[p.toolId]?.requiresApproval ?? p.requiresApproval,
  }));

  // 按分类分组
  const grouped = effectivePermissions.reduce<Record<string, typeof effectivePermissions>>((acc, p) => {
    if (!acc[p.toolCategory]) acc[p.toolCategory] = [];
    acc[p.toolCategory].push(p);
    return acc;
  }, {});

  const sortedCategories = Object.keys(grouped).sort();

  const handleToggle = (toolId: string, enabled: boolean) => {
    setLocalBindings(prev => ({
      ...prev,
      [toolId]: { ...prev[toolId], enabled, requiresApproval: prev[toolId]?.requiresApproval ?? effectivePermissions.find(p => p.toolId === toolId)?.requiresApproval ?? false },
    }));
    setPendingChanges(prev => new Set(prev).add(toolId));
    setSaved(false);
  };

  const handleToggleApproval = (toolId: string, requiresApproval: boolean) => {
    setLocalBindings(prev => ({
      ...prev,
      [toolId]: { ...prev[toolId], requiresApproval, enabled: prev[toolId]?.enabled ?? effectivePermissions.find(p => p.toolId === toolId)?.enabled ?? true },
    }));
    setPendingChanges(prev => new Set(prev).add(toolId));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const changed = Object.entries(localBindings)
        .filter(([toolId]) => pendingChanges.has(toolId))
        .map(([toolId, value]) => ({
          toolId,
          enabled: value.enabled,
          requiresApproval: value.requiresApproval,
        }));

      if (changed.length === 0) return;

      await setBindings.mutateAsync({ agentName, bindings: changed });

      setPendingChanges(new Set());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save tool permissions:', err);
    } finally {
      setSaving(false);
    }
  };

  const hasPendingChanges = pendingChanges.size > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
        加载工具权限数据失败
      </div>
    );
  }

  if (!permissions || permissions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        暂无可用工具
      </div>
    );
  }

  const enabledCount = effectivePermissions.filter(p => p.enabled).length;
  const totalCount = effectivePermissions.length;

  return (
    <div className="space-y-4">
      {/* 概览提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-blue-700 font-medium">
            {agentName} 的工具权限
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            已启用 {enabledCount}/{totalCount} 个工具。
            未显式绑定的工具默认跟随系统策略（allow_all）。
          </p>
        </div>
      </div>

      {/* 按分类展示 */}
      <div className="space-y-3">
        {sortedCategories.map(category => (
          <CategoryGroup
            key={category}
            category={category}
            tools={grouped[category]}
            onToggle={handleToggle}
            onToggleApproval={handleToggleApproval}
            pendingChanges={pendingChanges}
          />
        ))}
      </div>

      {/* 批量提示 */}
      {hasPendingChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            有 {pendingChanges.size} 项变更待保存
          </p>
        </div>
      )}

      {/* 保存按钮 */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={!hasPendingChanges || saving}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            saved
              ? 'bg-green-500 text-white'
              : hasPendingChanges
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> 保存中...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="w-4 h-4" /> 已保存
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> 保存变更
            </>
          )}
        </button>
      </div>
    </div>
  );
}
