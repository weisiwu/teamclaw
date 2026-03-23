'use client';

import { useState } from 'react';
import {
  Pipeline,
  PipelineStage,
  usePipeline,
  useStartPipeline,
  useSubmitPMAnswer,
} from '@/hooks/useAgents';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const STAGE_LABELS: Record<string, string> = {
  confirm: '需求确认',
  clarify: '需求澄清',
  code: '代码生成',
  review: '代码审查',
  notify: '结果通知',
  complete: '完成',
};

const STAGE_AGENTS: Record<string, string> = {
  confirm: 'main',
  clarify: 'pm',
  code: 'coder',
  review: 'reviewer',
  notify: 'main',
  complete: '—',
};

function StageIcon({ stage, className = '' }: { stage: PipelineStage; className?: string }) {
  switch (stage.status) {
    case 'completed':
      return <CheckCircle className={`w-4 h-4 text-green-500 ${className}`} />;
    case 'failed':
      return <XCircle className={`w-4 h-4 text-red-500 ${className}`} />;
    case 'running':
      return <Loader2 className={`w-4 h-4 text-blue-500 animate-spin ${className}`} />;
    case 'blocked':
      return <Clock className={`w-4 h-4 text-yellow-500 ${className}`} />;
    default:
      return <Clock className={`w-4 h-4 text-gray-300 ${className}`} />;
  }
}

