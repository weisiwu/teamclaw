'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { importProject, fetchImportStatus } from '../../lib/api/projects';

type Step = 1 | 2 | 3 | 4;

interface ProjectInfo {
  projectId: string;
  name: string;
  techStack: string[];
  buildTool?: string;
  hasGit: boolean;
}

export default function ImportPage() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [source, setSource] = useState<'url' | 'local'>('url');
  const [url, setUrl] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 轮询导入状态
  const [taskData, setTaskData] = useState<Awaited<ReturnType<typeof fetchImportStatus>>['task'] | null>(null);

  const pollStatus = useCallback(async (tid: string) => {
    try {
      const data = await fetchImportStatus(tid);
      setTaskData(data.task);
      if (data.task.status === 'done') {
        setCurrentStep(4);
      } else if (data.task.status === 'error') {
        setError('导入失败，请重试');
        setCurrentStep(1);
      }
    } catch {
      // ignore polling errors
    }
  }, []);

  // 步骤1: 发起导入
  const handleStep1Next = async () => {
    setError(null);
    if (source === 'url' && !url.trim()) return;
    if (source === 'local' && !localPath.trim()) return;

    try {
      const name = projectName.trim() || undefined;
      const result = await importProject({
        source,
        url: source === 'url' ? url : undefined,
        localPath: source === 'local' ? localPath : undefined,
        name,
      });

      setProjectInfo({
        projectId: result.project.id,
        name: result.project.name,
        techStack: result.project.techStack,
        buildTool: result.project.buildTool,
        hasGit: result.project.hasGit,
      });
      setTaskId(result.task.taskId);
      setCurrentStep(2);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // 步骤2: 确认并开始解析
  const handleStep2Next = () => {
    if (!taskId) return;
    setCurrentStep(3);
    // 开始轮询
    const interval = setInterval(() => {
      pollStatus(taskId).then(() => {
        if (taskData?.status === 'done' || taskData?.status === 'error') {
          clearInterval(interval);
        }
      });
    }, 3000);
  };

  // 重新开始
  const handleRestart = () => {
    setCurrentStep(1);
    setUrl('');
    setLocalPath('');
    setProjectName('');
    setProjectInfo(null);
    setTaskId(null);
    setTaskData(null);
    setError(null);
  };

  // 渲染步骤指示器
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {['选择数据源', '确认信息', '解析进度', '完成'].map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep > i + 1
                  ? 'bg-green-500 text-white'
                  : currentStep === i + 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {currentStep > i + 1 ? '✓' : i + 1}
            </div>
            <span className="text-xs mt-1 text-gray-500 hidden sm:block">{label}</span>
          </div>
          {i < 3 && (
            <div
              className={`w-12 h-0.5 mx-1 ${
                currentStep > i + 1 ? 'bg-green-400' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  // 步骤1
  const renderStep1 = () => (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-6 text-gray-900">步骤 1/4：选择数据源</h2>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* 数据源切换 */}
        <div className="flex gap-3 mb-6">
          <button
            className={`flex-1 py-3 rounded-lg text-sm font-medium border transition-colors ${
              source === 'url'
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setSource('url')}
          >
            🌐 Git 仓库 URL
          </button>
          <button
            className={`flex-1 py-3 rounded-lg text-sm font-medium border transition-colors ${
              source === 'local'
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setSource('local')}
          >
            💻 本地路径
          </button>
        </div>

        {source === 'url' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Git 仓库地址
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/weisiwu/teamclaw"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <p className="mt-2 text-xs text-gray-500">
                支持 GitHub、GitLab 等任意 Git 仓库
              </p>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              本地项目路径
            </label>
            <input
              type="text"
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              placeholder="/Users/xxx/Desktop/my-project"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        )}

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            项目名称（可选）
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="留空则自动从仓库名提取"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleStep1Next}
            disabled={source === 'url' ? !url.trim() : !localPath.trim()}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            下一步 →
          </button>
        </div>
      </div>
    </div>
  );

  // 步骤2
  const renderStep2 = () => (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-6 text-gray-900">步骤 2/4：确认项目信息</h2>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">项目名称</label>
            <input
              type="text"
              value={projectInfo?.name || ''}
              onChange={(e) => setProjectInfo(prev => prev ? { ...prev, name: e.target.value } : null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">技术栈</label>
            <div className="flex flex-wrap gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 min-h-[42px]">
              {projectInfo?.techStack && projectInfo.techStack.length > 0 ? (
                projectInfo.techStack.map(s => (
                  <span key={s} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-gray-400 text-sm">未识别到技术栈</span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">构建工具</label>
            <div className="px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600">
              {projectInfo?.buildTool || '未检测到'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Git 仓库</label>
            <div className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-gray-50">
              <span className={projectInfo?.hasGit ? 'text-green-600' : 'text-gray-400'}>
                {projectInfo?.hasGit ? '✓ 已检测到 .git' : '− 未检测到 Git 仓库'}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setCurrentStep(1)}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← 上一步
          </button>
          <button
            onClick={handleStep2Next}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            开始解析 →
          </button>
        </div>
      </div>
    </div>
  );

  // 步骤3: 解析进度
  const renderStep3 = () => {
    // 11步对应taskData中的steps，或回退到简化的5步
    const steps = taskData?.steps ?? [
      { step: 1, name: 'clone_or_copy', status: 'done' },
      { step: 2, name: 'scan_files', status: 'done' },
      { step: 3, name: 'detect_stack', status: 'done' },
      { step: 4, name: 'parse_docs', status: 'running' },
      { step: 5, name: 'analyze_code', status: 'pending' },
      { step: 6, name: 'build_summary', status: 'pending' },
      { step: 7, name: 'generate_skills', status: 'pending' },
      { step: 8, name: 'vectorize', status: 'pending' },
      { step: 9, name: 'done', status: 'pending' },
    ];

    const STEP_LABELS: Record<string, string> = {
      clone_or_copy: '📥 定位/克隆项目',
      scan_files: '📂 扫描文件结构',
      detect_stack: '🔍 检测技术栈',
      parse_docs: '📄 解析文档',
      analyze_code: '🏗️ 分析代码架构',
      build_summary: '📝 生成项目摘要',
      generate_skills: '🛠️ 生成 Skills',
      vectorize: '🧠 向量化存储',
      done: '✅ 完成',
    };

    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold mb-6 text-gray-900">步骤 3/4：解析进度</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-4 text-sm text-gray-500">
            {taskData?.status === 'processing' ? '解析中，请稍候...' : '准备中...'}
          </div>
          <div className="space-y-3">
            {steps.filter(s => s.name !== 'done').map((step) => (
              <div key={step.step}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    step.status === 'done' ? 'text-green-600' :
                    step.status === 'running' ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    {step.status === 'done' && '✅ '}
                    {step.status === 'running' && '⏳ '}
                    {step.status === 'pending' && '⬜ '}
                    {STEP_LABELS[step.name] || step.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {step.status === 'done' ? '完成' : step.status === 'running' ? '进行中' : '等待'}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      step.status === 'done' ? 'bg-green-500 w-full' :
                      step.status === 'running' ? 'bg-blue-500 w-2/3 animate-pulse' :
                      'bg-gray-300 w-0'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 步骤4: 完成
  const renderStep4 = () => (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-6 text-gray-900">步骤 4/4：完成</h2>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✅</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">项目导入完成！</h3>
        <p className="text-gray-600 text-sm mb-6">
          已生成摘要和 Skills，您可以开始使用了
        </p>
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left max-w-sm mx-auto">
          <h4 className="font-medium text-gray-700 mb-2 text-sm">项目信息</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>名称：{projectInfo?.name}</p>
            <p>技术栈：{projectInfo?.techStack?.join(', ')}</p>
            <p>构建工具：{projectInfo?.buildTool || '未知'}</p>
          </div>
        </div>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => router.push(`/projects/${projectInfo?.projectId}`)}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            查看项目
          </button>
          <button
            onClick={handleRestart}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
          >
            继续导入
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">TeamClaw 后台 — 项目导入向导</h1>
        </div>

        {renderStepIndicator()}

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </div>
    </div>
  );
}
