'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useProject, useProjectTree } from '../../../hooks/useProjects';
import { FileTreeView } from '../../../components/FileTree';

interface Props {
  params: Promise<{ id: string }>;
}

interface FeatureMap {
  totalFeatures: number;
  features: Array<{ feature: string; description: string; module: string; files: string[] }>;
}

interface ConvertedDoc {
  originalPath: string;
  convertedPath: string;
  format: string;
  title: string;
  size: number;
}

export default function ProjectDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data, isLoading, error } = useProject(id);
  const { data: treeData, isLoading: treeLoading } = useProjectTree(id);

  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'docs' | 'history'>('overview');
  const [featureMap, setFeatureMap] = useState<FeatureMap | null>(null);
  const [docs, setDocs] = useState<ConvertedDoc[]>([]);
  const [gitHistory, setGitHistory] = useState<unknown[]>([]);
  const [loadingSub, setLoadingSub] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { project } = data || {};

  const loadFeatures = async () => {
    setLoadingSub(true);
    try {
      const res = await fetch(`/api/v1/projects/${id}/feature-map`);
      const json = await res.json();
      if (json.code === 0) setFeatureMap(json.data.featureMap);
    } catch { /* ignore */ }
    setLoadingSub(false);
  };

  const loadDocs = async () => {
    setLoadingSub(true);
    try {
      const res = await fetch(`/api/v1/projects/${id}/docs`);
      const json = await res.json();
      if (json.code === 0) setDocs(json.data.docs);
    } catch { /* ignore */ }
    setLoadingSub(false);
  };

  const loadGitHistory = async () => {
    setLoadingSub(true);
    try {
      const res = await fetch(`/api/v1/projects/${id}/git-history`);
      const json = await res.json();
      if (json.code === 0) setGitHistory(json.data.analysis || []);
    } catch { /* ignore */ }
    setLoadingSub(false);
  };

  const handleRefresh = async () => {
    if (!confirm('确定要刷新此项目吗？这将重新解析项目文件。')) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/v1/projects/${id}/refresh`, { method: 'POST' });
      const json = await res.json();
      if (json.code === 0) {
        alert(`刷新完成！\n新特性: ${json.data.refresh.newFeatures}\n新文档: ${json.data.refresh.newDocs}\n新提交: ${json.data.refresh.newCommits}`);
        window.location.reload();
      } else {
        alert('刷新失败: ' + json.message);
      }
    } catch (e) {
      alert('刷新失败: ' + (e as Error).message);
    }
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error || !data || !project) {
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

  return (
    <div className="p-6">
      {/* 顶部导航 */}
      <div className="mb-6">
        <Link href="/projects" className="text-blue-600 hover:underline text-sm">
          ← 返回项目列表
        </Link>
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['overview', 'features', 'docs', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              if (tab === 'features') loadFeatures();
              if (tab === 'docs') loadDocs();
              if (tab === 'history') loadGitHistory();
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'overview' && '📋 概览'}
            {tab === 'features' && '🗺️ 功能定位'}
            {tab === 'docs' && '📄 文档库'}
            {tab === 'history' && '📜 Git历史'}
          </button>
        ))}
      </div>

      {/* 概览 Tab */}
      {activeTab === 'overview' && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  导入于 {new Date(project.importedAt).toLocaleString('zh-CN')}
                </p>
              </div>
              <span className={`px-3 py-1 text-sm rounded-full ${project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {project.status === 'active' ? '活跃' : '已归档'}
              </span>
            </div>

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
            {!treeLoading && !treeData?.tree && <div className="text-sm text-gray-500">无法加载文件树</div>}
          </div>

          {/* 快捷操作 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
            <div className="flex flex-wrap gap-3">
              <Link href={`/tasks?project=${project.id}`} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                查看任务
              </Link>
              <Link href={`/versions?project=${project.id}`} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
                版本管理
              </Link>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {refreshing ? '刷新中...' : '🔄 重新解析'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 功能定位 Tab */}
      {activeTab === 'features' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🗺️ 功能定位文件</h2>
          {loadingSub && !featureMap && <div className="text-sm text-gray-500">加载中...</div>}
          {!loadingSub && !featureMap && (
            <div className="text-sm text-gray-500 mb-4">点击加载按钮获取功能列表</div>
          )}
          {!loadingSub && featureMap && (
            <>
              <div className="mb-4 text-sm text-gray-500">共识别 {featureMap.totalFeatures} 个功能模块</div>
              <div className="space-y-3">
                {featureMap.features.map((f, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 px-2 py-0.5 text-xs rounded ${
                        f.module === 'ui' ? 'bg-blue-100 text-blue-700' :
                        f.module === 'api' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {f.module}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900">{f.feature}</div>
                        <div className="text-xs text-gray-500 mt-1">{f.description}</div>
                        {f.files.length > 0 && (
                          <div className="text-xs text-gray-400 mt-1 font-mono">
                            {f.files.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {!featureMap && !loadingSub && (
            <button
              onClick={loadFeatures}
              className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              加载功能列表
            </button>
          )}
        </div>
      )}

      {/* 文档库 Tab */}
      {activeTab === 'docs' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📄 转换文档库</h2>
          {loadingSub && !docs.length && <div className="text-sm text-gray-500">加载中...</div>}
          {!loadingSub && docs.length === 0 && (
            <div className="text-sm text-gray-500 mb-4">暂无转换后的文档</div>
          )}
          {docs.length > 0 && (
            <div className="mb-4 text-sm text-gray-500">共 {docs.length} 个文档</div>
          )}
          {docs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">格式</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">标题</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">原始路径</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700">大小</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          {doc.format}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-900">{doc.title}</td>
                      <td className="py-2 px-3 text-gray-500 font-mono text-xs">{doc.originalPath}</td>
                      <td className="py-2 px-3 text-gray-500 text-right">{(doc.size / 1024).toFixed(1)} KB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            onClick={loadDocs}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            {docs.length > 0 ? '🔄 刷新文档列表' : '📂 加载文档'}
          </button>
        </div>
      )}

      {/* Git历史 Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📜 Git 提交历史</h2>
          {loadingSub && !gitHistory.length && <div className="text-sm text-gray-500">加载中...</div>}
          {!loadingSub && gitHistory.length === 0 && (
            <div className="text-sm text-gray-500 mb-4">暂无Git历史记录</div>
          )}
          {gitHistory.length > 0 && (
            <div className="space-y-3">
              {(gitHistory as { hash: string; message: string; author: string; date: string }[]).slice(0, 30).map((commit, i) => (
                <div key={i} className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
                  <div className="font-mono text-xs text-gray-400 mt-0.5">{commit.hash?.slice(0, 7)}</div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-900">{commit.message}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {commit.author} · {new Date(commit.date).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={loadGitHistory}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            {gitHistory.length > 0 ? '🔄 刷新历史' : '📜 加载Git历史'}
          </button>
        </div>
      )}
    </div>
  );
}