function StageRow({
  stage,
  index,
  expanded,
  onToggle,
}: {
  stage: PipelineStage;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isActive = stage.status === 'running' || stage.status === 'blocked';

  return (
    <div
      className={`border rounded-lg p-3 transition-colors ${isActive ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-white'}`}
    >
      <div className="flex items-center gap-3">
        <StageIcon stage={stage} />
        <span className="text-xs text-gray-500 w-6">{index + 1}.</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800">
              {STAGE_LABELS[stage.name] || stage.name}
            </span>
            <span className="text-xs text-gray-400">@{STAGE_AGENTS[stage.name]}</span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                stage.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : stage.status === 'failed'
                    ? 'bg-red-100 text-red-700'
                    : stage.status === 'running'
                      ? 'bg-blue-100 text-blue-700'
                      : stage.status === 'blocked'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-500'
              }`}
            >
              {stage.status === 'running'
                ? '进行中'
                : stage.status === 'completed'
                  ? '完成'
                  : stage.status === 'failed'
                    ? '失败'
                    : stage.status === 'blocked'
                      ? '等待'
                      : '待执行'}
            </span>
          </div>
          {stage.startedAt && (
            <div className="text-xs text-gray-400 mt-0.5">
              {stage.startedAt.slice(11, 19)}
              {stage.completedAt && ` → ${stage.completedAt.slice(11, 19)}`}
            </div>
          )}
          {stage.error && <div className="text-xs text-red-500 mt-0.5">{stage.error}</div>}
        </div>
        {stage.output && (
          <button onClick={onToggle} className="p-1 hover:bg-gray-100 rounded">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>
        )}
      </div>
      {expanded && stage.output && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 max-h-32 overflow-auto whitespace-pre-wrap">
          {stage.output.slice(0, 500)}
          {stage.output.length > 500 ? '...' : ''}
        </div>
      )}
    </div>
  );
}

interface PMSessionPanelProps {
  pipelineId: string;
}

function PMSessionPanel({ pipelineId }: PMSessionPanelProps) {
  const { data: pmSession, isLoading } = usePipeline(pipelineId);
  const submitAnswer = useSubmitPMAnswer();
  const [answers, setAnswers] = useState<Record<number, string>>({});

  if (isLoading || !pmSession) return null;

  // 获取 PM 澄清问题
  let questions: Array<{ index: number; question: string; answered: boolean }> = [];
  try {
    const stage =
      pmSession && 'stages' in pmSession
        ? (pmSession as Pipeline).stages?.find(s => s.name === 'clarify')
        : null;
    if (stage?.output) {
      const jsonMatch = stage.output.match(/\[[\s\S]*?\]/);
      if (jsonMatch) questions = JSON.parse(jsonMatch[0]);
    }
  } catch {}

  if (pmSession.status !== 'waiting' || questions.length === 0) return null;

  const unanswered = questions.filter(q => !q.answered);

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-yellow-800">🔍 PM 澄清问题</span>
        <span className="text-xs text-yellow-600">{unanswered.length} 个问题待回答</span>
      </div>
      {unanswered.map(q => (
        <div key={q.index} className="space-y-1">
          <p className="text-sm text-gray-700 font-medium">
            Q{q.index}: {q.question}
          </p>
          <textarea
            className="w-full text-sm border border-yellow-200 rounded-lg p-2 resize-none"
            rows={2}
            placeholder="请输入你的回答..."
            value={answers[q.index] || ''}
            onChange={e => setAnswers(prev => ({ ...prev, [q.index]: e.target.value }))}
          />
          <button
            className="text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
            disabled={!answers[q.index]?.trim() || submitAnswer.isPending}
            onClick={async () => {
              await submitAnswer.mutateAsync({
                pipelineId,
                questionIndex: q.index,
                answer: answers[q.index],
              });
              setAnswers(prev => ({ ...prev, [q.index]: '' }));
            }}
          >
            {submitAnswer.isPending ? '提交中...' : '提交回答'}
          </button>
        </div>
      ))}
    </div>
  );
}

interface PipelineStatusPanelProps {
  pipelineId: string | null;
}

export function PipelineStatusPanel({ pipelineId }: PipelineStatusPanelProps) {
  const { data: pipeline, isLoading } = usePipeline(pipelineId);
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set());

  if (!pipelineId) return null;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        <span className="text-sm text-gray-500">加载流水线状态...</span>
      </div>
    );
  }

  if (!pipeline) return null;

  const toggleStage = (i: number) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="bg-white rounded-xl border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">协作流水线</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              pipeline.status === 'completed'
                ? 'bg-green-100 text-green-700'
                : pipeline.status === 'running'
                  ? 'bg-blue-100 text-blue-700'
                  : pipeline.status === 'blocked'
                    ? 'bg-yellow-100 text-yellow-700'
                    : pipeline.status === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600'
            }`}
          >
            {pipeline.status === 'completed'
              ? '✅ 完成'
              : pipeline.status === 'running'
                ? '🔄 运行中'
                : pipeline.status === 'blocked'
                  ? '⏸ 等待输入'
                  : pipeline.status === 'failed'
                    ? '❌ 失败'
                    : '⏳ 待启动'}
          </span>
        </div>
        <span className="text-xs text-gray-400">{pipeline.createdAt.slice(11, 19)}</span>
      </div>

      {/* PM Clarification Panel */}
      {pipeline.status === 'blocked' && <PMSessionPanel pipelineId={pipelineId} />}

      {/* Stages */}
      <div className="space-y-2">
        {pipeline.stages.map((stage, i) => (
          <StageRow
            key={stage.name}
            stage={stage}
            index={i}
            expanded={expandedStages.has(i)}
            onToggle={() => toggleStage(i)}
          />
        ))}
      </div>
    </div>
  );
}

export function PipelineStarter({ onStarted }: { onStarted: (pipelineId: string) => void }) {
  const [requirement, setRequirement] = useState('');
  const [taskId, setTaskId] = useState(() => `task_${Date.now()}`);
  const startPipeline = useStartPipeline();

  const handleStart = async () => {
    if (!requirement.trim()) return;
    const result = await startPipeline.mutateAsync({ taskId, requirement: requirement.trim() });
    onStarted(result.pipelineId);
    setRequirement('');
  };

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Play className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-semibold text-gray-800">启动协作流水线</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          value={taskId}
          onChange={e => setTaskId(e.target.value)}
          placeholder="任务 ID"
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-300"
        />
        <input
          type="text"
          value={requirement}
          onChange={e => setRequirement(e.target.value)}
          placeholder="需求描述"
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-300"
        />
      </div>
      <button
        className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        disabled={!requirement.trim() || startPipeline.isPending}
        onClick={handleStart}
      >
        <Play className="w-4 h-4" />
        {startPipeline.isPending ? '启动中...' : '启动流水线'}
      </button>
    </div>
  );
}
