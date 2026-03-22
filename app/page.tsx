'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Layers,
  GitBranch,
  Zap,
  Clock,
  FileText,
  Key,
  Users,
  Activity,
  Folder,
  CheckCircle,
  PlayCircle,
} from 'lucide-react';
import Link from 'next/link';

const menuItems = [
  { href: '/tasks', label: '任务管理', icon: Layers, description: '管理自动化任务' },
  { href: '/versions', label: '版本管理', icon: GitBranch, description: '版本发布控制' },
  { href: '/capabilities', label: '能力配置', icon: Zap, description: 'AI 能力配置' },
  { href: '/cron', label: '定时任务', icon: Clock, description: '定时任务调度' },
  { href: '/docs', label: '文档中心', icon: FileText, description: '知识库文档' },
  { href: '/tokens', label: 'Token 管理', icon: Key, description: 'API 令牌管理' },
  { href: '/members', label: '成员管理', icon: Users, description: '团队成员管理' },
];

interface OverviewData {
  projects: { total: number; active: number };
  tasks: { total: number; completed: number; inProgress: number; pending: number; cancelled: number };
  versions: { total: number; latest: string };
  tokens: { todayUsed: number; weekUsed: number; monthUsed: number; estimatedCost: number };
  agents: { total: number; busy: number; idle: number };
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

export default function Home() {
  const { data: overviewData, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => fetch('/api/v1/dashboard/overview').then(r => r.json()),
    staleTime: 60000, // 60s - dashboard data doesn't change frequently
    gcTime: 300000,   // 5min - keep in cache
    refetchOnWindowFocus: true,
  });

  const overview = overviewData?.data as OverviewData | null;
  const loading = isLoading;

  return (
    <div className="page-container">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">控制台</h1>
          <p className="text-gray-500 dark:text-gray-400 dark:text-slate-400 mt-1">欢迎使用 TeamClaw 管理后台</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Activity className="w-4 h-4 text-gray-500 dark:text-gray-400 dark:text-slate-400" />
          <span className="text-gray-500 dark:text-gray-400 dark:text-slate-400">系统运行正常</span>
        </div>
      </div>

      {/* 概览统计卡片 */}
      {!loading && overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-200 rounded-lg">
                  <Folder className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-medium">项目</p>
                  <p className="text-xl font-bold text-blue-900">
                    {overview.projects.total}
                    <span className="text-sm font-normal text-blue-600 ml-1">
                      (活跃 {overview.projects.active})
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <p className="text-xs text-green-600 font-medium">已完成任务</p>
                  <p className="text-xl font-bold text-green-900">
                    {overview.tasks.completed}
                    <span className="text-sm font-normal text-green-600 ml-1">
                      / {overview.tasks.total}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-200 rounded-lg">
                  <PlayCircle className="w-5 h-5 text-orange-700" />
                </div>
                <div>
                  <p className="text-xs text-orange-600 font-medium">进行中</p>
                  <p className="text-xl font-bold text-orange-900">
                    {overview.tasks.inProgress}
                    <span className="text-sm font-normal text-orange-600 ml-1">
                      任务
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-200 rounded-lg">
                  <GitBranch className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <p className="text-xs text-purple-600 font-medium">版本</p>
                  <p className="text-xl font-bold text-purple-900">
                    {overview.versions.latest || 'v0.0.0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-200 rounded-lg">
                  <Key className="w-5 h-5 text-yellow-700" />
                </div>
                <div>
                  <p className="text-xs text-yellow-600 font-medium">本周 Token</p>
                  <p className="text-xl font-bold text-yellow-900">
                    {formatNumber(overview.tokens.weekUsed)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 加载骨架 */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-20 bg-gray-100 dark:bg-slate-700" />
            </Card>
          ))}
        </div>
      )}

      {/* 菜单卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <item.icon className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">{item.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-slate-400">{item.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
