'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LegacySelect as Select } from "@/components/ui/select";
import { PriorityBadge, StatusBadge, RoleBadge } from "@/components/messages/PriorityBadge";
import { useQueueStatus, usePreemptMessage, useSendMessage } from "@/hooks/useMessages";
import {
  MessageSquare,
  Zap,
  Clock,
  AlertTriangle,
  Send,
  RefreshCw,
  Shield,
  User,
  Info,
} from "lucide-react";

function QueuePageContent() {
  const { data: queue, isLoading, error, refetch } = useQueueStatus();
  const preemptMutation = usePreemptMessage();
  const sendMutation = useSendMessage();

  // 测试发送表单
  const [testForm, setTestForm] = useState({
    channel: "web" as const,
    userId: "test_user_001",
    userName: "测试用户",
    role: "employee" as const,
    content: "",
  });

  const handleSendTest = async () => {
    if (!testForm.content.trim()) return;
    try {
      await sendMutation.mutateAsync(testForm);
      setTestForm({ ...testForm, content: "" });
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handlePreempt = async (messageId: string) => {
    try {
      await preemptMutation.mutateAsync(messageId);
    } catch (err) {
      console.error("Failed to preempt:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">消息队列</h1>
            <p className="text-gray-500 mt-1">实时消息处理状态</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            加载中...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">消息队列</h1>
            <p className="text-gray-500 mt-1">实时消息处理状态</p>
          </div>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 text-center text-red-600">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>加载失败: {String(error)}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              重试
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentMsg = queue?.currentProcessing
    ? queue.list.find((m) => m.messageId === queue.currentProcessing)
    : null;

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">消息队列</h1>
          <p className="text-gray-500 mt-1">实时消息处理状态 · 每5秒自动刷新</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium">队列总数</p>
              <p className="text-xl font-bold text-blue-900">{queue?.total ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-green-600 font-medium">处理中</p>
              <p className="text-xl font-bold text-green-900">
                {currentMsg ? "1" : "0"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-purple-600 font-medium">排队中</p>
              <p className="text-xl font-bold text-purple-900">
                {(queue?.total ?? 0) - (currentMsg ? 1 : 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-orange-600 font-medium">抢占规则</p>
              <p className="text-xs font-bold text-orange-900">Pnew &gt; Pold × 1.5</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 当前处理中的消息 */}
      {currentMsg && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-green-700">
              <Zap className="w-4 h-4" />
              正在处理
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{currentMsg.userName}</span>
                <RoleBadge role={currentMsg.role} />
              </div>
              <PriorityBadge priority={currentMsg.priority} />
              <StatusBadge status={currentMsg.status} />
              <span className="text-sm text-gray-500">{currentMsg.content}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 队列列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              排队消息
              {queue?.total ? ` (${queue.total})` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!queue?.list || queue.list.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>队列空闲，暂无待处理消息</p>
              </div>
            ) : (
              <div className="space-y-3">
                {queue.list
                  .filter((m) => m.status !== "processing")
                  .map((msg) => (
                    <div
                      key={msg.messageId}
                      className="border rounded-lg p-3 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <User className="w-3 h-3 text-gray-400" />
                          <span className="text-sm font-medium">{msg.userName}</span>
                          <RoleBadge role={msg.role} />
                          <StatusBadge status={msg.status} />
                        </div>
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={msg.priority} />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePreempt(msg.messageId)}
                            disabled={preemptMutation.isPending}
                            className="h-7 text-xs"
                          >
                            抢占
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{msg.content}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(msg.timestamp).toLocaleString("zh-CN")}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 测试消息发送 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="w-4 h-4" />
              测试消息发送
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">用户名</label>
                <Input
                  value={testForm.userName}
                  onChange={(e) => setTestForm({ ...testForm, userName: e.target.value })}
                  placeholder="测试用户"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">角色</label>
                <Select
                  options={[
                    { value: "admin", label: "管理员" },
                    { value: "vice_admin", label: "副管理员" },
                    { value: "employee", label: "员工" },
                  ]}
                  value={testForm.role}
                  onChange={(e) =>
                    setTestForm({ ...testForm, role: e.target.value as typeof testForm.role })
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">消息内容</label>
              <Input
                value={testForm.content}
                onChange={(e) => setTestForm({ ...testForm, content: e.target.value })}
                placeholder="输入测试消息（试试加【紧急】看抢占效果）"
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendTest();
                }}
              />
              <p className="text-xs text-gray-400 mt-1">
                提示：输入【紧急修复Bug】可触发抢占（管理员权重10×紧急度3=优先级30）
              </p>
            </div>
            <Button
              onClick={handleSendTest}
              disabled={!testForm.content.trim() || sendMutation.isPending}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendMutation.isPending ? "发送中..." : "发送消息"}
            </Button>

            {/* 优先级说明 */}
            <div className="border-t pt-4 mt-4">
              <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                <Info className="w-3 h-3" />
                优先级计算规则
              </p>
              <div className="space-y-1 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Badge variant="error" className="text-xs">P30</Badge>
                  <span>管理员 + 紧急消息 (10×3)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="warning" className="text-xs">P15</Badge>
                  <span>副管理员 + 高优先级 (7×2)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="info" className="text-xs">P10</Badge>
                  <span>管理员 + 普通消息 (10×1)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">P3</Badge>
                  <span>员工 + 普通消息 (3×1)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 抢占规则说明 */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            抢占规则说明
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium text-gray-700">抢占条件</p>
              <p className="text-gray-500">
                新消息优先级 &gt; 当前任务优先级 × 1.5 时触发抢占
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-gray-700">抢占效果</p>
              <p className="text-gray-500">
                被抢占任务进入<span className="text-orange-600 font-medium">已挂起</span>状态，
                新任务开始执行
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-gray-700">消息合并</p>
              <p className="text-gray-500">
                同一用户<span className="text-blue-600 font-medium">5分钟内</span>的连续消息
                自动合并为一条
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MessageQueuePage() {
  return <QueuePageContent />;
}
