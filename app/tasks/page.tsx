"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Download
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
  useReopenTask 
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

// 状态图标组件
const getStatusIcon = (status: TaskStatus) => {
  switch (status) {
    case "completed": return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "in_progress": return <PlayCircle className="w-4 h-4 text-blue-500" />;
    case "cancelled": return <XCircle className="w-4 h-4 text-red-500" />;
    default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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

// 任务卡片组件
function TaskCard({
  task,
  isSelected,
  onSelect,
  onComplete,
  onCancel,
  onReopen,
  onDelete
}: {
  task: Task;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => onSelect(task.id, !isSelected)}
              className="mt-1 text-gray-400 hover:text-gray-600"
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-blue-500" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-sm text-gray-500">{task.id}</span>
                <Badge variant={STATUS_BADGE_VARIANT[task.status]}>
                  {getStatusIcon(task.status)}
                  <span className="ml-1">{STATUS_LABELS[task.status]}</span>
                </Badge>
                <span className="text-xs text-orange-600 font-medium">
                  优先级：{task.priority}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{task.title}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-500">
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
  const [formData, setFormData] = useState<CreateTaskRequest>({
    title: "",
    description: "",
    priority: 5,
  });

  const createTask = useCreateTask();
  
  const handleCreate = async () => {
    if (!formData.title.trim()) return;
    await createTask.mutateAsync(formData);
    setFormData({ title: "", description: "", priority: 5 });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">创建任务</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              任务标题 *
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="请输入任务标题"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              任务描述
            </label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入任务描述"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              优先级
            </label>
            <Select
              options={[
                { value: "10", label: "紧急 (10)" },
                { value: "8", label: "高 (8)" },
                { value: "7", label: "中 (7)" },
                { value: "5", label: "低 (5)" },
              ]}
              value={String(formData.priority)}
              onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) as TaskPriority })}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!formData.title.trim() || createTask.isPending}
          >
            {createTask.isPending ? "创建中..." : "创建"}
          </Button>
        </div>
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
  
  // 从 URL 获取筛选参数
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "all";
  const priority = searchParams.get("priority") || "all";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const page = Number(searchParams.get("page")) || 1;
  const isCreateModalOpen = searchParams.get("create") === "true";
  
  // 构建筛选参数
  const filters = useMemo(() => ({
    search,
    status: status as TaskStatus | "all",
    priority,
    page,
    pageSize: 20,
  }), [search, status, priority, page]);
  
  // 使用 React Query 获取数据
  const { data, isLoading, error } = useTaskList(filters);
  
  // Mutations
  const deleteTask = useDeleteTask();
  const completeTask = useCompleteTask();
  const cancelTask = useCancelTask();
  const reopenTask = useReopenTask();
  
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
  
  const handleDelete = async (id: string) => {
    if (confirm("确定要删除这个任务吗？")) {
      await deleteTask.mutateAsync(id);
    }
  };
  
  const handleComplete = async (id: string) => {
    await completeTask.mutateAsync(id);
  };
  
  const handleCancel = async (id: string) => {
    if (confirm("确定要取消这个任务吗？")) {
      await cancelTask.mutateAsync(id);
    }
  };
  
  const handleReopen = async (id: string) => {
    await reopenTask.mutateAsync(id);
  };

  return (
    <>
      <div className="p-6 space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">任务管理</h1>
            <p className="text-gray-500 mt-1">管理团队协作任务</p>
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

        {/* 筛选栏 */}
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

        {/* 批量操作栏 */}
        {selectedTaskIds.size > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3 flex items-center justify-between">
              <span className="text-sm text-blue-700">
                已选择 {selectedTaskIds.size} 个任务
              </span>
              <div className="flex gap-2">
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
        <div className="space-y-3">
          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                加载中...
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="py-12 text-center text-red-500">
                加载失败，请稍后重试
              </CardContent>
            </Card>
          ) : data?.data.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                暂无任务
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 全选行 */}
              <div className="flex items-center gap-2 px-2 py-1 text-sm text-gray-500">
                <button
                  onClick={() => handleSelectAll(selectedTaskIds.size !== data?.data.length)}
                  className="text-gray-400 hover:text-gray-600"
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
                  />
                ))}
            </>
          )}
        </div>

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
            <span className="flex items-center px-4 text-sm text-gray-600">
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
            
            <p className="text-gray-600 mb-6">
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
    </>
  );
}

// 加载中占位组件
function TasksLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">任务管理</h1>
          <p className="text-gray-500 mt-1">管理团队协作任务</p>
        </div>
        <Button disabled>
          <Plus className="w-4 h-4 mr-2" />
          创建任务
        </Button>
      </div>
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
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
