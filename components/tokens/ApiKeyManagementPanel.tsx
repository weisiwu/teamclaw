"use client";

import { useState } from "react";
import { useApiTokenList, useCreateApiToken, useUpdateApiToken, useDeleteApiToken, useVerifyApiToken } from "@/hooks/useApiTokens";
import { useToast } from "@/components/ui/toast";
import {
  API_TOKEN_PROVIDERS,
  API_TOKEN_STATUS_OPTIONS,
  type ApiToken,
  type ApiTokenProvider,
  type ApiTokenStatus,
  type CreateApiTokenRequest,
  type UpdateApiTokenRequest,
} from "@/lib/api/apiTokens";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Pencil, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const PROVIDER_COLORS: Record<string, string> = {
  openai: "bg-green-100 text-green-700",
  anthropic: "bg-orange-100 text-orange-700",
  deepseek: "bg-blue-100 text-blue-700",
  custom: "bg-gray-100 text-gray-700",
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
  custom: "自定义",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  disabled: "bg-gray-100 text-gray-600",
  expired: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  active: "活跃",
  disabled: "禁用",
  expired: "过期",
};

interface TokenFormData {
  alias: string;
  provider: string;
  apiKey: string;
  baseUrl: string;
  models: string;
  monthlyBudget: string;
  notes: string;
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-muted-foreground mb-4">暂无 API Token</p>
        <Button onClick={onAdd} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          添加 Token
        </Button>
      </CardContent>
    </Card>
  );
}

