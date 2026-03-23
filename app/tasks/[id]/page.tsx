"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  PlayCircle,
  AlertCircle,
  FileCode,
  GitCommit,
  Bot,
  Coins,
  Tag,
  RotateCcw,
  Loader2,
  MessageCircle,
  Send,
  Trash2
} from "lucide-react";
import { useTaskDetail, useCompleteTask, useCancelTask, useReopenTask, useTaskComments, useAddComment, useDeleteComment } from "@/hooks/useTasks";
import { 
  STATUS_BADGE_VARIANT,
  STATUS_LABELS,
  TaskStatus
} from "@/lib/api/types";

// 优先级选项（与列表页保持一致）
const PRIORITY_OPTIONS = [
  { value: "10", text: "紧急" },
  { value: "8", text: "高" },
  { value: "7", text: "中" },
  { value: "3", text: "低" },
];

const getPriorityText = (value: string | number) => PRIORITY_OPTIONS.find(o => o.value === String(value))?.text ?? String(value);

// 状态图标组件
const getStatusIcon = (status: TaskStatus) => {
  switch (status) {
    case "completed": return <CheckCircle className="w-5 h-5 text-green-500" />;
    case "in_progress": return <PlayCircle className="w-5 h-5 text-blue-500" />;
    case "cancelled": return <XCircle className="w-5 h-5 text-red-500" />;
    default: return <AlertCircle className="w-5 h-5 text-gray-400 dark:text-gray-500 dark:text-gray-400" />;
  }
};

// Server Component - 接收 params 作为 props
export default function TaskDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params);
  
  // 使用 React Query 获取任务详情
  const { data: task, isLoading, error } = useTaskDetail(id);
  
  // Mutations
  const completeTask = useCompleteTask();
  const cancelTask = useCancelTask();
  const reopenTask = useReopenTask();

  // 确认对话框状态
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  
  // 处理完成
  const handleComplete = async () => {
    await completeTask.mutateAsync(id);
  };
  
  // 处理取消
  const handleCancel = async () => {
    setShowCancelConfirm(false);
    await cancelTask.mutateAsync(id);
  };
  
  // 处理重新打开
  const handleReopen = async () => {
    await reopenTask.mutateAsync(id);
  };
  
  const isPending = completeTask.isPending || cancelTask.isPending || reopenTask.isPending;

  // 评论相关
  const { data: comments = [] } = useTaskComments(id);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment(id);
  const [newComment, setNewComment] = useState("");

  // 处理添加评论
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await addComment.mutateAsync({ taskId: id, content: newComment });
    setNewComment("");
  };

  // 处理删除评论
  const handleDeleteComment = async () => {
    if (!deleteCommentId) return;
    await deleteComment.mutateAsync(deleteCommentId);
    setDeleteCommentId(null);
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <Link href="/tasks">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回任务列表
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            加载中...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="p-4 sm:p-6">
        <Link href="/tasks">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回任务列表
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-gray-500 dark:text-gray-400">
            任务不存在
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* 返回按钮 */}
      <Link href="/tasks">
        <Button variant="ghost">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回任务列表
        </Button>
      </Link>

      {/* 任务标题卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{task.id}</span>
                <Badge variant={STATUS_BADGE_VARIANT[task.status]}>
                  {getStatusIcon(task.status)}
                  <span className="ml-1">{STATUS_LABELS[task.status]}</span>
                </Badge>
                <span className="text-sm text-orange-600 font-medium">
                  优先级：{getPriorityText(task.priority)}
                </span>
              </div>
              <CardTitle className="text-xl">{task.title}</CardTitle>
            </div>
            <div className="flex gap-2">
              {task.status === "pending" && (
                <Button onClick={handleComplete} disabled={isPending}>
                  {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  完成
                </Button>
              )}
              {(task.status === "pending" || task.status === "in_progress") && (
                <Button variant="outline" onClick={() => setShowCancelConfirm(true)} disabled={isPending}>
                  取消
                </Button>
              )}
              {task.status === "completed" && (
                <Button variant="outline" onClick={handleReopen} disabled={isPending}>
                  {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                  重新打开
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-200 mb-4">{task.description}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">创建人：</span>
              <span className="font-medium">{task.creator}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">创建时间：</span>
              <span className="font-medium">{task.createdAt}</span>
            </div>
            {task.completedAt && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">完成时间：</span>
                <span className="font-medium">{task.completedAt}</span>
              </div>
            )}
            {task.duration && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">耗时：</span>
                <span className="font-medium">{task.duration} 分钟</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 详细信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 改动摘要 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <FileCode className="w-4 h-4 mr-2" />
              改动摘要
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
              {task.changes || "暂无改动摘要"}
            </p>
          </CardContent>
        </Card>

        {/* 改动文件 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <FileCode className="w-4 h-4 mr-2" />
              改动文件
            </CardTitle>
          </CardHeader>
          <CardContent>
            {task.changedFiles.length > 0 ? (
              <ul className="space-y-1">
                {task.changedFiles.map((file, i) => (
                  <li key={i} className="font-mono text-sm text-gray-600 dark:text-gray-300">
                    {file}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">暂无改动文件</p>
            )}
          </CardContent>
        </Card>

        {/* 关联 Commit */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <GitCommit className="w-4 h-4 mr-2" />
              关联 Commit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {task.commits.length > 0 ? (
              <ul className="space-y-1">
                {task.commits.map((commit, i) => (
                  <li key={i} className="font-mono text-sm text-gray-600 dark:text-gray-300">
                    {commit}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">暂无关联 Commit</p>
            )}
          </CardContent>
        </Card>

        {/* 参与 Agent */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Bot className="w-4 h-4 mr-2" />
              参与 Agent
            </CardTitle>
          </CardHeader>
          <CardContent>
            {task.agents.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {task.agents.map((agent) => (
                  <Badge key={agent} variant="info">
                    {agent}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">暂无参与 Agent</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 底部信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Token 消耗 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Coins className="w-4 h-4 mr-2" />
              Token 消耗
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {task.tokenCost.toLocaleString()}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">Tokens</span>
            </div>
          </CardContent>
        </Card>

        {/* 标签 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Tag className="w-4 h-4 mr-2" />
              标签
            </CardTitle>
          </CardHeader>
          <CardContent>
            {task.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag) => (
                  <Badge key={tag} variant="default">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">暂无标签</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 评论功能 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <MessageCircle className="w-4 h-4 mr-2" />
            任务评论 ({comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 评论列表 */}
          {comments.length > 0 ? (
            <div className="space-y-4 mb-4">
              {comments.map((comment) => (
                <div key={comment.id} className="border-b pb-3 last:border-0">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{comment.author}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">{comment.createdAt}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteCommentId(comment.id)}
                      className="text-red-500 hover:text-red-700 h-6 px-2"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">{comment.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">暂无评论</p>
          )}

          {/* 添加评论表单 */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="添加评论..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-500 rounded-md text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder:text-gray-400 dark:placeholder:text-slate-500"
            />
            <Button
              type="submit"
              disabled={!newComment.trim() || addComment.isPending}
              size="sm"
            >
              {addComment.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Cancel task confirmation dialog */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认取消任务</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            确定要取消这个任务吗？取消后任务状态将变为「已取消」。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>取消</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelTask.isPending}>
              {cancelTask.isPending ? '取消中...' : '确认取消'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete comment confirmation dialog */}
      <Dialog open={!!deleteCommentId} onOpenChange={(open) => !open && setDeleteCommentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除评论</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            确定要删除这条评论吗？此操作无法撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCommentId(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDeleteComment} disabled={deleteComment.isPending}>
              {deleteComment.isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
