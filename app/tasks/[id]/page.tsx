"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  RotateCcw
} from "lucide-react";

// 任务类型定义
interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: number;
  creator: string;
  createdAt: string;
  completedAt: string | null;
  duration: number | null;
  changes: string;
  changedFiles: string[];
  commits: string[];
  agents: string[];
  tokenCost: number;
  tags: string[];
}

// 模拟数据
const tasksData: Record<string, Task> = {
  "t_20260316_001": {
    id: "t_20260316_001",
    title: "首页按钮样式修改",
    description: "修改首页主按钮背景色为 #1677FF，字号从 14px 调整为 16px",
    status: "completed",
    priority: 10,
    creator: "管理员A",
    createdAt: "2026-03-16 20:01:00",
    completedAt: "2026-03-16 20:15:00",
    duration: 14,
    changes: "修改首页主按钮背景色为 #1677FF，字号从 14px 调整为 16px",
    changedFiles: ["src/pages/Home/index.tsx", "src/styles/button.css"],
    commits: ["a1b2c3d: 修改首页按钮样式", "e4f5g6h: 调整字号"],
    agents: ["main", "pm", "coder1"],
    tokenCost: 4200,
    tags: ["UI", "首页", "样式"],
  },
  "t_20260316_002": {
    id: "t_20260316_002",
    title: "添加收藏功能",
    description: "在商品详情页添加收藏按钮，支持本地存储",
    status: "in_progress",
    priority: 7,
    creator: "管理员B",
    createdAt: "2026-03-16 21:00:00",
    completedAt: null,
    duration: null,
    changes: "正在开发中...",
    changedFiles: [],
    commits: [],
    agents: ["pm", "coder1"],
    tokenCost: 8500,
    tags: ["功能", "收藏"],
  },
  "t_20260317_001": {
    id: "t_20260317_001",
    title: "修复登录页闪烁问题",
    description: "登录页面加载时有短暂白屏，需要优化",
    status: "pending",
    priority: 8,
    creator: "管理员A",
    createdAt: "2026-03-17 09:00:00",
    completedAt: null,
    duration: null,
    changes: "",
    changedFiles: [],
    commits: [],
    agents: [],
    tokenCost: 0,
    tags: ["Bug", "登录"],
  },
};

const statusBadgeVariant: Record<Task["status"], "default" | "success" | "warning" | "error" | "info"> = {
  pending: "default",
  in_progress: "info",
  completed: "success",
  cancelled: "error",
};

const statusLabels: Record<Task["status"], string> = {
  pending: "待处理",
  in_progress: "进行中",
  completed: "已完成",
  cancelled: "已取消",
};

const getStatusIcon = (status: Task["status"]) => {
  switch (status) {
    case "completed": return <CheckCircle className="w-5 h-5 text-green-500" />;
    case "in_progress": return <PlayCircle className="w-5 h-5 text-blue-500" />;
    case "cancelled": return <XCircle className="w-5 h-5 text-red-500" />;
    default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
  }
};

// Server Component - 接收 params 作为 props
export default function TaskDetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const router = useRouter();
  const task = tasksData[params.id];

  if (!task) {
    return (
      <div className="p-6">
        <Link href="/tasks">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回任务列表
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            任务不存在
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
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
                <span className="font-mono text-sm text-gray-500">{task.id}</span>
                <Badge variant={statusBadgeVariant[task.status]}>
                  {getStatusIcon(task.status)}
                  <span className="ml-1">{statusLabels[task.status]}</span>
                </Badge>
                <span className="text-sm text-orange-600 font-medium">
                  优先级：{task.priority}
                </span>
              </div>
              <CardTitle className="text-xl">{task.title}</CardTitle>
            </div>
            <div className="flex gap-2">
              {task.status === "pending" && (
                <Button onClick={() => router.push(`/tasks`)}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  完成
                </Button>
              )}
              {(task.status === "pending" || task.status === "in_progress") && (
                <Button variant="outline" onClick={() => router.push(`/tasks`)}>
                  取消
                </Button>
              )}
              {task.status === "completed" && (
                <Button variant="outline" onClick={() => router.push(`/tasks`)}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  重新打开
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">创建人：</span>
              <span className="font-medium">{task.creator}</span>
            </div>
            <div>
              <span className="text-gray-500">创建时间：</span>
              <span className="font-medium">{task.createdAt}</span>
            </div>
            {task.completedAt && (
              <div>
                <span className="text-gray-500">完成时间：</span>
                <span className="font-medium">{task.completedAt}</span>
              </div>
            )}
            {task.duration && (
              <div>
                <span className="text-gray-500">耗时：</span>
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
            <p className="text-gray-700 whitespace-pre-wrap">
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
                  <li key={i} className="font-mono text-sm text-gray-600">
                    {file}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">暂无改动文件</p>
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
                  <li key={i} className="font-mono text-sm text-gray-600">
                    {commit}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">暂无关联 Commit</p>
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
              <p className="text-gray-500">暂无参与 Agent</p>
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
            <div className="text-3xl font-bold text-gray-900">
              {task.tokenCost.toLocaleString()}
              <span className="text-sm font-normal text-gray-500 ml-2">Tokens</span>
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
              <p className="text-gray-500">暂无标签</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