function TokenRow({
  token,
  onEdit,
  onDelete,
  onToggle,
  onVerify,
  verifying,
  deleting,
  toggling,
}: {
  token: ApiToken;
  onEdit: (t: ApiToken) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, status: string) => void;
  onVerify: (id: string) => void;
  verifying: boolean;
  deleting: boolean;
  toggling: boolean;
}) {
  const isBusy = verifying || deleting || toggling;
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
      {/* Alias + Provider */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${PROVIDER_COLORS[token.provider] || PROVIDER_COLORS.custom}`}
          >
            {PROVIDER_LABELS[token.provider] || token.provider}
          </span>
          <span className="font-medium text-sm">{token.alias}</span>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span
          className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[token.status] || STATUS_COLORS.disabled}`}
        >
          {STATUS_LABELS[token.status] || token.status}
        </span>
      </td>

      {/* Monthly Usage / Budget */}
      <td className="px-4 py-3 text-sm hidden sm:table-cell">
        {token.monthlyBudget ? (
          <span>
            ${token.monthlyUsage.toFixed(2)}{" "}
            <span className="text-muted-foreground">/ ${token.monthlyBudget}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      {/* Call Count */}
      <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
        {token.callCount > 0 ? token.callCount.toLocaleString() : "—"}
      </td>

      {/* Last Used */}
      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
        {token.lastUsedAt
          ? new Date(token.lastUsedAt).toLocaleDateString("zh-CN")
          : "—"}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {/* Verify */}
          <button
            onClick={() => onVerify(token.id)}
            disabled={verifying || isBusy}
            className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors disabled:opacity-40"
            title="验证连接"
          >
            {verifying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Toggle status */}
          <button
            onClick={() =>
              onToggle(token.id, token.status === "active" ? "disabled" : "active")
            }
            disabled={toggling || isBusy}
            className={`p-1.5 rounded transition-colors disabled:opacity-40 ${
              token.status === "active"
                ? "text-green-500 hover:text-green-700"
                : "text-gray-400 hover:text-green-600"
            }`}
            title={token.status === "active" ? "禁用" : "启用"}
          >
            {toggling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : token.status === "active" ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Edit */}
          <button
            onClick={() => onEdit(token)}
            disabled={isBusy}
            className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors disabled:opacity-40"
            title="编辑"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(token.id)}
            disabled={deleting || isBusy}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors disabled:opacity-40"
            title="删除"
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}

function TokenForm({
  editing,
  onSubmit,
  onCancel,
  submitting,
}: {
  editing?: ApiToken | null;
  onSubmit: (data: TokenFormData) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<TokenFormData>({
    alias: editing?.alias || "",
    provider: editing?.provider || "openai",
    apiKey: "",
    baseUrl: editing?.baseUrl || "",
    models: editing?.models?.join(", ") || "",
    monthlyBudget: editing?.monthlyBudget?.toString() || "",
    notes: editing?.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const models = form.models
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    await onSubmit({
      ...form,
      apiKey: form.apiKey || (editing ? "___KEEP___" : ""),
      monthlyBudget: form.monthlyBudget ? parseFloat(form.monthlyBudget) : undefined,
      models,
    } as TokenFormData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">名称（别名）</label>
        <Input
          value={form.alias}
          onChange={(e) => setForm({ ...form, alias: e.target.value })}
          placeholder="例如：生产环境 OpenAI"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Provider</label>
          <select
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {API_TOKEN_PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">月度预算 (USD)</label>
          <Input
            type="number"
            step="0.01"
            value={form.monthlyBudget}
            onChange={(e) => setForm({ ...form, monthlyBudget: e.target.value })}
            placeholder="无限制"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">
          API Key {editing ? "（留空则不修改）" : ""}
        </label>
        <Input
          type="password"
          value={form.apiKey}
          onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          placeholder={editing ? "••••••••" : "sk-..."}
          required={!editing}
        />
      </div>

      {form.provider === "custom" && (
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Base URL</label>
          <Input
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
            placeholder="https://api.openai.com/v1"
          />
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">支持的模型</label>
        <Input
          value={form.models}
          onChange={(e) => setForm({ ...form, models: e.target.value })}
          placeholder="gpt-4, gpt-3.5-turbo（逗号分隔，留空表示全部）"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">备注</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="可选备注..."
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
      </div>

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          {editing ? "保存修改" : "创建 Token"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ApiKeyManagementPanel() {
  const [filters, setFilters] = useState({ provider: "all" as string, status: "all" as string, search: "" });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<ApiToken | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data, isLoading } = useApiTokenList({
    provider: filters.provider === "all" ? undefined : filters.provider as ApiTokenProvider,
    status: filters.status === "all" ? undefined : filters.status as ApiTokenStatus,
    search: filters.search || undefined,
    page,
    pageSize,
  });

  const createMutation = useCreateApiToken();
  const updateMutation = useUpdateApiToken();
  const deleteMutation = useDeleteApiToken();
  const verifyMutation = useVerifyApiToken();
  const { showToast } = useToast();

  const tokens = data?.data || [];
  const totalPages = data?.totalPages || 1;

  const handleCreate = async (formData: TokenFormData) => {
    setSubmitting(true);
    try {
      const body: CreateApiTokenRequest = {
        alias: formData.alias,
        provider: formData.provider as ApiTokenProvider,
        apiKey: formData.apiKey,
        baseUrl: formData.baseUrl || undefined,
        models: formData.models
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
        monthlyBudget: formData.monthlyBudget
          ? parseFloat(formData.monthlyBudget)
          : undefined,
        notes: formData.notes || undefined,
      };
      await createMutation.mutateAsync(body);
      setDialogOpen(false);
      showToast("API Token 创建成功", "success");
    } catch {
      showToast("创建失败，请重试", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (formData: TokenFormData) => {
    if (!editingToken) return;
    setSubmitting(true);
    try {
      const body: UpdateApiTokenRequest = {
        alias: formData.alias,
        provider: formData.provider as ApiTokenProvider,
        baseUrl: formData.baseUrl || undefined,
        models: formData.models
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
        monthlyBudget: formData.monthlyBudget
          ? parseFloat(formData.monthlyBudget)
          : undefined,
        notes: formData.notes || undefined,
      };
      if (formData.apiKey && formData.apiKey !== "___KEEP___") {
        body.apiKey = formData.apiKey;
      }
      await updateMutation.mutateAsync({ id: editingToken.id, body });
      setDialogOpen(false);
      setEditingToken(null);
      showToast("API Token 更新成功", "success");
    } catch {
      showToast("更新失败，请重试", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个 API Token 吗？")) return;
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
      showToast("API Token 已删除", "success");
    } catch {
      showToast("删除失败，请重试", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (id: string, newStatus: string) => {
    setTogglingId(id);
    try {
      await updateMutation.mutateAsync({
        id,
        body: { status: newStatus as ApiTokenStatus },
      });
      showToast(newStatus === "active" ? "Token 已启用" : "Token 已禁用", "success");
    } catch {
      showToast("状态切换失败，请重试", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      const result = await verifyMutation.mutateAsync(id);
      if (result.success) {
        showToast(`验证成功！延迟 ${result.latencyMs}ms`, "success");
      } else {
        showToast(`验证失败: ${result.error}`, "error");
      }
    } catch {
      showToast("验证请求失败，请重试", "error");
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">API Key 管理</h2>
          <p className="text-sm text-muted-foreground">
            管理 API Token 的访问凭证
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingToken(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" />
          新建 Token
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap sm:flex-nowrap">
        <Input
          placeholder="搜索 Token 名称..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="w-full sm:w-48"
        />
        <select
          value={filters.provider}
          onChange={(e) => setFilters({ ...filters, provider: e.target.value })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2"
        >
          <option value="all">全部 Provider</option>
          {API_TOKEN_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2"
        >
          <option value="all">全部状态</option>
          {API_TOKEN_STATUS_OPTIONS.filter((s) => s.value !== "all").map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : tokens.length === 0 ? (
        <EmptyState
          onAdd={() => {
            setEditingToken(null);
            setDialogOpen(true);
          }}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Token</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">状态</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">月度用量</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">调用次数</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">最后使用</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <TokenRow
                    key={token.id}
                    token={token}
                    onEdit={(t) => {
                      setEditingToken(t);
                      setDialogOpen(true);
                    }}
                    onDelete={handleDelete}
                    onToggle={handleToggle}
                    onVerify={handleVerify}
                    verifying={verifyingId === token.id}
                    deleting={deletingId === token.id}
                    toggling={togglingId === token.id}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">
                第 {page} / {totalPages} 页，共 {data?.total || 0} 条
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          title={editingToken ? "编辑 API Token" : "新建 API Token"}
          onClose={() => {
            setDialogOpen(false);
            setEditingToken(null);
          }}
        >
          <TokenForm
            editing={editingToken}
            onSubmit={editingToken ? handleEdit : handleCreate}
            onCancel={() => {
              setDialogOpen(false);
              setEditingToken(null);
            }}
            submitting={submitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
