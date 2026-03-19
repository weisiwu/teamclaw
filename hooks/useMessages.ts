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
