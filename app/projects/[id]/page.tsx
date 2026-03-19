'use client';

import { use } from 'react';
import Link from 'next/link';
import { useProject, useProjectTree } from '../../../hooks/useProjects';
import { FileTreeView } from '../../../components/FileTree';

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data, isLoading, error } = useProject(id);
  const { data: treeData, isLoading: treeLoading } = useProjectTree(id);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          加载失败：{(error as Error).message}
        </div>
        <div className="mt-4">
          <Link href="/projects" className="text-blue-600 hover:underline text-sm">
            ← 返回项目列表
          </Link>
        </div>
      </div>
    );
  }

  const { project } = data;

  return (
    <div className="p-6">
      {/* 顶部导航 */}
      <div className="mb-6">
        <Link href="/projects" className="text-blue-600 hover:underline text-sm">
          ← 返回项目列表
        </Link>
      </div>

      {/* 项目概览 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              导入于 {new Date(project.importedAt).toLocaleString('zh-CN')}
            </p>
          </div>
          <span
            className={`px-3 py-1 text-sm rounded-full ${
              project.status === 'active'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {project.status === 'active' ? '活跃' : '已归档'}
          </span>
        </div>

        {/* 信息卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">技术栈</div>
            <div className="font-medium text-sm">{project.techStack.join(', ') || '未知'}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">构建工具</div>
            <div className="font-medium text-sm">{project.buildTool || '未知'}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">数据来源</div>
            <div className="font-medium text-sm">{project.source === 'url' ? 'Git URL' : '本地路径'}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Git 仓库</div>
            <div className="font-medium text-sm">{project.hasGit ? '✓ 是' : '✗ 否'}</div>
          </div>
        </div>

        {/* 详细路径 */}
        {project.url && (
          <div className="mb-3">
            <span className="text-sm font-medium text-gray-700">仓库地址：</span>
            <span className="text-sm text-gray-600 ml-2">{project.url}</span>
          </div>
        )}
        {project.localPath && (
          <div>
            <span className="text-sm font-medium text-gray-700">本地路径：</span>
            <span className="text-sm text-gray-600 ml-2 font-mono text-xs">{project.localPath}</span>
          </div>
        )}
      </div>

      {/* 文件树 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">项目文件</h2>
        {treeLoading && <div className="text-sm text-gray-500">加载中...</div>}
        {treeData?.tree && <FileTreeView tree={treeData.tree} />}
        {!treeLoading && !treeData?.tree && (
          <div className="text-sm text-gray-500">无法加载文件树</div>
        )}
      </div>

      {/* 快捷操作 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/tasks?project=${project.id}`}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            查看任务
          </Link>
          <Link
            href={`/versions?project=${project.id}`}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
          >
            版本管理
          </Link>
          <button
            onClick={() => {
              if (confirm('确定要刷新此项目吗？')) {
                window.location.reload();
              }
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
          >
            重新解析
          </button>
        </div>
      </div>
    </div>
  );
}
