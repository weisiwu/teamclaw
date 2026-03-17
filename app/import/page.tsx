'use client';

import { useState } from 'react';

// 步骤类型
type Step = 1 | 2 | 3 | 4;

// 项目信息类型
interface ProjectInfo {
  path: string;
  name: string;
  techStack: string;
  buildTool: string;
  hasGit: boolean;
}

// 解析任务类型
interface ParseTask {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
}

export default function ImportPage() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [projectPath, setProjectPath] = useState('');
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [parseTasks, setParseTasks] = useState<ParseTask[]>([
    { name: '扫描文件结构', status: 'pending', progress: 0 },
    { name: '识别技术栈', status: 'pending', progress: 0 },
    { name: '解析文档', status: 'pending', progress: 0 },
    { name: '生成项目摘要', status: 'pending', progress: 0 },
    { name: '向量化存储', status: 'pending', progress: 0 },
  ]);

  // 模拟解析进度
  const startParsing = async () => {
    setCurrentStep(3);
    
    const tasks = [...parseTasks];
    for (let i = 0; i < tasks.length; i++) {
      // 模拟处理中
      tasks[i].status = 'processing';
      setParseTasks([...tasks]);
      
      // 模拟进度
      for (let p = 0; p <= 100; p += 20) {
        await new Promise(r => setTimeout(r, 200));
        tasks[i].progress = p;
        setParseTasks([...tasks]);
      }
      
      tasks[i].status = 'completed';
      tasks[i].progress = 100;
      setParseTasks([...tasks]);
    }
    
    // 完成
    setCurrentStep(4);
  };

  // 处理步骤1：选择项目路径
  const handleStep1Next = () => {
    if (!projectPath.trim()) return;
    
    // 模拟自动识别项目信息
    const name = projectPath.split('/').pop() || 'my-project';
    setProjectInfo({
      path: projectPath,
      name,
      techStack: 'React + TypeScript（自动识别）',
      buildTool: 'Vite（自动识别）',
      hasGit: true,
    });
    setCurrentStep(2);
  };

  // 处理步骤2：确认项目信息
  const handleStep2Next = () => {
    startParsing();
  };

  // 重新开始
  const handleRestart = () => {
    setCurrentStep(1);
    setProjectPath('');
    setProjectInfo(null);
    setParseTasks([
      { name: '扫描文件结构', status: 'pending', progress: 0 },
      { name: '识别技术栈', status: 'pending', progress: 0 },
      { name: '解析文档', status: 'pending', progress: 0 },
      { name: '生成项目摘要', status: 'pending', progress: 0 },
      { name: '向量化存储', status: 'pending', progress: 0 },
    ]);
  };

  // 渲染步骤指示器
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= step
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {currentStep > step ? '✓' : step}
          </div>
          {step < 4 && (
            <div
              className={`w-16 h-0.5 ${
                currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  // 渲染步骤1：选择项目路径
  const renderStep1 = () => (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">步骤 1/4：选择项目路径</h2>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          项目路径
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            placeholder="/Users/xxx/Desktop/my-project"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            浏览...
          </button>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          请输入或选择要导入的项目所在目录路径
        </p>
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleStep1Next}
            disabled={!projectPath.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            下一步
          </button>
        </div>
      </div>
    </div>
  );

  // 渲染步骤2：确认项目信息
  const renderStep2 = () => (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">步骤 2/4：确认项目信息</h2>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              项目名称
            </label>
            <input
              type="text"
              value={projectInfo?.name || ''}
              onChange={(e) => setProjectInfo(prev => prev ? { ...prev, name: e.target.value } : null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              技术栈
            </label>
            <input
              type="text"
              value={projectInfo?.techStack || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              构建工具
            </label>
            <input
              type="text"
              value={projectInfo?.buildTool || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Git 仓库
            </label>
            <div className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-gray-50">
              {projectInfo?.hasGit ? (
                <>
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-500">已检测到 .git</span>
                </>
              ) : (
                <>
                  <span className="text-gray-400">-</span>
                  <span className="text-gray-500">未检测到 Git 仓库</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setCurrentStep(1)}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            上一步
          </button>
          <button
            onClick={handleStep2Next}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            开始解析
          </button>
        </div>
      </div>
    </div>
  );

  // 渲染步骤3：解析进度
  const renderStep3 = () => (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">步骤 3/4：解析进度</h2>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {parseTasks.map((task, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">
                  {task.status === 'completed' && '✅ '}
                  {task.status === 'processing' && '⏳ '}
                  {task.status === 'pending' && '⬜ '}
                  {task.name}
                </span>
                <span className="text-sm text-gray-500">{task.progress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    task.status === 'completed'
                      ? 'bg-green-500'
                      : task.status === 'processing'
                      ? 'bg-blue-500'
                      : 'bg-gray-300'
                  }`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // 渲染步骤4：完成
  const renderStep4 = () => (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">步骤 4/4：完成</h2>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✅</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          项目导入完成！
        </h3>
        <p className="text-gray-600 mb-6">
          已生成摘要和 Skills，您可以开始使用了
        </p>
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <h4 className="font-medium text-gray-700 mb-2">项目信息</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>名称：{projectInfo?.name}</p>
            <p>技术栈：{projectInfo?.techStack}</p>
            <p>构建工具：{projectInfo?.buildTool}</p>
          </div>
        </div>
        <div className="flex justify-center gap-4">
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            进入项目面板
          </button>
          <button
            onClick={handleRestart}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            继续导入其他项目
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
          <h1 className="text-2xl font-bold text-gray-900">
            TeamClaw 后台 - 项目导入向导
          </h1>
        </div>

        {/* 步骤指示器 */}
        {renderStepIndicator()}

        {/* 步骤内容 */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </div>
    </div>
  );
}
