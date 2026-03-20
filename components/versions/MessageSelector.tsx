"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, MessageSquare, User, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";

export interface MessageItem {
  id: string;
  content: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: string;
  channelName?: string;
}

// Mock 消息数据（当飞书 API 未配置时使用）
const mockMessages: MessageItem[] = [
  {
    id: "msg-001",
    content: "完成了任务管理模块的开发，新增筛选、排序功能",
    senderName: "张三",
    timestamp: "2026-01-12T10:00:00Z",
    channelName: "开发组",
  },
  {
    id: "msg-002",
    content: "修复了登录页面的样式问题，优化了响应式布局",
    senderName: "李四",
    timestamp: "2026-01-13T14:30:00Z",
    channelName: "前端组",
  },
  {
    id: "msg-003",
    content: "新增 Cron 定时任务管理界面，支持配置多个定时任务",
    senderName: "王五",
    timestamp: "2026-02-15T09:00:00Z",
    channelName: "后端组",
  },
  {
    id: "msg-004",
    content: "完成了 Token 统计功能的开发，新增趋势图表",
    senderName: "赵六",
    timestamp: "2026-02-28T11:00:00Z",
    channelName: "数据组",
  },
  {
    id: "msg-005",
    content: "优化了页面加载性能，首屏加载时间减少 30%",
    senderName: "钱七",
    timestamp: "2026-03-05T16:00:00Z",
    channelName: "性能组",
  },
  {
    id: "msg-006",
    content: "新增成员管理功能，支持角色权限配置",
    senderName: "孙八",
    timestamp: "2026-03-10T10:30:00Z",
    channelName: "权限组",
  },
];

interface ChatInfo {
  chatId: string;
  name: string;
  memberCount?: number;
}

interface MessageSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (message: MessageItem) => void;
  /** 默认加载的群聊 ID（可选） */
  defaultChatId?: string;
}

export function MessageSelector({ open, onOpenChange, onSelect, defaultChatId }: MessageSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatInfo[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string>(defaultChatId || "");
  const [hasMore, setHasMore] = useState(false);
  const [pageToken, setPageToken] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isUsingMock, setIsUsingMock] = useState(false);

  // Load chat list when dialog opens
  useEffect(() => {
    if (!open) return;

    const loadChats = async () => {
      setLoadingChats(true);
      try {
        const response = await fetch('/api/v1/feishu/chats?page_size=50');
        const data = await response.json();

        if (data.code === 0 && data.data?.configured) {
          setChats(data.data.chats || []);
          if (data.data.chats?.length > 0 && !selectedChatId) {
            setSelectedChatId(data.data.chats[0].chatId);
          }
        } else {
          // API not configured, use mock
          setChats([]);
          setIsUsingMock(true);
        }
      } catch (err) {
        console.error('[MessageSelector] Failed to load chats:', err);
        setIsUsingMock(true);
      } finally {
        setLoadingChats(false);
      }
    };

    loadChats();
  }, [open]);

  // Load messages when chat is selected or dialog opens
  const loadMessages = useCallback(async (chatId: string, token?: string, append = false) => {
    if (!chatId && !isUsingMock) return;

    if (isUsingMock) {
      setMessages(mockMessages);
      setHasMore(false);
      return;
    }

    if (token) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        container_id_type: 'chat',
        container_id: chatId,
        page_size: '20',
        sort_type: 'ByCreateTimeDesc',
      });
      if (token) params.set('page_token', token);

      const response = await fetch(`/api/v1/feishu/messages?${params.toString()}`);
      const data = await response.json();

      if (data.code !== 0) {
        throw new Error(data.message || '获取消息失败');
      }

      if (!data.data?.configured) {
        // API not configured, fall back to mock
        setIsUsingMock(true);
        setMessages(mockMessages);
        setHasMore(false);
        return;
      }

      const newMessages: MessageItem[] = (data.data.messages || []).map((msg: {
        id: string;
        content: string;
        senderName: string;
        senderOpenId?: string;
        timestamp: string;
      }) => ({
        id: msg.id,
        content: msg.content,
        senderName: msg.senderName || msg.senderOpenId || '未知用户',
        timestamp: msg.timestamp,
      }));

      if (append) {
        setMessages(prev => [...prev, ...newMessages]);
      } else {
        setMessages(newMessages);
      }

      setHasMore(data.data.hasMore);
      setPageToken(data.data.pageToken);
    } catch (err) {
      console.error('[MessageSelector] Failed to load messages:', err);
      setError(err instanceof Error ? err.message : '获取消息失败');
      // Fall back to mock on error
      setIsUsingMock(true);
      setMessages(mockMessages);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [isUsingMock]);

  // Load messages when chat changes
  useEffect(() => {
    if (selectedChatId && open) {
      setMessages([]);
      setPageToken(undefined);
      setHasMore(false);
      loadMessages(selectedChatId);
    } else if (isUsingMock) {
      setMessages(mockMessages);
    }
  }, [selectedChatId, open, loadMessages, isUsingMock]);

  const handleLoadMore = () => {
    if (pageToken && selectedChatId && !isUsingMock) {
      loadMessages(selectedChatId, pageToken, true);
    }
  };

  // Filter messages by search query
  const filteredMessages = messages.filter(
    (msg) =>
      msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.senderName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = () => {
    if (selectedMessage) {
      onSelect(selectedMessage);
      setSelectedMessage(null);
      setSearchQuery("");
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setSelectedMessage(null);
    setSearchQuery("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent title="选择消息" className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Chat selector */}
        {!isUsingMock && (
          <div className="flex items-center gap-2 pb-3 border-b">
            <span className="text-sm text-muted-foreground whitespace-nowrap">群聊:</span>
            {loadingChats ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : chats.length > 0 ? (
              <select
                className="flex-1 text-sm border rounded px-2 py-1 bg-background"
                value={selectedChatId}
                onChange={(e) => setSelectedChatId(e.target.value)}
              >
                <option value="">选择群聊</option>
                {chats.map(chat => (
                  <option key={chat.chatId} value={chat.chatId}>
                    {chat.name} {chat.memberCount ? `(${chat.memberCount}人)` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-muted-foreground">未加入任何群聊</span>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isUsingMock ? "搜索消息内容、发送者..." : "搜索消息内容或发送者..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Mock mode notice */}
        {isUsingMock && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span>使用模拟数据。配置 FEISHU_APP_ID 和 FEISHU_APP_SECRET 环境变量以启用飞书消息。</span>
          </div>
        )}

        {/* Error state */}
        {error && !isUsingMock && (
          <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-lg text-xs text-destructive">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs ml-auto"
              onClick={() => loadMessages(selectedChatId)}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              重试
            </Button>
          </div>
        )}

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto space-y-2 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>{searchQuery ? '没有找到相关消息' : '暂无消息'}</p>
            </div>
          ) : (
            <>
              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedMessage?.id === msg.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedMessage(msg)}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {msg.senderAvatar ? (
                        <img
                          src={msg.senderAvatar}
                          alt={msg.senderName}
                          className="h-8 w-8 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <User className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{msg.senderName}</span>
                        {msg.channelName && (
                          <Badge variant="default" className="text-xs bg-transparent border border-gray-300 text-gray-600">
                            {msg.channelName}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(msg.timestamp).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        加载中...
                      </>
                    ) : (
                      '加载更多'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button onClick={handleSelect} disabled={!selectedMessage}>
            确认选择
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
