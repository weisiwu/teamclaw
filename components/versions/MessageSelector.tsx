"use client";

import { useState } from "react";
import { Search, MessageSquare, User } from "lucide-react";
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

// Mock 消息数据
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

interface MessageSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (message: MessageItem) => void;
}

export function MessageSelector({ open, onOpenChange, onSelect }: MessageSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null);

  const filteredMessages = mockMessages.filter(
    (msg) =>
      msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.channelName?.toLowerCase().includes(searchQuery.toLowerCase())
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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent title="选择消息" className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索消息内容、发送者或频道..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 py-4">
          {filteredMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>没有找到相关消息</p>
            </div>
          ) : (
            filteredMessages.map((msg) => (
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
                    <User className="h-4 w-4 text-primary" />
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
            ))
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
