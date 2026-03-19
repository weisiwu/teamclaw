'use client';

import Link from 'next/link';
import { useProjects, useDeleteProject } from '../../hooks/useProjects';

export default function ProjectsPage() {
  const { data, isLoading, error } = useProjects();
  const deleteMutation = useDeleteProject();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">项目列表</h1>
          <p className="text-sm text-gray-500 mt-1">
            已导入 {data?.total ?? 0} 个项目
          </p>
        </div>
        <Link
          href="/import"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 导入新项目
        </Link>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          加载失败：{(error as Error).message}
        </div>
      )}

      {data && data.projects.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">暂无项目</h3>
          <p className="text-gray-500 text-sm mb-4">导入第一个项目开始使用</p>
          <Link
            href="/import"
            className="inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            立即导入
          </Link>
        </div>
      )}

      {data && data.projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.projects.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {project.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    导入于 {new Date(project.importedAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <span
                  className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    project.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
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
                    className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
                  >
                    {stack}
                  </span>
                ))}
                {project.techStack.length > 4 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    +{project.techStack.length - 4}
                  </span>
                )}
              </div>

              {/* 信息行 */}
              <div className="text-xs text-gray-500 space-y-1 mb-4">
                {project.buildTool && (
                  <div>构建工具: {project.buildTool}</div>
                )}
                <div>来源: {project.source === 'url' ? `Git (${project.url})` : project.localPath}</div>
                <div>Git: {project.hasGit ? '✓ 是' : '✗ 否'}</div>
              </div>

              {/* 操作 */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <Link
                  href={`/projects/${project.id}`}
                  className="flex-1 text-center px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                >
                  查看详情
                </Link>
                <button
                  onClick={() => {
                    if (confirm(`确定删除项目 "${project.name}" 吗？`)) {
                      deleteMutation.mutate(project.id);
                    }
                  }}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
