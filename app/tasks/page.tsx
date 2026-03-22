"use client";

import { useState, useMemo, useCallback, Suspense, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LegacySelect as Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  Plus, 
  Search, 
  Trash2, 
  ArrowRight,
  CheckCircle,
  PlayCircle,
  XCircle,
  AlertCircle,
  X,
  CheckSquare,
  Square,
  Download,
  LayoutGrid,
  Clock,
  Target,
  Loader2
} from "lucide-react";

// CSV 导出函数
function convertToCSV(tasks: Task[]): string {
  const headers = ["任务ID", "标题", "描述", "状态", "优先级", "创建时间", "完成时间", "耗时(分钟)", "标签"];
  const rows = tasks.map(task => [
    task.id,
    `"${(task.title || "").replace(/"/g, '""')}"`,
    `"${(task.description || "").replace(/"/g, '""')}"`,
    STATUS_LABELS[task.status],
    String(task.priority),
    task.createdAt,
    task.completedAt || "",
    task.duration || "",
    task.tags.join("; ")
  ]);
  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
}

function downloadCSV(tasks: Task[], filename: string = "tasks.csv") {
  const csv = convertToCSV(tasks);
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
import { 
  useTaskList, 
  useCreateTask, 
  useDeleteTask, 
  useCompleteTask, 
  useCancelTask,
  useReopenTask,
  useUpdateTask 
} from "@/hooks/useTasks";
import { 
  TASK_STATUS_OPTIONS, 
  TASK_PRIORITY_OPTIONS,
  STATUS_BADGE_VARIANT,
  STATUS_LABELS,
  Task,
  TaskStatus,
  TaskPriority,
  CreateTaskRequest
} from "@/lib/api/types";

// 优先级选项（与详情页、批量操作保持一致）
const PRIORITY_OPTIONS = [
  { value: "10", label: "紧急 (10)", text: "紧急" },
  { value: "8", label: "高 (8-9)", text: "高" },
  { value: "7", label: "中 (5-7)", text: "中" },
  { value: "3", label: "低 (1-4)", text: "低" },
];

const PRIORITY_LABEL_MAP: Record<string, string> = {
  "10": "紧急 (10)", "8": "高 (8-9)", "7": "中 (5-7)", "3": "低 (1-4)",
};

const getPriorityText = (value: string | number) => PRIORITY_OPTIONS.find(o => o.value === String(value))?.text ?? String(value);
const getPriorityColor = (value: string | number): string => {
  const num = Number(value);
  if (num >= 9) return "border-l-4 border-red-500";
  if (num >= 7) return "border-l-4 border-orange-400";
  if (num >= 5) return "border-l-4 border-blue-400";
  return "border-l-4 border-gray-300 dark:border-gray-600";
};

// 状态图标组件
const getStatusIcon = (status: TaskStatus) => {
  switch (status) {
    case "completed": return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "in_progress": return <PlayCircle className="w-4 h-4 text-blue-500" />;
    case "cancelled": return <XCircle className="w-4 h-4 text-red-500" />;
    default: return <AlertCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 dark:text-gray-400" />;
  }
};

// 筛选栏组件
function FilterBar({
  search,
  status,
  priority,
  sortBy,
  sortOrder,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onSortByChange,
  onSortOrderChange,
  onClear
}: {
  search: string;
  status: string;
  priority: string;
  sortBy: string;
  sortOrder: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onSortOrderChange: (value: string) => void;
  onClear: () => void;
}) {
  const hasFilters = search || status !== "all" || priority !== "all" || sortBy !== "createdAt";
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4 flex-wrap items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="搜索任务ID、标题或描述..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            options={TASK_STATUS_OPTIONS}
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-36"
          />
          <Select
            options={TASK_PRIORITY_OPTIONS}
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="w-36"
          />
          <Select
            options={[
              { value: "createdAt", label: "创建时间" },
              { value: "completedAt", label: "完成时间" },
              { value: "priority", label: "优先级" },
            ]}
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="w-36"
          />
          <Select
            options={[
              { value: "desc", label: "倒序" },
              { value: "asc", label: "正序" },
            ]}
            value={sortOrder}
            onChange={(e) => onSortOrderChange(e.target.value)}
            className="w-28"
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="w-4 h-4 mr-1" />
              清除筛选
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 快速创建任务表单
function QuickAddTaskForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const createTask = useCreateTask();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createTask.mutateAsync({ title: title.trim(), description: "", priority: 5 });
    setTitle("");
    onCreated();
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-3 bg-card">
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="输入任务标题，按回车快速创建..."
          disabled={createTask.isPending}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
        />
        <Button type="submit" size="sm" disabled={!title.trim() || createTask.isPending}>
          {createTask.isPending ? "创建中..." : "创建"}
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}

// 任务卡片组件
function TaskCard({
  task,
  isSelected,
  onSelect,
  onComplete,
  onCancel,
  onReopen,
  onDelete,
  onStatusChange
}: {
  task: Task;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}) {
  return (
    <Card className={`hover:shadow-md transition-shadow ${getPriorityColor(task.priority)}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => onSelect(task.id, !isSelected)}
              className="mt-1 text-gray-400 dark:text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 dark:text-gray-300"
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-blue-500" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{task.id}</span>
                <button
                  onClick={() => {
                    // 快速切换状态
                    const statusFlow: TaskStatus[] = ["pending", "in_progress", "completed", "cancelled"];
                    const currentIndex = statusFlow.indexOf(task.status);
                    const nextStatus = statusFlow[(currentIndex + 1) % statusFlow.length];
                    onStatusChange(task.id, nextStatus);
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors cursor-pointer"
                  title="点击切换状态"
                >
                  <Badge variant={STATUS_BADGE_VARIANT[task.status]}>
                    {getStatusIcon(task.status)}
                    <span className="ml-1">{STATUS_LABELS[task.status]}</span>
                  </Badge>
                </button>
                <span className="text-xs text-orange-600 font-medium">
                  优先级：{task.priority}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{task.title}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>创建：{task.createdAt}</span>
                {task.completedAt && <span>完成：{task.completedAt}</span>}
                {task.duration && <span>耗时：{task.duration} 分钟</span>}
              </div>
              {task.tags.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {task.tags.map(tag => (
                    <Badge key={tag} variant="default" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {task.status === "pending" && (
              <Button size="sm" onClick={() => onComplete(task.id)}>
                <CheckCircle className="w-4 h-4 mr-1" />
                完成
              </Button>
            )}
            {task.status === "in_progress" && (
              <Button size="sm" variant="outline" onClick={() => onComplete(task.id)}>
                <CheckCircle className="w-4 h-4 mr-1" />
                完成
              </Button>
            )}
            {(task.status === "pending" || task.status === "in_progress") && (
              <Button size="sm" variant="outline" onClick={() => onCancel(task.id)}>
                取消
              </Button>
            )}
            {task.status === "completed" && (
              <Button size="sm" variant="outline" onClick={() => onReopen(task.id)}>
                重新打开
              </Button>
            )}
            <Link href={`/tasks/${task.id}`}>
              <Button size="sm" variant="ghost">
                查看详情
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 创建任务弹窗组件
function CreateTaskModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<CreateTaskRequest>({
    title: "",
    description: "",
    priority: 5,
  });

  const createTask = useCreateTask();
  const isCreating = createTask.isPending;

  // 弹窗打开时自动聚焦标题输入框
  useEffect(() => {
    if (isOpen) {
      // 等待弹窗动画完成后再聚焦
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Escape 键关闭弹窗
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleCreate = async () => {
    if (!formData.title.trim()) return;
    await createTask.mutateAsync(formData);
    setFormData({ title: "", description: "", priority: 5 });
    onClose();
  };

  // Cmd/Ctrl+Enter 提交
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (formData.title.trim() && !isCreating) {
        handleCreate();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isCreating ? (e) => { e.preventDefault(); e.stopPropagation(); } : onClose}
      />
      
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">创建任务</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="space-y-4" onKeyDown={handleKeyDown}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              任务标题 <span className="text-red-500">*</span>
            </label>
            <Input
              ref={titleInputRef}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="请输入任务标题"
              disabled={isCreating}
              onKeyDown={(e) => {
                if (e.key === "Enter" && formData.title.trim() && !isCreating) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              任务描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入任务描述（可选）"
              rows={3}
              disabled={isCreating}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              优先级
            </label>
            <Select
              options={PRIORITY_OPTIONS}
              value={String(formData.priority)}
              onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) as TaskPriority })}
              disabled={isCreating}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            取消
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!formData.title.trim() || isCreating}
          >
            {isCreating ? "创建中..." : "创建"}
          </Button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
          <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 font-mono text-[10px]">⌘</kbd>
          <span className="mx-0.5">+</span>
          <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 font-mono text-[10px]">Enter</kbd>
          <span className="ml-1.5">快速提交</span>
        </p>
      </div>
    </div>
  );
}

// 任务列表内容组件（使用 useSearchParams）
function TasksContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // 批量删除状态
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);

  // 单个操作确认弹窗
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  // 快速创建展开状态
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  
  // 从 URL 获取筛选参数
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "all";
  const priority = searchParams.get("priority") || "all";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const page = Number(searchParams.get("page")) || 1;
  const isCreateModalOpen = searchParams.get("create") === "true";
  
  // 视图模式
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  
  // 构建筛选参数
  const filters = useMemo(() => ({
    search,
    status: status as TaskStatus | "all",
    priority,
    page,
    pageSize: 20,
  }), [search, status, priority, page]);
  
  // 使用 React Query 获取数据
  const { data, isLoading, error, refetch } = useTaskList(filters);
  
  // Mutations
  const deleteTask = useDeleteTask();
  const completeTask = useCompleteTask();
  const cancelTask = useCancelTask();
  const reopenTask = useReopenTask();
  const updateTask = useUpdateTask();
  
  // 批量操作状态
  const [batchPriority, setBatchPriority] = useState<string>("");
  const [batchToast, setBatchToast] = useState<string>("");
  
  // 任务统计
  const taskStats = useMemo(() => {
    if (!data?.data) return null;
    const tasks = data.data;
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === "pending").length,
      inProgress: tasks.filter(t => t.status === "in_progress").length,
      completed: tasks.filter(t => t.status === "completed").length,
      cancelled: tasks.filter(t => t.status === "cancelled").length,
      avgPriority: tasks.length > 0 
        ? Math.round(tasks.reduce((sum, t) => sum + t.priority, 0) / tasks.length * 10) / 10 
        : 0,
    };
  }, [data]);
  
  // 创建新的 URL 参数
  const createQueryString = useCallback(
    (params: Record<string, string | number | null>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === "" || value === "all") {
          newParams.delete(key);
        } else {
          newParams.set(key, String(value));
        }
      });
      return newParams.toString();
    },
    [searchParams]
  );
  
  // 筛选处理函数
  const handleSearchChange = (value: string) => {
    const query = createQueryString({ search: value, page: 1 });
    router.push(`${pathname}?${query}`);
  };
  
  const handleStatusChange = (value: string) => {
    const query = createQueryString({ status: value, page: 1 });
    router.push(`${pathname}?${query}`);
  };
  
  const handlePriorityChange = (value: string) => {
    const query = createQueryString({ priority: value, page: 1 });
    router.push(`${pathname}?${query}`);
  };
  
  const handleClearFilters = () => {
    router.push(pathname);
  };
  
  const handleSortByChange = (value: string) => {
    const query = createQueryString({ sortBy: value, page: 1 });
    router.push(`${pathname}?${query}`);
  };
  
  const handleSortOrderChange = (value: string) => {
    const query = createQueryString({ sortOrder: value, page: 1 });
    router.push(`${pathname}?${query}`);
  };
  
  const handlePageChange = (newPage: number) => {
    const query = createQueryString({ page: newPage });
    router.push(`${pathname}?${query}`);
  };

  const handleOpenCreateModal = () => {
    const query = createQueryString({ create: "true" });
    router.push(`${pathname}?${query}`);
  };

  const handleCloseCreateModal = () => {
    const query = createQueryString({ create: null });
    router.push(query ? `${pathname}?${query}` : pathname);
  };
  
  // 操作处理函数
  const handleSelectTask = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedTaskIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedTaskIds(newSelected);
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.data) {
      setSelectedTaskIds(new Set(data.data.map(t => t.id)));
    } else {
      setSelectedTaskIds(new Set());
    }
  };
  
  const handleBatchDelete = async () => {
    try {
      for (const id of Array.from(selectedTaskIds)) {
        await deleteTask.mutateAsync(id);
      }
      setSelectedTaskIds(new Set());
      setBatchDeleteConfirm(false);
    } catch (err) {
      console.error("Failed to batch delete tasks:", err);
    }
  };
  
  // 批量更新优先级
  const handleBatchUpdatePriority = async () => {
    if (!batchPriority) return;
    try {
      const priorityNum = parseInt(batchPriority);
      for (const id of Array.from(selectedTaskIds)) {
        await updateTask.mutateAsync({ id, data: { priority: priorityNum as TaskPriority } });
      }
      setSelectedTaskIds(new Set());
      setBatchPriority("");
      const label = PRIORITY_LABEL_MAP[batchPriority] || batchPriority;
      setBatchToast(`已更新 ${selectedTaskIds.size} 个任务为 ${label}`);
      setTimeout(() => setBatchToast(""), 3000);
    } catch (err) {
      console.error("Failed to batch update priority:", err);
    }
  };
  
  // 快速切换任务状态
  const handleQuickStatusChange = async (id: string, newStatus: TaskStatus) => {
    try {
      if (newStatus === "completed") {
        await completeTask.mutateAsync(id);
      } else if (newStatus === "cancelled") {
        await cancelTask.mutateAsync(id);
      } else if (newStatus === "in_progress") {
        await updateTask.mutateAsync({ id, data: { status: newStatus } });
      } else if (newStatus === "pending") {
        await reopenTask.mutateAsync(id);
      }
    } catch (err) {
      console.error("Failed to change status:", err);
    }
  };
  
  const handleDelete = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteTask.mutateAsync(deleteConfirmId);
    setDeleteConfirmId(null);
  };
  
  const handleComplete = async (id: string) => {
    await completeTask.mutateAsync(id);
  };
  
  const handleCancel = async (id: string) => {
    setCancelConfirmId(id);
  };

  const handleConfirmCancel = async () => {
    if (!cancelConfirmId) return;
    await cancelTask.mutateAsync(cancelConfirmId);
    setCancelConfirmId(null);
  };
  
  const handleReopen = async (id: string) => {
    await reopenTask.mutateAsync(id);
  };

  return (
    <>
      <div className="page-container">
        {/* 页面标题 */}
        <div className="page-header">
          <div>
            <h1 className="page-header-title">任务管理</h1>
            <p className="page-header-subtitle">管理团队协作任务</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => data?.data && downloadCSV(data.data, `tasks-${new Date().toISOString().split('T')[0]}.csv`)}
              disabled={!data?.data || data.data.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              导出 CSV
            </Button>
            <Button onClick={handleOpenCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              创建任务
            </Button>
          </div>
        </div>

        {/* 任务统计摘要栏 */}
        {taskStats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <div className="bg-card rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{taskStats.total}</div>
              <div className="text-xs text-muted-foreground">全部任务</div>
            </div>
            <div className="bg-card rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-blue-500">{taskStats.pending + taskStats.inProgress}</div>
              <div className="text-xs text-muted-foreground">进行中</div>
            </div>
            <div className="bg-card rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-green-500">{taskStats.completed}</div>
              <div className="text-xs text-muted-foreground">已完成</div>
            </div>
            <div className="bg-card rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-red-400">{taskStats.cancelled}</div>
              <div className="text-xs text-muted-foreground">已取消</div>
            </div>
            <div className="bg-card rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-orange-500">{taskStats.avgPriority.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">平均优先级</div>
            </div>
          </div>
        )}

        {/* 快速创建任务 */}
        <div className="mb-4">
          {!isQuickAddOpen ? (
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="w-full py-2 px-4 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              快速添加任务
            </button>
          ) : (
            <QuickAddTaskForm
              onClose={() => setIsQuickAddOpen(false)}
              onCreated={() => {
                setIsQuickAddOpen(false);
                refetch();
              }}
            />
          )}
        </div>

        {/* 筛选栏 */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <FilterBar
            search={search}
            status={status}
            priority={priority}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSearchChange={handleSearchChange}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            onSortByChange={handleSortByChange}
            onSortOrderChange={handleSortOrderChange}
            onClear={handleClearFilters}
          />
          {/* 视图切换 */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "timeline" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("timeline")}
            >
              <Clock className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 任务统计概览 */}
        {taskStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <LayoutGrid className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-medium">总计</p>
                  <p className="text-lg font-bold text-blue-900">{taskStats.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-gray-50 dark:from-slate-800 to-gray-100 dark:to-slate-700 border-gray-200 dark:border-slate-700">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 bg-gray-400 dark:bg-slate-500 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">待处理</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{taskStats.pending}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <PlayCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-medium">进行中</p>
                  <p className="text-lg font-bold text-blue-900">{taskStats.inProgress}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-green-600 font-medium">已完成</p>
                  <p className="text-lg font-bold text-green-900">{taskStats.completed}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 bg-red-500 rounded-lg">
                  <XCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-red-600 font-medium">已取消</p>
                  <p className="text-lg font-bold text-red-900">{taskStats.cancelled}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-purple-600 font-medium">平均优先级</p>
                  <p className="text-lg font-bold text-purple-900">{taskStats.avgPriority}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-orange-600 font-medium">完成率</p>
                  <p className="text-lg font-bold text-orange-900">
                    {taskStats.total > 0 ? Math.round(taskStats.completed / taskStats.total * 100) : 0}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 批量操作栏 */}
        {selectedTaskIds.size > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3 flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm text-blue-700">
                已选择 {selectedTaskIds.size} 个任务
              </span>
              {batchToast && (
                <span className="text-sm text-green-600 font-medium animate-pulse">
                  ✓ {batchToast}
                </span>
              )}
              <div className="flex gap-2 flex-wrap">
                {/* 批量修改优先级 */}
                <div className="flex items-center gap-1">
                  <Select
                    options={[{ value: "", label: "修改优先级" }, ...PRIORITY_OPTIONS]}
                    value={batchPriority}
                    onChange={(e) => setBatchPriority(e.target.value)}
                    className="w-36 h-8 text-sm"
                  />
                  {batchPriority && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleBatchUpdatePriority}
                      disabled={updateTask.isPending}
                    >
                      {updateTask.isPending ? "..." : "应用"}
                    </Button>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedTaskIds(new Set())}
                >
                  取消选择
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setBatchDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  批量删除
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 任务列表 */}
        {viewMode === "timeline" ? (
          // 时间线视图
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">任务时间线</h3>
            {isLoading ? (
              <Card><CardContent className="page-loading"><Loader2 className="w-5 h-5 animate-spin" /><span>加载中...</span></CardContent></Card>
            ) : error ? (
              <Card><CardContent className="py-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-red-500 text-sm">
                    <p className="font-medium">加载失败</p>
                    <p className="text-xs opacity-75 mt-0.5">{(error as Error).message}</p>
                  </div>
                  <button
                    onClick={() => refetch()}
                    className="px-3 py-1.5 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-medium rounded transition-colors shrink-0"
                  >
                    重试
                  </button>
                </div>
              </CardContent></Card>
            ) : data?.data.length === 0 ? (
              <EmptyState
                icon={Target}
                title="暂无任务"
                description="创建第一个任务开始使用"
                action={
                  <Button onClick={() => router.push(`${pathname}?create=true`)}>
                    + 创建任务
                  </Button>
                }
              />
            ) : (
              <div className="relative">
                {/* 时间线竖线 */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-600" />
                
                {data?.data
                  .slice()
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((task) => (
                    <div key={task.id} className="relative flex gap-4 pb-6">
                      {/* 时间线节点 */}
                      <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        task.status === "completed" ? "bg-green-500" :
                        task.status === "in_progress" ? "bg-blue-500" :
                        task.status === "cancelled" ? "bg-red-500" : "bg-gray-400 dark:bg-slate-500"
                      }`}>
                        {task.status === "completed" ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : task.status === "in_progress" ? (
                          <PlayCircle className="w-5 h-5 text-white" />
                        ) : task.status === "cancelled" ? (
                          <XCircle className="w-5 h-5 text-white" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-white" />
                        )}
                      </div>
                      
                      {/* 时间线内容 */}
                      <Card className={`flex-1 ${getPriorityColor(task.priority)}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{task.id}</span>
                                <Badge variant={STATUS_BADGE_VARIANT[task.status]}>
                                  {STATUS_LABELS[task.status]}
                                </Badge>
                                <span className="text-xs text-orange-600">{getPriorityText(task.priority)}</span>
                              </div>
                              <h3 className="font-semibold">{task.title}</h3>
                              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {task.createdAt}
                                </span>
                                {task.completedAt && (
                                  <span>完成于: {task.completedAt}</span>
                                )}
                                {task.duration && (
                                  <span>耗时: {task.duration}分钟</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Link href={`/tasks/${task.id}`}>
                                <Button size="sm" variant="ghost">
                                  <ArrowRight className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          // 列表视图
          <div className="space-y-3">
          {isLoading ? (
            <Card>
              <CardContent className="page-loading">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>加载中...</span>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-red-500 text-sm">
                    <p className="font-medium">加载失败</p>
                    <p className="text-xs opacity-75 mt-0.5">{(error as Error).message}</p>
                  </div>
                  <button
                    onClick={() => refetch()}
                    className="px-3 py-1.5 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-medium rounded transition-colors shrink-0"
                  >
                    重试
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : data?.data.length === 0 ? (
            <Card>
              <EmptyState
                icon={Target}
                title="暂无任务"
                description="创建第一个任务开始使用"
                action={
                  <Button onClick={() => router.push(`${pathname}?create=true`)}>
                    + 创建任务
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
              {/* 全选行 */}
              <div className="flex items-center gap-2 px-2 py-1 text-sm text-gray-500 dark:text-gray-400">
                <button
                  onClick={() => handleSelectAll(selectedTaskIds.size !== data?.data.length)}
                  className="text-gray-400 dark:text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 dark:text-gray-300"
                >
                  {selectedTaskIds.size === data?.data.length ? (
                    <CheckSquare className="w-5 h-5 text-blue-500" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                <span>全选</span>
              </div>
              {data?.data
                .slice()
                .sort((a, b) => {
                  let comparison = 0;
                  switch (sortBy) {
                    case "createdAt":
                      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                      break;
                    case "completedAt":
                      const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
                      const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
                      comparison = aTime - bTime;
                      break;
                    case "priority":
                      comparison = b.priority - a.priority;
                      break;
                  }
                  return sortOrder === "asc" ? comparison : -comparison;
                })
                .map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isSelected={selectedTaskIds.has(task.id)}
                    onSelect={handleSelectTask}
                    onComplete={handleComplete}
                    onCancel={handleCancel}
                    onReopen={handleReopen}
                    onDelete={handleDelete}
                    onStatusChange={handleQuickStatusChange}
                  />
                ))}
            </>
          )}
        </div>
        )}

        {/* 分页 */}
        {data && data.totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
            >
              上一页
            </Button>
            <span className="flex items-center px-4 text-sm text-gray-600 dark:text-gray-300">
              第 {page} / {data.totalPages} 页 (共 {data.total} 条)
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => handlePageChange(page + 1)}
            >
              下一页
            </Button>
          </div>
        )}
      </div>

      {/* 创建任务弹窗 */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
      />

      {/* 批量删除确认弹窗 */}
      {batchDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setBatchDeleteConfirm(false)}
          />
          
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">批量删除任务</h2>
              <Button variant="ghost" size="icon" onClick={() => setBatchDeleteConfirm(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              确定要删除选中的 {selectedTaskIds.size} 个任务吗？此操作不可恢复。
            </p>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setBatchDeleteConfirm(false)}>
                取消
              </Button>
              <Button 
                variant="destructive"
                onClick={handleBatchDelete}
                disabled={deleteTask.isPending}
              >
                {deleteTask.isPending ? "删除中..." : "确认删除"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 单个删除确认弹窗 */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setDeleteConfirmId(null)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">确认删除</h2>
              <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              确定要删除这个任务吗？此操作不可恢复。
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleteTask.isPending}
              >
                {deleteTask.isPending ? "删除中..." : "确认删除"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 单个取消确认弹窗 */}
      {cancelConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setCancelConfirmId(null)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">确认取消任务</h2>
              <Button variant="ghost" size="icon" onClick={() => setCancelConfirmId(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              确定要取消这个任务吗？取消后可重新开启。
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCancelConfirmId(null)}>
                取消
              </Button>
              <Button
                variant="outline"
                onClick={handleConfirmCancel}
                disabled={cancelTask.isPending}
              >
                {cancelTask.isPending ? "处理中..." : "确认取消"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 加载中占位组件
function TasksLoading() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-header-title">任务管理</h1>
          <p className="page-header-subtitle">管理团队协作任务</p>
        </div>
        <Button disabled>
          <Plus className="w-4 h-4 mr-2" />
          创建任务
        </Button>
      </div>
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          加载中...
        </CardContent>
      </Card>
    </div>
  );
}

// 默认导出组件（带 Suspense）
export default function TasksPage() {
  return (
    <Suspense fallback={<TasksLoading />}>
      <TasksContent />
    </Suspense>
  );
}
