import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskApi } from "@/lib/api/tasks";
import { searchTasksSemantic, getTaskSummary, getTaskContext, getTaskSimilar } from "@/lib/api/search";
import { TaskFilters, CreateTaskRequest, UpdateTaskRequest } from "@/lib/api/types";

// Query Keys
export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (filters: TaskFilters) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

// 任务列表 Hook
export function useTaskList(filters: TaskFilters) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => taskApi.getList(filters),
    staleTime: 30000, // 30秒内数据视为新鲜
  });
}

// 任务详情 Hook
export function useTaskDetail(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => taskApi.getById(id),
    enabled: !!id,
  });
}

// 创建任务 Mutation
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskRequest) => taskApi.create(data),
    onSuccess: () => {
      // 使任务列表缓存失效
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

// 更新任务 Mutation
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskRequest }) =>
      taskApi.update(id, data),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.setQueryData(taskKeys.detail(task.id), task);
    },
  });
}

// 删除任务 Mutation
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

// 完成任务 Mutation
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskApi.complete(id),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.setQueryData(taskKeys.detail(task.id), task);
    },
  });
}

// 取消任务 Mutation
export function useCancelTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskApi.cancel(id),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.setQueryData(taskKeys.detail(task.id), task);
    },
  });
}

// 重新打开任务 Mutation
export function useReopenTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskApi.reopen(id),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.setQueryData(taskKeys.detail(task.id), task);
    },
  });
}

// 评论 Query Keys
export const commentKeys = {
  all: ["comments"] as const,
  lists: () => [...commentKeys.all, "list"] as const,
  list: (taskId: string) => [...commentKeys.lists(), taskId] as const,
};

// 获取任务评论列表 Hook
export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: commentKeys.list(taskId),
    queryFn: () => taskApi.getComments(taskId),
    enabled: !!taskId,
  });
}

// 添加评论 Mutation
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, content, author }: { taskId: string; content: string; author?: string }) =>
      taskApi.addComment(taskId, content, author),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(variables.taskId) });
    },
  });
}

// 删除评论 Mutation
export function useDeleteComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => taskApi.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(taskId) });
    },
  });
}

// ── 语义搜索相关 ──────────────────────────────────────

// Query Keys for semantic search
export const semanticSearchKeys = {
  all: ["semanticSearch"] as const,
  tasks: (q: string) => [...semanticSearchKeys.all, "tasks", q] as const,
  similar: (taskId: string) => [...semanticSearchKeys.all, "similar", taskId] as const,
};

// 语义搜索历史任务 Hook
export function useTaskSemanticSearch(q: string, topK = 5, enabled = true) {
  return useQuery({
    queryKey: semanticSearchKeys.tasks(q),
    queryFn: () => searchTasksSemantic(q, 'semantic', topK),
    enabled: enabled && !!q && q.length >= 2,
    staleTime: 60000,
  });
}

// 获取任务摘要 Hook
export function useTaskSummary(taskId: string) {
  return useQuery({
    queryKey: ["taskSummary", taskId] as const,
    queryFn: () => getTaskSummary(taskId),
    enabled: !!taskId,
    staleTime: 300000,
  });
}

// 获取任务上下文快照 Hook
export function useTaskContext(taskId: string) {
  return useQuery({
    queryKey: ["taskContext", taskId] as const,
    queryFn: () => getTaskContext(taskId),
    enabled: !!taskId,
    staleTime: 300000,
  });
}

// 获取相似历史任务 Hook
export function useTaskSimilar(taskId: string, topK = 5) {
  return useQuery({
    queryKey: semanticSearchKeys.similar(taskId),
    queryFn: () => getTaskSimilar(taskId, topK),
    enabled: !!taskId,
    staleTime: 60000,
  });
}
