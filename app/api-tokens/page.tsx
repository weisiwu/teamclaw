"use client";

import { useState, useMemo } from "react";
import { Key, Plus, Search, CheckCircle, XCircle, Trash2, Edit2, RefreshCw, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  useApiTokenList,
  useCreateApiToken,
  useUpdateApiToken,
  useDeleteApiToken,
  useVerifyApiToken,
} from "@/hooks/useApiTokens";
import {
  API_TOKEN_PROVIDERS,
  API_TOKEN_STATUS_OPTIONS,
} from "@/lib/api/apiTokensClient";
import type {
  ApiToken,
  ApiTokenProvider,
  ApiTokenStatus,
  CreateApiTokenRequest,
  UpdateApiTokenRequest,
} from "@/lib/api/apiTokens";
import { cn } from "@/lib/utils";

// ============ Types ============

interface TokenFormData {
  alias: string;
  provider: ApiTokenProvider;
  apiKey: string;
  baseUrl: string;
  models: string;
  monthlyBudget: string;
  notes: string;
}

const EMPTY_FORM: TokenFormData = {
  alias: "",
  provider: "openai",
  apiKey: "",
  baseUrl: "",
  models: "",
  monthlyBudget: "",
  notes: "",
};

// ============ Sub-components ============

function UsageProgressBar({ usage, budget }: { usage: number; budget?: number }) {
  if (!budget || budget <= 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span>${usage.toFixed(2)}</span>
        <span className="text-xs">无预算限制</span>
      </div>
    );
  }
  const pct = Math.min((usage / budget) * 100, 100);
  const isOver = usage > budget;
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>${usage.toFixed(2)} / ${budget}</span>
        <span className={isOver ? "text-red-500 font-medium" : ""}>{pct.toFixed(0)}%</span>
      </div>
      <Progress
        value={pct}
        className={cn("h-1.5", isOver && "[&>div]:bg-red-500")}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: ApiTokenStatus }) {
  const variants: Record<ApiTokenStatus, "success" | "default" | "error"> = {
    active: "success",
    disabled: "default",
    expired: "error",
  };
  const labels: Record<ApiTokenStatus, string> = {
    active: "活跃",
    disabled: "禁用",
    expired: "过期",
  };
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}

