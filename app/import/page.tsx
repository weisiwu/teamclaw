'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { importProject, fetchImportStatus } from '../../lib/api/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  const [taskData, setTaskData] = useState<
    Awaited<ReturnType<typeof fetchImportStatus>>['task'] | null
  >(null);
  // 轮询 interval ref，避免内存泄漏
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 清理轮询 interval
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

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
      return data;
    } catch {
      // ignore polling errors
      return null;
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
    // 清理旧的轮询
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    // 开始轮询
    pollIntervalRef.current = setInterval(() => {
      pollStatus(taskId).then(data => {
        if (data?.task.status === 'done' || data?.task.status === 'error') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
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
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
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
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {currentStep > i + 1 ? '✓' : i + 1}
            </div>
            <span className="text-xs mt-1 text-muted-foreground hidden sm:block">{label}</span>
          </div>
          {i < 3 && (
            <div
              className={`w-12 h-0.5 mx-1 ${currentStep > i + 1 ? 'bg-green-400' : 'bg-border'}`}
            />
          )}
        </div>
      ))}
    </div>
  );

  // 步骤1
  const renderStep1 = () => (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-6 text-foreground">步骤 1/4：选择数据源</h2>
      <Card>
        <CardContent className="p-6">
          {/* 数据源切换 */}
          <div className="flex gap-3 mb-6">
            <Button
              variant={source === 'url' ? 'default' : 'outline'}
              className={source === 'url' ? 'flex-1 py-3 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-2' : 'flex-1 py-3'}
              onClick={() => setSource('url')}
            >
              🌐 Git 仓库 URL
            </Button>
            <Button
              variant={source === 'local' ? 'default' : 'outline'}
              className={source === 'local' ? 'flex-1 py-3 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-2' : 'flex-1 py-3'}
              onClick={() => setSource('local')}
            >
              💻 本地路径
            </Button>
          </div>

          {source === 'url' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Git 仓库地址</label>
                <Input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://github.com/weisiwu/teamclaw"
                />
                <p className="mt-2 text-xs text-muted-foreground">支持 GitHub、GitLab 等任意 Git 仓库</p>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">本地项目路径</label>
              <Input
                type="text"
                value={localPath}
                onChange={e => setLocalPath(e.target.value)}
                placeholder="/Users/xxx/Desktop/my-project"
              />
            </div>
          )}

          <div className="mt-6">
            <label className="block text-sm font-medium text-foreground mb-2">项目名称（可选）</label>
            <Input
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="留空则自动从仓库名提取"
            />
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleStep1Next}
              disabled={source === 'url' ? !url.trim() : !localPath.trim()}
            >
              下一步 →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // 步骤2
  const renderStep2 = () => (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-6 text-foreground">步骤 2/4：确认项目信息</h2>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">项目名称</label>
              <Input
                type="text"
                value={projectInfo?.name || ''}
                onChange={e =>
                  setProjectInfo(prev => (prev ? { ...prev, name: e.target.value } : null))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">技术栈</label>
              <div className="flex flex-wrap gap-2 px-4 py-2 border border-border rounded-lg bg-muted min-h-[42px]">
                {projectInfo?.techStack && projectInfo.techStack.length > 0 ? (
                  projectInfo.techStack.map(s => (
                    <Badge key={s} variant="info">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">未识别到技术栈</span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">构建工具</label>
              <div className="px-4 py-2 border border-border rounded-lg bg-muted text-sm text-foreground">
                {projectInfo?.buildTool || '未检测到'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Git 仓库</label>
              <div className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg bg-muted">
                <span className={projectInfo?.hasGit ? 'text-green-600' : 'text-muted-foreground'}>
                  {projectInfo?.hasGit ? '✓ 已检测到 .git' : '− 未检测到 Git 仓库'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              ← 上一步
            </Button>
            <Button onClick={handleStep2Next}>开始解析 →</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // 步骤3: 解析进度
  const renderStep3 = () => {
    // 从 taskData 获取后端返回的步骤列表（taskData 初始化时 steps 为空则显示加载占位）
    const steps =
      taskData?.steps ??
      (taskData
        ? []
        : [
            { step: 1, name: 'clone', status: 'pending' },
            { step: 2, name: 'scan', status: 'pending' },
            { step: 3, name: 'detectTech', status: 'pending' },
            { step: 4, name: 'parseDocs', status: 'pending' },
            { step: 5, name: 'analyzeCode', status: 'pending' },
            { step: 6, name: 'detectBuild', status: 'pending' },
            { step: 7, name: 'compress', status: 'pending' },
            { step: 8, name: 'buildSummary', status: 'pending' },
            { step: 9, name: 'generateFeatureMap', status: 'pending' },
            { step: 10, name: 'generateSkills', status: 'pending' },
            { step: 11, name: 'convertDocs', status: 'pending' },
            { step: 12, name: 'vectorize', status: 'pending' },
            { step: 13, name: 'gitHistory', status: 'pending' },
          ]);

    const STEP_LABELS: Record<string, string> = {
      clone: '📥 定位/克隆项目',
      scan: '📂 扫描文件结构',
      detectTech: '🔍 检测技术栈',
      parseDocs: '📄 解析文档',
      analyzeCode: '🏗️ 分析代码架构',
      detectBuild: '⚙️ 检测打包机制',
      compress: '🗜️ 上下文压缩',
      buildSummary: '📝 生成项目摘要',
      generateFeatureMap: '🗺️ 生成功能定位',
      generateSkills: '🛠️ 生成 Skills',
      convertDocs: '📋 文档转换',
      vectorize: '🧠 向量化存储',
      gitHistory: '📊 Git 历史分析',
      done: '✅ 完成',
    };

    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold mb-6 text-foreground">步骤 3/4：解析进度</h2>
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 text-sm text-muted-foreground">
              {taskData?.status === 'processing' ? '解析中，请稍候...' : '准备中...'}
            </div>
            <div className="space-y-3">
              {steps
                .filter(s => s.name !== 'done')
                .map(step => (
                  <div key={step.step}>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm font-medium ${
                          step.status === 'done'
                            ? 'text-green-600'
                            : step.status === 'running'
                              ? 'text-blue-600'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {step.status === 'done' && '✅ '}
                        {step.status === 'running' && '⏳ '}
                        {step.status === 'pending' && '⬜ '}
                        {STEP_LABELS[step.name] || step.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {step.status === 'done'
                          ? '完成'
                          : step.status === 'running'
                            ? '进行中'
                            : '等待'}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          step.status === 'done'
                            ? 'bg-green-500 w-full'
                            : step.status === 'running'
                              ? 'bg-blue-500 w-2/3 animate-pulse'
                              : 'bg-muted w-0'
                        }`}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // 步骤4: 完成
  const renderStep4 = () => (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-6 text-foreground">步骤 4/4：完成</h2>
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">项目导入完成！</h3>
          <p className="text-muted-foreground text-sm mb-6">已生成摘要和 Skills，您可以开始使用了</p>
          <div className="bg-muted rounded-lg p-4 mb-6 text-left max-w-sm mx-auto">
            <h4 className="font-medium text-foreground mb-2 text-sm">项目信息</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>名称：{projectInfo?.name}</p>
              <p>技术栈：{projectInfo?.techStack?.join(', ')}</p>
              <p>构建工具：{projectInfo?.buildTool || '未知'}</p>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <Button onClick={() => router.push(`/projects/${projectInfo?.projectId}`)}>
              查看项目
            </Button>
            <Button variant="outline" onClick={handleRestart}>
              继续导入
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="page-container bg-gray-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4">
        {/* 标题 */}
        <div className="page-header">
          <h1 className="page-header-title">TeamClaw 后台 — 项目导入向导</h1>
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
