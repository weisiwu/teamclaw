"use client";

import { useState, useMemo } from "react";
import { useBindingsOverview } from "@/hooks/useAgentTokenBindings";
import { useAgentList } from "@/hooks/useAgents";
import { useApiTokenList } from "@/hooks/useApiTokens";
import { useCreateBinding, useUpdateBinding, useDeleteBinding } from "@/hooks/useAgentTokenBindings";
import { AgentTokenBinding, BindingLevel } from "@/lib/api/agentTokenBindings";
import { ApiToken } from "@/lib/api/apiTokens";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Loader2, Key, AlertTriangle, Trash2 } from "lucide-react";

const LEVEL_OPTIONS: { value: BindingLevel; label: string; short: string }[] = [
  { value: "light", label: "Light", short: "L" },
  { value: "medium", label: "Medium", short: "M" },
  { value: "strong", label: "Strong", short: "S" },
];

const PROVIDER_COLORS: Record<string, string> = {
  openai: "bg-green-100 text-green-700",
  anthropic: "bg-orange-100 text-orange-700",
  deepseek: "bg-blue-100 text-blue-700",
  custom: "bg-gray-100 text-gray-700",
};

interface BindingConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
  tokenId?: string;
  binding?: AgentTokenBinding | null;
  tokens: ApiToken[];
  agents: string[];
  onSave: (data: {
    tokenId: string;
    priority: number;
    levels: BindingLevel[];
    models: string[];
    enabled: boolean;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  defaultPriority?: number;
}

function BindingConfigDialog({
  open,
  onOpenChange,
  agentName,
  tokenId: initialTokenId,
  binding,
  tokens,
  onSave,
  onDelete,
  defaultPriority = 1,
}: BindingConfigDialogProps) {
  const [tokenId, setTokenId] = useState(initialTokenId || binding?.tokenId || "");
  const [priority, setPriority] = useState(binding?.priority ?? defaultPriority);
  const [levels, setLevels] = useState<BindingLevel[]>(binding?.levels || []);
  const [models, setModels] = useState<string[]>(binding?.models || []);
  const [enabled, setEnabled] = useState(binding?.enabled ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selectedToken = tokens.find(t => t.id === tokenId);

  const toggleLevel = (lv: BindingLevel) => {
    setLevels(prev => prev.includes(lv) ? prev.filter(l => l !== lv) : [...prev, lv]);
  };

  const toggleModel = (model: string) => {
    setModels(prev => prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model]);
  };

  const handleSave = async () => {
    if (!tokenId) return;
    setSubmitting(true);
    try {
      await onSave({ tokenId, priority, levels, models, enabled });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!binding?.id || !onDelete) return;
    if (!confirm("确定删除此绑定？")) return;
    setDeleting(true);
    try {
      await onDelete(binding.id);
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {binding ? "编辑绑定" : "添加 Token 绑定"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Agent */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Agent</label>
            <div className="text-sm font-semibold text-gray-900 px-3 py-2 bg-gray-50 rounded-lg">
              {agentName}
            </div>
          </div>

          {/* Token selector */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">选择 Token *</label>
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
            <p className="text-xs text-gray-400 mt-1">1 为最高优先级</p>
          </div>

          {/* Level filter */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">层级限定（空 = 全部适用）</label>
            <div className="flex gap-2">
              {LEVEL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleLevel(opt.value)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    levels.includes(opt.value)
                      ? "bg-blue-100 text-blue-700 border-blue-300"
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
              <label className="text-xs font-medium text-gray-500 block mb-1.5">模型限定（空 = 全部适用）</label>
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
        </div>

        <DialogFooter className="flex items-center gap-2">
          {binding && onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="mr-auto flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? "删除中..." : "删除"}
            </button>
          )}
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={submitting || !tokenId}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {binding ? "更新" : "添加"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MatrixCellProps {
  binding?: AgentTokenBinding;
  onClick: () => void;
}

function MatrixCell({ binding, onClick }: MatrixCellProps) {
  if (!binding) {
    return (
      <button
        onClick={onClick}
        className="w-full h-10 flex items-center justify-center text-gray-300 hover:bg-gray-50 hover:text-gray-500 rounded transition-colors text-xs"
        title="添加绑定"
      >
        —
      </button>
    );
  }

  if (!binding.enabled) {
    return (
      <button
        onClick={onClick}
        className="w-full h-10 flex items-center justify-center gap-0.5 bg-red-50 rounded hover:bg-red-100 transition-colors"
        title={`P${binding.priority} · 已禁用`}
      >
        <span className="text-xs text-red-400">P{binding.priority}</span>
        {binding.levels.slice(0, 2).map(lv => {
          const opt = LEVEL_OPTIONS.find(o => o.value === lv);
          return (
            <span key={lv} className="text-xs text-red-400">{opt?.short}</span>
          );
        })}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full h-10 flex items-center justify-center gap-0.5 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
      title={`P${binding.priority} · ${binding.levels.join(",") || "全部层级"} · ${binding.models.length || "全部"}模型`}
    >
      <span className="text-xs text-blue-700 font-semibold">P{binding.priority}</span>
      {binding.levels.slice(0, 2).map(lv => {
        const opt = LEVEL_OPTIONS.find(o => o.value === lv);
        return (
          <span key={lv} className="text-xs text-blue-500">{opt?.short}</span>
        );
      })}
    </button>
  );
}

export default function AgentTokensPage() {
  const { data: overviewData, isLoading: overviewLoading } = useBindingsOverview();
  const { data: agentsData, isLoading: agentsLoading } = useAgentList();
  const { data: tokensData, isLoading: tokensLoading } = useApiTokenList({ status: "active", pageSize: 100 });

  const createBinding = useCreateBinding();
  const updateBinding = useUpdateBinding();
  const deleteBinding = useDeleteBinding();

  const agents: string[] = agentsData?.map(a => a.name) || [];
  const tokens: ApiToken[] = tokensData?.data || [];

  // Build matrix: agentName → tokenId → binding
  const bindingMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, AgentTokenBinding>> = {};
    const overview = overviewData?.data;

    if (!overview) return matrix;

    for (const agentName of overview.agents) {
      matrix[agentName] = {};
    }
    for (const tokenEntry of overview.tokens) {
      for (const binding of tokenEntry.bindings) {
        if (!matrix[binding.agentName]) matrix[binding.agentName] = {};
        matrix[binding.agentName][binding.tokenId] = binding;
      }
    }
    return matrix;
  }, [overviewData]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAgent, setDialogAgent] = useState("");
  const [dialogBinding, setDialogBinding] = useState<AgentTokenBinding | null | undefined>(undefined);

  const handleCellClick = (agentName: string, tokenId?: string) => {
    const existing = tokenId ? bindingMatrix[agentName]?.[tokenId] : undefined;
    setDialogAgent(agentName);
    setDialogBinding(existing);
    setDialogOpen(true);
  };

  const handleSave = async (data: {
    tokenId: string;
    priority: number;
    levels: BindingLevel[];
    models: string[];
    enabled: boolean;
  }) => {
    if (dialogBinding?.id) {
      await updateBinding.mutateAsync({
        id: dialogBinding.id,
        body: {
          priority: data.priority,
          levels: data.levels,
          models: data.models,
          enabled: data.enabled,
        },
      });
    } else {
      await createBinding.mutateAsync({
        agentName: dialogAgent,
        body: data,
      });
    }
  };

  const handleDelete = async (id: string) => {
    await deleteBinding.mutateAsync(id);
  };

  const isLoading = overviewLoading || agentsLoading || tokensLoading;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Key className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Token 分配</h1>
          <p className="text-sm text-gray-500">Agent × Token 绑定矩阵视图</p>
        </div>
      </div>

      {/* Stats bar */}
      {overviewData?.data && (
        <div className="flex gap-4 flex-wrap">
          <div className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-sm text-gray-500">Agent</span>
            <span className="text-lg font-bold text-gray-900">{overviewData.data.agents.length}</span>
          </div>
          <div className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-sm text-gray-500">已配置 Token</span>
            <span className="text-lg font-bold text-gray-900">{overviewData.data.tokens.length}</span>
          </div>
          <div className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-sm text-gray-500">总绑定数</span>
            <span className="text-lg font-bold text-blue-600">{overviewData.data.totalBindings}</span>
          </div>
        </div>
      )}

      {/* No tokens warning */}
      {tokens.length === 0 && !tokensLoading && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-700 font-medium">尚无活跃 Token</p>
            <p className="text-xs text-amber-600 mt-1">
              请先在{" "}
              <a href="/tokens" className="underline hover:text-amber-800">Token 管理</a>
              {" "}中添加 Token 后再进行绑定配置。
            </p>
          </div>
        </div>
      )}

      {/* Matrix table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : tokens.length === 0 ? null : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 sticky left-0 bg-gray-50 z-10 min-w-[120px]">
                    Agent
                  </th>
                  {tokens.map(token => (
                    <th key={token.id} className="text-center min-w-[100px] px-2 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${PROVIDER_COLORS[token.provider] || PROVIDER_COLORS.custom}`}>
                          {token.provider.toUpperCase()}
                        </span>
                        <span className="text-xs font-medium text-gray-700 max-w-[80px] truncate" title={token.alias}>
                          {token.alias}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.map(agentName => (
                  <tr key={agentName} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-2 sticky left-0 bg-white z-10">
                      <span className="text-sm font-medium text-gray-800">{agentName}</span>
                    </td>
                    {tokens.map(token => (
                      <td key={token.id} className="px-1 py-1">
                        <MatrixCell
                          binding={bindingMatrix[agentName]?.[token.id]}
                          onClick={() => handleCellClick(agentName, token.id)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {/* Token usage footer */}
              <tfoot>
                <tr className="bg-gray-50 border-t">
                  <td className="px-4 py-2 text-xs font-semibold text-gray-500 sticky left-0 bg-gray-50 z-10">
                    使用数
                  </td>
                  {tokens.map(token => {
                    const entry = overviewData?.data?.tokens.find(t => t.token.id === token.id);
                    const count = entry?.boundAgentCount || 0;
                    return (
                      <td key={token.id} className="px-1 py-2 text-center">
                        <span className={`text-xs font-bold ${count > 0 ? "text-gray-700" : "text-gray-300"}`}>
                          {count}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="font-semibold">图例：</span>
        <span>P = 优先级（1 最高）</span>
        <span>·</span>
        <span>L = Light</span>
        <span>M = Medium</span>
        <span>S = Strong</span>
        <span>·</span>
        <span className="text-gray-400">— = 未绑定</span>
        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-gray-700">已绑定</span>
        <span className="bg-red-50 text-red-400 px-1.5 py-0.5 rounded">已禁用</span>
      </div>

      {/* Config dialog */}
      <BindingConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agentName={dialogAgent}
        binding={dialogBinding}
        tokens={tokens}
        agents={agents}
        onSave={handleSave}
        onDelete={dialogBinding?.id ? handleDelete : undefined}
        defaultPriority={1}
      />
    </div>
  );
}