function TokenRow({
  token,
  onEdit,
  onVerify,
  onDelete,
  onToggleStatus,
}: {
  token: ApiToken;
  onEdit: (t: ApiToken) => void;
  onVerify: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, current: ApiTokenStatus) => void;
}) {
  const providerLabel =
    API_TOKEN_PROVIDERS.find((p) => p.value === token.provider)?.label ?? token.provider;

  return (
    <tr className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
      {/* 别名 */}
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900 dark:text-gray-100">{token.alias}</div>
        {token.notes && (
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[160px]">
            {token.notes}
          </div>
        )}
      </td>
      {/* Provider */}
      <td className="px-4 py-3">
        <Badge variant="info">{providerLabel}</Badge>
      </td>
      {/* 状态 */}
      <td className="px-4 py-3">
        <StatusBadge status={token.status} />
      </td>
      {/* 月度用量 */}
      <td className="px-4 py-3 min-w-[160px]">
        <UsageProgressBar usage={token.monthlyUsage} budget={token.monthlyBudget} />
      </td>
      {/* 调用次数 */}
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
        {token.callCount.toLocaleString()}
      </td>
      {/* 最后使用 */}
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
        {token.lastUsedAt
          ? new Date(token.lastUsedAt).toLocaleDateString("zh-CN", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—"}
      </td>
      {/* 操作 */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            title="验证"
            onClick={() => onVerify(token.id)}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="编辑"
            onClick={() => onEdit(token)}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title={token.status === "active" ? "禁用" : "启用"}
            onClick={() =>
              onToggleStatus(
                token.id,
                token.status === "active" ? "disabled" : "active"
              )
            }
          >
            <Switch
              checked={token.status === "active"}
              size="sm"
              onCheckedChange={() =>
                onToggleStatus(
                  token.id,
                  token.status === "active" ? "disabled" : "active"
                )
              }
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="删除"
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => onDelete(token.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function TokenForm({
  initial,
  onSubmit,
  loading,
}: {
  initial?: ApiToken;
  onSubmit: (data: TokenFormData) => void;
  loading?: boolean;
}) {
  const [form, setForm] = useState<TokenFormData>(
    initial
      ? {
          alias: initial.alias,
          provider: initial.provider,
          apiKey: initial.apiKey && initial.apiKey.includes("*") ? "" : initial.apiKey,
          baseUrl: initial.baseUrl ?? "",
          models: initial.models.join(", "),
          monthlyBudget: initial.monthlyBudget?.toString() ?? "",
          notes: initial.notes ?? "",
        }
      : EMPTY_FORM
  );

  const set = (field: keyof TokenFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 别名 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          别名 <span className="text-red-500">*</span>
        </label>
        <Input
          value={form.alias}
          onChange={set("alias")}
          placeholder="如：公司 OpenAI 主账号"
          required
        />
      </div>

      {/* Provider */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Provider <span className="text-red-500">*</span>
        </label>
        <Select
          value={form.provider}
          onValueChange={(v) => setForm((f) => ({ ...f, provider: v as ApiTokenProvider }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {API_TOKEN_PROVIDERS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          API Key <span className="text-red-500">*</span>
        </label>
        <Input
          type="password"
          value={form.apiKey}
          onChange={set("apiKey")}
          placeholder={initial?.apiKey?.includes("*") ? "已保存（留空则不更新）" : "sk-..."}
          required={!initial}
        />
      </div>

      {/* Base URL */}
      {(form.provider === "custom" || form.provider === "openai") && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Base URL
          </label>
          <Input
            value={form.baseUrl}
            onChange={set("baseUrl")}
            placeholder="https://api.openai.com/v1"
          />
        </div>
      )}

      {/* 可用模型 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          可用模型
        </label>
        <Input
          value={form.models}
          onChange={set("models")}
          placeholder="gpt-4o, gpt-4o-mini（逗号分隔）"
        />
      </div>

      {/* 月度预算 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          月度预算（美元）
        </label>
        <Input
          type="number"
          min="0"
          step="1"
          value={form.monthlyBudget}
          onChange={set("monthlyBudget")}
          placeholder="可选，如 100"
        />
      </div>

      {/* 备注 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          备注
        </label>
        <textarea
          value={form.notes}
          onChange={set("notes")}
          placeholder="可选备注信息"
          rows={3}
          className="flex w-full rounded-lg border border-gray-300 dark:border-slate-500 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 dark:hover:border-slate-400 resize-none"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onSubmit(form as unknown as CreateApiTokenRequest)}>
          取消
        </Button>
        <Button type="submit" loading={loading}>
          {initial ? "保存" : "创建"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ============ Main Page ============

export default function ApiTokensPage() {
  // Filters
  const [providerFilter, setProviderFilter] = useState<ApiTokenProvider | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ApiTokenStatus | "all">("all");
  const [search, setSearch] = useState("");

  // Dialogs
  const [editTarget, setEditTarget] = useState<ApiToken | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // Mutations
  const createMutation = useCreateApiToken();
  const updateMutation = useUpdateApiToken();
  const deleteMutation = useDeleteApiToken();
  const verifyMutation = useVerifyApiToken();

  // Query
  const filters = useMemo(
    () => ({
      provider: providerFilter,
      status: statusFilter,
      search: search || undefined,
      page: 1,
      pageSize: 100,
    }),
    [providerFilter, statusFilter, search]
  );

  const { data, isLoading } = useApiTokenList(filters);

  const tokens: ApiToken[] = data?.data ?? [];

  // Handlers
  const handleCreate = async (formData: TokenFormData) => {
    try {
      const payload: CreateApiTokenRequest = {
        alias: formData.alias,
        provider: formData.provider,
        apiKey: formData.apiKey,
        baseUrl: formData.baseUrl || undefined,
        models: formData.models
          ? formData.models.split(",").map((m) => m.trim()).filter(Boolean)
          : [],
        monthlyBudget: formData.monthlyBudget ? parseFloat(formData.monthlyBudget) : undefined,
        notes: formData.notes || undefined,
      };
      await createMutation.mutateAsync(payload);
      setCreateOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEdit = async (formData: TokenFormData) => {
    if (!editTarget) return;
    try {
      const payload: UpdateApiTokenRequest = {
        alias: formData.alias,
        provider: formData.provider,
        apiKey: formData.apiKey || undefined,
        baseUrl: formData.baseUrl || undefined,
        models: formData.models
          ? formData.models.split(",").map((m) => m.trim()).filter(Boolean)
          : [],
        monthlyBudget: formData.monthlyBudget ? parseFloat(formData.monthlyBudget) : undefined,
        notes: formData.notes || undefined,
      };
      await updateMutation.mutateAsync({ id: editTarget.id, body: payload });
      setEditOpen(false);
      setEditTarget(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleStatus = async (id: string, newStatus: ApiTokenStatus) => {
    try {
      await updateMutation.mutateAsync({
        id,
        body: { status: newStatus },
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerify = async (id: string) => {
    setVerifyResult(null);
    try {
      const result = await verifyMutation.mutateAsync(id);
      setVerifyResult({
        id,
        success: result.success,
        message: result.success
          ? `验证成功${result.latencyMs ? `（${result.latencyMs}ms）` : ""}`
          : result.error || result.message || "验证失败",
      });
    } catch (e: unknown) {
      setVerifyResult({ id, success: false, message: (e as Error)?.message || "验证请求失败" });
    }
  };

  const openEdit = (token: ApiToken) => {
    setEditTarget(token);
    setEditOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="w-6 h-6" />
            API Token 管理
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            管理和验证平台的 AI API 凭证
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          新建 Token
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="搜索别名..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Provider filter */}
            <Select
              value={providerFilter}
              onValueChange={(v) => setProviderFilter(v as ApiTokenProvider | "all")}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部 Provider</SelectItem>
                {API_TOKEN_PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as ApiTokenStatus | "all")}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                {API_TOKEN_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Token Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700 text-left">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">别名</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Provider</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">状态</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 min-w-[160px]">月度用量</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">调用次数</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">最后使用</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-slate-700">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : tokens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                    <Key className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>暂无 API Token</p>
                    <p className="text-xs mt-1">点击右上角「新建 Token」添加</p>
                  </td>
                </tr>
              ) : (
                tokens.map((token) => (
                  <TokenRow
                    key={token.id}
                    token={token}
                    onEdit={openEdit}
                    onVerify={handleVerify}
                    onDelete={(id) => setDeleteConfirmId(id)}
                    onToggleStatus={handleToggleStatus}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title="新建 API Token">
          <TokenForm
            onSubmit={handleCreate}
            loading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) { setEditOpen(false); setEditTarget(null); } }}>
        <DialogContent title="编辑 API Token">
          {editTarget && (
            <TokenForm
              initial={editTarget}
              onSubmit={handleEdit}
              loading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent title="确认删除">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 dark:text-red-400">
                删除后无法恢复。该 Token 已绑定的 Agent 配置将解除绑定。
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={handleDelete}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Result Toast-like Dialog */}
      <Dialog
        open={!!verifyResult}
        onOpenChange={() => setVerifyResult(null)}
      >
        <DialogContent title="验证结果">
          {verifyResult && (
            <div className="flex items-start gap-3 py-2">
              {verifyResult.success ? (
                <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500 shrink-0" />
              )}
              <div>
                <p className={cn(
                  "font-medium",
                  verifyResult.success ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                )}>
                  {verifyResult.success ? "验证成功" : "验证失败"}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {verifyResult.message}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setVerifyResult(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
