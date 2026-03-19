/**
 * useMessages Hook
 * 消息机制模块 - React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getQueueStatus,
  getMessageHistory,
  preemptMessage,
  updateMessageStatus,
  receiveMessage,
  QueueStatus,
  PaginatedMessages,
  MessageHistoryParams,
  ReceiveMessageRequest,
  Message,
} from "@/lib/api/messages";

// Query Keys
export const messageKeys = {
  all: ["messages"] as const,
  queue: () => [...messageKeys.all, "queue"] as const,
  history: (params: MessageHistoryParams) => [...messageKeys.all, "history", params] as const,
};

// 消息队列状态 Hook
export function useQueueStatus() {
  return useQuery<QueueStatus>({
    queryKey: messageKeys.queue(),
    queryFn: getQueueStatus,
    staleTime: 5000, // 5秒内数据视为新鲜（实时性要求高）
    refetchInterval: 5000, // 每5秒自动刷新
  });
}

// 消息历史 Hook
export function useMessageHistory(params: MessageHistoryParams = {}) {
  return useQuery<PaginatedMessages>({
    queryKey: messageKeys.history(params),
    queryFn: () => getMessageHistory(params),
    staleTime: 30000,
  });
}

// 手动抢占 Mutation
export function usePreemptMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => preemptMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.queue() });
    },
  });
}

// 更新消息状态 Mutation
export function useUpdateMessageStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, status }: { messageId: string; status: Message['status'] }) =>
      updateMessageStatus(messageId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.queue() });
      queryClient.invalidateQueries({ queryKey: messageKeys.all });
    },
  });
}

// 发送消息 Mutation（用于测试）
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReceiveMessageRequest) => receiveMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.queue() });
    },
  });
}

// ============================================================
// 消息统计（新增）
// ============================================================
export interface MessageStats {
  counters: {
    totalEnqueued: number;
    totalCompleted: number;
    totalFailed: number;
    totalMerged: number;
    totalPreempted: number;
    totalDLQ: number;
  };
  byRole: Record<string, { enqueued: number; completed: number; failed: number }>;
  byChannel: Record<string, number>;
  queueDepth: number;
  currentProcessing: string | null;
  timeWindows: {
    '1h': { enqueued: number; completed: number; failed: number; avgPriority: number; preemptCount: number };
    '24h': { enqueued: number; completed: number; failed: number; avgPriority: number; preemptCount: number };
    '7d': { enqueued: number; completed: number; failed: number; avgPriority: number; preemptCount: number };
  };
  topUsers: { userId: string; userName: string; count: number }[];
  updatedAt: string;
}

export function useMessageStats() {
  return useQuery<MessageStats>({
    queryKey: [...messageKeys.all, "stats"] as const,
    queryFn: () => fetch('/api/v1/messages/stats').then(r => r.json()).then(d => d.data),
    staleTime: 5000,
    refetchInterval: 5000,
  });
}

// ============================================================
// 消息 DLQ（新增）
// ============================================================
export interface DLQEntry {
  message: Message;
  failedAt: string;
  failReason: string;
  retryCount: number;
  originalQueueId?: string;
}

export interface DLQStats {
  total: number;
  oldestEntry: string | null;
  newestEntry: string | null;
  byChannel: Record<string, number>;
}

export function useDLQStats() {
  return useQuery<DLQStats>({
    queryKey: [...messageKeys.all, "dlq", "stats"] as const,
    queryFn: () => fetch('/api/v1/messages/dlq/stats').then(r => r.json()).then(d => d.data),
    staleTime: 10000,
  });
}

export function useDLQEntries(params?: { page?: number; pageSize?: number; channel?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.channel) searchParams.set('channel', params.channel);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: [...messageKeys.all, "dlq", "entries", params] as const,
    queryFn: () => fetch(`/api/v1/messages/dlq${qs ? '?' + qs : ''}`).then(r => r.json()).then(d => d.data),
    staleTime: 10000,
  });
}

export function useRequeueFromDLQ() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      fetch(`/api/v1/messages/dlq/${messageId}/requeue`, { method: 'POST' }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...messageKeys.all, "dlq"] });
      queryClient.invalidateQueries({ queryKey: messageKeys.queue() });
    },
  });
}

export function useDiscardFromDLQ() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      fetch(`/api/v1/messages/dlq/${messageId}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...messageKeys.all, "dlq"] });
    },
  });
}

// ============================================================
// 消息重试（新增）
// ============================================================
export function useRetryStats() {
  return useQuery({
    queryKey: [...messageKeys.all, "retry", "stats"] as const,
    queryFn: () => fetch('/api/v1/messages/retry/stats').then(r => r.json()).then(d => d.data),
    staleTime: 10000,
  });
}
