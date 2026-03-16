"use client";

import { useState, useMemo, useCallback } from "react";
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
  X
} from "lucide-react";
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
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onClear
}: {
  search: string;
  status: string;
  priority: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onClear: () => void;
}) {
  const hasFilters = search || status !== "all" || priority !== "all";
  
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
  onComplete,
  onCancel,
  onReopen,
  onDelete
}: {
  task: Task;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
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

// 创建任务弹窗
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
      {/* 遮罩层 */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
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
              onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) as any })}
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

// 主页面组件
export default function TasksPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // 从 URL 获取筛选参数
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "all";
  const priority = searchParams.get("priority") || "all";
  const page = Number(searchParams.get("page")) || 1;
  
  // 构建筛选参数
  const filters = useMemo(() => ({
    search,
    status: status as any,
    priority,
    page,
    pageSize: 10,
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
  
  const handlePageChange = (newPage: number) => {
    const query = createQueryString({ page: newPage });
    router.push(`${pathname}?${query}`);
  };
  
  // 操作处理函数
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
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">任务管理</h1>
          <p className="text-gray-500 mt-1">管理团队协作任务</p>
        </div>
        <Button onClick={() => router.push(`${pathname}?create=true`)}>
          <Plus className="w-4 h-4 mr-2" />
          创建任务
        </Button>
      </div>

      {/* 筛选栏 */}
      <FilterBar
        search={search}
        status={status}
        priority={priority}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onPriorityChange={handlePriorityChange}
        onClear={handleClearFilters}
      />

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
          data?.data.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={handleComplete}
              onCancel={handleCancel}
              onReopen={handleReopen}
              onDelete={handleDelete}
            />
          ))
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
  );
}
