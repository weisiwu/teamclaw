'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useProjects, useDeleteProject } from '../../hooks/useProjects';

export default function ProjectsPage() {
  const { data, isLoading, error } = useProjects();
  const deleteMutation = useDeleteProject();

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

      {isLoading && (
        <div className="page-loading">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>加载中...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm">
          加载失败：{(error as Error).message}
        </div>
      )}

      {data && data.projects.length === 0 && (
        <div className="page-section">
          <div className="page-empty">
            <div className="page-empty-icon">📦</div>
            <h3 className="page-empty-title">暂无项目</h3>
            <p className="page-empty-desc">导入第一个项目开始使用</p>
            <Link
              href="/import"
              className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90 transition-opacity"
            >
              立即导入
            </Link>
          </div>
        </div>
      )}

      {data && data.projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.projects.map((project) => (
            <div
              key={project.id}
              className="page-section hover:shadow-md transition-shadow"
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
                  onClick={() => {
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
