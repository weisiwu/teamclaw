'use client';

import Link from 'next/link';
import { useState, useRef, useCallback } from 'react';
import { Loader2, Package } from 'lucide-react';
import { useProjects, useDeleteProject } from '../../hooks/useProjects';
import { EmptyState } from '@/components/ui/empty-state';
import { ProjectsSkeleton } from '@/components/ui/projects-skeleton';

export default function ProjectsPage() {
  const { data, isLoading, error, refetch } = useProjects();
  const deleteMutation = useDeleteProject();
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleGridKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!data?.projects.length) return;
    const cols = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 768 ? 2 : 1;
    const len = data.projects.length;
    let next = focusedIndex;

    if (e.key === 'ArrowRight') { next = (focusedIndex + 1) % len; e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { next = (focusedIndex - 1 + len) % len; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { next = Math.min(focusedIndex + cols, len - 1); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { next = Math.max(focusedIndex - cols, 0); e.preventDefault(); }
    else if (e.key === 'Enter' && focusedIndex >= 0) {
      const pid = data.projects[focusedIndex].id;
      window.location.href = `/projects/${pid}`;
      return;
    } else return;

    setFocusedIndex(next);
    // scroll focused card into view
    setTimeout(() => {
      const cards = gridRef.current?.querySelectorAll('[data-project-card]');
      cards?.[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 0);
  }, [focusedIndex, data]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-header-title">项目列表</h1>
          <p className="page-header-subtitle">
            已导入 {data?.total ?? 0} 个项目
          </p>
        </div>
        <Link
          href="/import"
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          + 导入新项目
        </Link>
      </div>

      {isLoading && <ProjectsSkeleton />}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">加载失败</p>
            <p className="text-xs opacity-75 mt-0.5">{(error as Error).message}</p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-medium rounded transition-colors shrink-0"
          >
            重试
          </button>
        </div>
      )}

      {data && data.projects.length === 0 && (
        <EmptyState
          icon={Package}
          title="暂无项目"
          description="导入第一个项目开始使用"
          action={
            <Link
              href="/import"
              className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90 transition-opacity"
            >
              立即导入
            </Link>
          }
        />
      )}

      {data && data.projects.length > 0 && (
        <div
          ref={gridRef}
          tabIndex={0}
          onKeyDown={handleGridKeyDown}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 outline-none"
        >
          {data.projects.map((project, i) => (
            <div
              key={project.id}
              data-project-card
              onClick={() => setFocusedIndex(i)}
              className={`page-section transition-shadow cursor-pointer ${
                focusedIndex === i
                  ? 'ring-2 ring-blue-500 dark:ring-blue-400 shadow-md'
                  : 'hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground truncate">
                    {project.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    导入于 {new Date(project.importedAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <span
                  className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    project.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {project.status === 'active' ? '活跃' : '已归档'}
                </span>
              </div>

              {/* 技术栈标签 */}
              <div className="flex flex-wrap gap-1 mb-3">
                {project.techStack.slice(0, 4).map((stack) => (
                  <span
                    key={stack}
                    className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full"
                  >
                    {stack}
                  </span>
                ))}
                {project.techStack.length > 4 && (
                  <span className="px-2 py-0.5 bg-secondary text-muted-foreground text-xs rounded-full">
                    +{project.techStack.length - 4}
                  </span>
                )}
              </div>

              {/* 信息行 */}
              <div className="text-xs text-muted-foreground space-y-1 mb-4">
                {project.buildTool && (
                  <div>构建工具: {project.buildTool}</div>
                )}
                <div>来源: {project.source === 'url' ? `Git (${project.url})` : project.localPath}</div>
                <div>Git: {project.hasGit ? '✓ 是' : '✗ 否'}</div>
              </div>

              {/* 操作 */}
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <Link
                  href={`/projects/${project.id}`}
                  className="flex-1 text-center px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  查看详情
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`确定删除项目 "${project.name}" 吗？`)) {
                      deleteMutation.mutate(project.id);
                    }
                  }}
                  className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
