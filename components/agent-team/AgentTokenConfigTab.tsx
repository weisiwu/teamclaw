"use client";

import { useState } from "react";
import { useBindingsByAgent, useCreateBinding, useUpdateBinding, useDeleteBinding } from "@/hooks/useAgentTokenBindings";
import { useApiTokenList } from "@/hooks/useApiTokens";
import { AgentTokenBinding, BindingLevel } from "@/lib/api/agentTokenBindings";
import { ApiToken } from "@/lib/api/apiTokens";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, AlertTriangle } from "lucide-react";

interface AgentTokenConfigTabProps {
  agentName: string;
}

const LEVEL_OPTIONS: { value: BindingLevel; label: string; color: string }[] = [
  { value: "light", label: "Light", color: "bg-green-100 text-green-700" },
  { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-700" },
  { value: "strong", label: "Strong", color: "bg-red-100 text-red-700" },
];

const PROVIDER_COLORS: Record<string, string> = {
  openai: "bg-green-50 text-green-700 border-green-200",
  anthropic: "bg-orange-50 text-orange-700 border-orange-200",
  deepseek: "bg-blue-50 text-blue-700 border-blue-200",
  custom: "bg-gray-50 text-gray-700 border-gray-200",
};

function BindingRow({ binding, tokens, onEdit, onDelete }: {
  binding: AgentTokenBinding;
  tokens: ApiToken[];
  onEdit: (b: AgentTokenBinding) => void;
  onDelete: (id: string) => void;
}) {
  const token = tokens.find(t => t.id === binding.tokenId);
  const providerColor = token ? PROVIDER_COLORS[token.provider] || PROVIDER_COLORS.custom : PROVIDER_COLORS.custom;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      {/* Token info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded border ${providerColor}`}>
            {token?.provider.toUpperCase() || "—"}
          </span>
          <span className="text-sm font-medium text-gray-900 truncate">
            {token?.alias || binding.tokenId}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">P{binding.priority}</span>
          {binding.levels.length > 0 ? (
            binding.levels.map(lv => {
              const opt = LEVEL_OPTIONS.find(o => o.value === lv);
              return (
                <span key={lv} className={`text-xs px-1.5 py-0.5 rounded ${opt?.color}`}>
                  {opt?.label}
                </span>
              );
            })
          ) : (
            <span className="text-xs text-gray-400">全部层级</span>
          )}
          {binding.models.length > 0 && (
            <span className="text-xs text-gray-400">· {binding.models.length} 模型</span>
          )}
        </div>
      </div>

      {/* Enabled switch */}
      <Switch
        checked={binding.enabled}
        onCheckedChange={() => onEdit(binding)}
      />

      {/* Delete */}
      <button
        onClick={() => onDelete(binding.id)}
        className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
        title="删除绑定"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

interface BindingFormData {
  tokenId: string;
  priority: number;
  levels: BindingLevel[];
  models: string[];
  enabled: boolean;
}

interface BindingFormProps {
  agentName: string;
  tokens: ApiToken[];
  editingBinding?: AgentTokenBinding | null;
  defaultPriority: number;
  onSubmit: (data: BindingFormData) => Promise<void>;
  onCancel: () => void;
}

function BindingForm({ tokens, editingBinding, defaultPriority, onSubmit, onCancel }: BindingFormProps) {
  const [tokenId, setTokenId] = useState(editingBinding?.tokenId || "");
  const [priority, setPriority] = useState(editingBinding?.priority ?? defaultPriority);
  const [levels, setLevels] = useState<BindingLevel[]>(editingBinding?.levels || []);
  const [models, setModels] = useState<string[]>(editingBinding?.models || []);
  const [enabled, setEnabled] = useState(editingBinding?.enabled ?? true);
  const [submitting, setSubmitting] = useState(false);

  const selectedToken = tokens.find(t => t.id === tokenId);

  const toggleLevel = (lv: BindingLevel) => {
    setLevels(prev => prev.includes(lv) ? prev.filter(l => l !== lv) : [...prev, lv]);
  };

  const toggleModel = (model: string) => {
    setModels(prev => prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenId) return;
    setSubmitting(true);
    try {
      await onSubmit({ tokenId, priority, levels, models, enabled });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Token selector */}
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1.5">选择 Token</label>
        <select
          value={tokenId}
          onChange={e => { setTokenId(e.target.value); setModels([]); }}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        >
          <option value="">请选择 Token...</option>
          {tokens.map(t => (
            <option key={t.id} value={t.id}>
              [{t.provider.toUpperCase()}] {t.alias}
            </option>
          ))}
        </select>
      </div>

      {/* Priority */}
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1.5">优先级</label>
        <input
          type="number"
          min={1}
          value={priority}
          onChange={e => setPriority(Number(e.target.value))}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <p className="text-xs text-gray-400 mt-1">1 为最高优先级，数字越大优先级越低</p>
      </div>

      {/* Level filter */}
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1.5">层级限定（空 = 全部）</label>
        <div className="flex gap-2">
          {LEVEL_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleLevel(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                levels.includes(opt.value)
                  ? `${opt.color} border-current`
                  : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Model filter */}
      {selectedToken && selectedToken.models.length > 0 && (
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1.5">模型限定（空 = 全部）</label>
          <div className="flex flex-wrap gap-1.5">
            {selectedToken.models.map(model => (
              <button
                key={model}
                type="button"
                onClick={() => toggleModel(model)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  models.includes(model)
                    ? "bg-blue-100 text-blue-700 border-blue-300"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                }`}
              >
                {model}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Enabled */}
      <div className="flex items-center gap-3">
        <Switch checked={enabled} onCheckedChange={setEnabled} />
        <span className="text-sm text-gray-700">启用此绑定</span>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={submitting || !tokenId}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {editingBinding ? "更新绑定" : "添加绑定"}
        </button>
      </div>
    </form>
  );
}

export function AgentTokenConfigTab({ agentName }: AgentTokenConfigTabProps) {
  const { data: bindingsData, isLoading } = useBindingsByAgent(agentName);
  const { data: tokensData } = useApiTokenList({ status: "active", pageSize: 100 });
  const createBinding = useCreateBinding();
  const updateBinding = useUpdateBinding();
  const deleteBinding = useDeleteBinding();

  const bindings: AgentTokenBinding[] = bindingsData?.data || [];
  const tokens: ApiToken[] = tokensData?.data || [];
  const maxPriority = bindings.length > 0 ? Math.max(...bindings.map(b => b.priority)) + 1 : 1;

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBinding, setEditingBinding] = useState<AgentTokenBinding | null>(null);

  const handleSubmit = async (data: BindingFormData) => {
    if (editingBinding) {
      await updateBinding.mutateAsync({
        id: editingBinding.id,
        body: {
          priority: data.priority,
          levels: data.levels,
          models: data.models,
          enabled: data.enabled,
        },
      });
    } else {
      await createBinding.mutateAsync({ agentName, body: data });
    }
    setShowAddForm(false);
    setEditingBinding(null);
  };

  const handleEdit = (binding: AgentTokenBinding) => {
    setEditingBinding(binding);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除此 Token 绑定吗？")) return;
    await deleteBinding.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* No bindings warning */}
      {bindings.length === 0 && !showAddForm && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-700 font-medium">该 Agent 尚未配置专属 Token</p>
            <p className="text-xs text-amber-600 mt-1">
              将使用系统全局环境变量中的 API Key。
            </p>
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {showAddForm ? (
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <h5 className="text-sm font-semibold text-gray-700 mb-4">
            {editingBinding ? "编辑绑定" : "添加 Token 绑定"}
          </h5>
          <BindingForm
            agentName={agentName}
            tokens={tokens}
            editingBinding={editingBinding}
            defaultPriority={maxPriority}
            onSubmit={handleSubmit}
            onCancel={() => { setShowAddForm(false); setEditingBinding(null); }}
          />
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-semibold text-gray-700">
              已绑定 Token ({bindings.length})
            </h5>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="w-4 h-4" /> 添加绑定
            </button>
          </div>

          {bindings.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">暂无绑定</p>
          ) : (
            <div className="space-y-2">
              {[...bindings]
                .sort((a, b) => a.priority - b.priority)
                .map(binding => (
                  <BindingRow
                    key={binding.id}
                    binding={binding}
                    tokens={tokens}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
