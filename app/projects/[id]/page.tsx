'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useProject, useProjectTree } from '../../../hooks/useProjects';
import { FileTreeView } from '../../../components/FileTree';

// ========== 分支管理面板 ==========

interface Branch {
  id: string;
  name: string;
  isMain: boolean;
  isProtected: boolean;
  lastCommitHash?: string;
  lastCommitMessage?: string;
  lastCommitAt?: string;
  commitCount?: number;
}

function BranchesPanel() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [baseBranch, setBaseBranch] = useState('main');
  const [creating, setCreating] = useState(false);
  const [settingMain, setSettingMain] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const loadBranches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/branches?pageSize=100`);
      const json = await res.json();
      if (json.code === 0) setBranches(json.data.data || []);
      else showToast('error', json.message || '加载失败');
    } catch {
      showToast('error', '网络错误');
    }
    setLoading(false);
  };

  const createBranch = async () => {
    if (!newBranchName.trim()) { showToast('error', '分支名不能为空'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/v1/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBranchName.trim(), baseBranch }),
      });
      const json = await res.json();
      if (json.code === 0) {
        showToast('success', `分支 ${newBranchName} 创建成功`);
        setNewBranchName('');
        setShowCreate(false);
        loadBranches();
      } else {
        showToast('error', json.message || '创建失败');
      }
    } catch {
      showToast('error', '网络错误');
    }
    setCreating(false);
  };

  const setMain = async (branchId: string, branchName: string) => {
    setSettingMain(branchId);
    try {
      const res = await fetch(`/api/v1/branches/${branchId}/main`, { method: 'PUT' });
      const json = await res.json();
      if (json.code === 0) {
        showToast('success', `${branchName} 已设为主分支`);
        loadBranches();
      } else {
        showToast('error', json.message || '设置失败');
      }
    } catch {
      showToast('error', '网络错误');
    }
    setSettingMain(null);
  };

  const deleteBranch = async (branch: Branch) => {
    if (!confirm(`确定删除分支 "${branch.name}" 吗？`)) return;
    setDeleting(branch.id);
    try {
      const res = await fetch(`/api/v1/branches/${branch.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.code === 0) {
        showToast('success', `分支 ${branch.name} 已删除`);
        loadBranches();
      } else {
        showToast('error', json.message || '删除失败');
      }
    } catch {
      showToast('error', '网络错误');
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`px-4 py-2 rounded-lg text-sm ${toast.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">🌿 分支管理</h2>
        <div className="flex gap-2">
          <button onClick={loadBranches} className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors">
            🔄 刷新
          </button>
          <button onClick={() => setShowCreate(true)} className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            + 新建分支
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">创建新分支</h3>
          <div className="flex gap-2 mb-3">
            <input
              value={newBranchName}
              onChange={e => setNewBranchName(e.target.value)}
              placeholder="feature/xxx 或 release/xxx"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-700 dark:text-white"
              onKeyDown={e => e.key === 'Enter' && createBranch()}
            />
            <select value={baseBranch} onChange={e => setBaseBranch(e.target.value)} className="px-2 py-2 border border-gray-300 dark:border-slate-500 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400">
              {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={createBranch} disabled={creating} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {creating ? '创建中...' : '确认创建'}
            </button>
            <button onClick={() => { setShowCreate(false); setNewBranchName(''); }} className="px-4 py-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500">
              取消
            </button>
          </div>
        </div>
      )}

      {loading && <div className="text-sm text-gray-500 dark:text-gray-400">加载中...</div>}
      {!loading && branches.length === 0 && <div className="text-sm text-gray-400 dark:text-gray-500">暂无分支</div>}

      {!loading && branches.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">分支</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">状态</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">最后提交</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {branches.map(branch => (
                <tr key={branch.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {branch.isMain && <span className="text-yellow-500" title="主分支">⭐</span>}
                      {branch.isProtected && <span className="text-red-400" title="保护分支">🔒</span>}
                      <span className="font-mono text-gray-900">{branch.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {branch.isMain && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">主分支</span>}
                      {branch.isProtected && <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs">保护</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {branch.lastCommitMessage ? (
                      <div>
                        <div className="truncate max-w-xs">{branch.lastCommitMessage}</div>
                        <div className="text-gray-400 mt-0.5">
                          {branch.lastCommitAt ? new Date(branch.lastCommitAt).toLocaleString('zh-CN') : ''}
                        </div>
                      </div>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {!branch.isMain && (
                        <button
                          onClick={() => setMain(branch.id, branch.name)}
                          disabled={settingMain === branch.id}
                          className="px-2 py-1 text-xs bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded transition-colors disabled:opacity-50"
                        >
                          {settingMain === branch.id ? '设置中...' : '设为主分支'}
                        </button>
                      )}
                      {!branch.isProtected && (
                        <button
                          onClick={() => deleteBranch(branch)}
                          disabled={deleting === branch.id}
                          className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors disabled:opacity-50"
                        >
                          {deleting === branch.id ? '删除中...' : '删除'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

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

  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'docs' | 'history' | 'branches'>('overview');
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
      <div className="p-4 sm:p-6">
        <div className="text-center py-12 text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error || !data || !project) {
    return (
      <div className="p-4 sm:p-6">
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
    <div className="p-4 sm:p-6">
      {/* 顶部导航 */}
      <div className="mb-6">
        <Link href="/projects" className="text-blue-600 hover:underline text-sm">
          ← 返回项目列表
        </Link>
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['overview', 'features', 'docs', 'history', 'branches'] as const).map(tab => (
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
            {tab === 'branches' && '🌿 分支'}
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

      {activeTab === 'branches' && <BranchesPanel />}
    </div>
  );
}
