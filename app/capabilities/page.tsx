'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Loader2,
  Plus,
  Trash2,
  Eye,
  Edit2,
  Wrench,
  BookOpen,
  Zap,
  HardDrive,
  Search,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useTools, useCreateTool, useUpdateTool, useDeleteTool, useToggleTool } from '@/hooks/useTools';
import { useSkills, useCreateSkill, useUpdateSkill, useDeleteSkill, useToggleSkill, useSyncSkills } from '@/hooks/useSkills';
import type { Tool, CreateToolInput, ToolCategory, ToolSource, RiskLevel, ToolParameter } from '@/lib/api/tools';
import type { Skill, CreateSkillInput, SkillCategory, SkillSource } from '@/lib/api/skills';

// ============ 常量 ============
const TOOL_CATEGORIES: { value: ToolCategory | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'file', label: '文件操作' },
  { value: 'git', label: 'Git' },
  { value: 'shell', label: 'Shell' },
  { value: 'api', label: 'API' },
  { value: 'browser', label: '浏览器' },
  { value: 'custom', label: '自定义' },
];

const TOOL_SOURCES: { value: ToolSource | ''; label: string }[] = [
  { value: '', label: '全部来源' },
  { value: 'builtin', label: '内置' },
  { value: 'user', label: '用户创建' },
  { value: 'imported', label: '导入' },
];

const SKILL_CATEGORIES: { value: SkillCategory | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'build', label: '构建' },
  { value: 'deploy', label: '部署' },
  { value: 'test', label: '测试' },
  { value: 'structure', label: '结构' },
  { value: 'code', label: '编码' },
  { value: 'review', label: '审查' },
  { value: 'custom', label: '自定义' },
];

const SKILL_SOURCES: { value: SkillSource | ''; label: string }[] = [
  { value: '', label: '全部来源' },
  { value: 'auto', label: '自动生成' },
  { value: 'user', label: '用户创建' },
  { value: 'imported', label: '导入' },
];

const RISK_LEVELS: { value: RiskLevel; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
];

const RISK_ICON: Record<RiskLevel, string> = { low: '🟢', medium: '🟡', high: '🔴' };

// ============ 工具函数 ============
function countBy<T>(arr: T[], key: keyof T): Record<string, number> {
  return arr.reduce<Record<string, number>>((acc, item) => {
    const k = String(item[key]);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

function categoryLabel(cat: string, map: { value: string; label: string }[]): string {
  return map.find(m => m.value === cat)?.label ?? cat;
}

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    builtin: '内置', user: '用户创建', imported: '导入', auto: '🤖 自动生成',
  };
  return map[source] ?? source;
}

// ============ Skeleton ============
function ToolSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-5 space-y-3">
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
              <div className="h-6 w-12 bg-gray-200 dark:bg-slate-700 rounded-full" />
            </div>
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-full" />
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-2/3" />
            <div className="flex gap-2 pt-2">
              <div className="h-5 w-16 bg-gray-200 dark:bg-slate-700 rounded" />
              <div className="h-5 w-16 bg-gray-200 dark:bg-slate-700 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SkillSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-5 space-y-3">
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
              <div className="h-6 w-12 bg-gray-200 dark:bg-slate-700 rounded-full" />
            </div>
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-full" />
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-2/3" />
            <div className="flex gap-2 pt-2">
              <div className="h-5 w-16 bg-gray-200 dark:bg-slate-700 rounded" />
              <div className="h-5 w-16 bg-gray-200 dark:bg-slate-700 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============ 确认删除弹窗 ============
function ConfirmDialog({ open, title, description, confirmLabel = '确认', variant = 'destructive', loading, onConfirm, onCancel }: {
  open: boolean; title: string; description: string; confirmLabel?: string;
  variant?: 'destructive' | 'default'; loading?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{description}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>取消</Button>
          <Button variant={variant === 'destructive' ? 'destructive' : 'default'} onClick={onConfirm} loading={!!loading}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Tool 编辑弹窗 ============
function ToolDetailDialog({ tool, open, onOpenChange, onSave, saving }: {
  tool: Tool | null; open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, input: Partial<CreateToolInput> & { parameters?: ToolParameter[] }) => void;
  saving: boolean;
}) {
  const isCreate = !tool;
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ToolCategory>('custom');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('low');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [params, setParams] = useState('');

  const prevIdRef = { current: '' };
  if (open) {
    if (tool && tool.id !== prevIdRef.current) {
      prevIdRef.current = tool.id;
      setName(tool.name); setIdentifier(tool.identifier); setDescription(tool.description);
      setCategory(tool.category); setRiskLevel(tool.riskLevel); setRequiresApproval(tool.requiresApproval);
      setParams(tool.parameters?.map(p => `${p.name}|${p.type}|${p.required}|${p.defaultValue ?? ''}|${p.description}`).join('\n') ?? '');
    } else if (!tool && prevIdRef.current !== '__create__') {
      prevIdRef.current = '__create__';
      setName(''); setIdentifier(''); setDescription('');
      setCategory('custom'); setRiskLevel('low'); setRequiresApproval(false); setParams('');
    }
  }

  const handleSave = () => {
    const parsedParams: ToolParameter[] = params.split('\n').filter(l => l.trim()).map(l => {
      const [n, t, r, d, ...descParts] = l.split('|');
      return { name: n.trim(), type: t.trim(), required: r.trim() === 'true' || r.trim() === '是', defaultValue: d.trim() || undefined, description: descParts.join('|').trim() };
    });
    onSave(tool ? tool.id : '__create__', { name, identifier, description, category, riskLevel, requiresApproval, parameters: parsedParams });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isCreate ? '新建 Tool' : `编辑 Tool：${tool?.name}`}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">名称</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Tool 显示名称" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">标识符</label>
            <Input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="tool_identifier" disabled={!isCreate} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">描述</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Tool 功能描述" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">分类</label>
              <Select value={category} onValueChange={v => setCategory(v as ToolCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TOOL_CATEGORIES.filter(c => c.value).map(c => <SelectItem key={c.value} value={c.value!}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">风险等级</label>
              <Select value={riskLevel} onValueChange={v => setRiskLevel(v as RiskLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map(r => <SelectItem key={r.value} value={r.value}>{RISK_ICON[r.value]} {r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} size="sm" />
            <span className="text-sm text-gray-700 dark:text-gray-300">需要审批</span>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              参数定义 <span className="text-xs text-gray-400">(每行：名称|类型|必填|默认值|描述)</span>
            </label>
            <Textarea value={params} onChange={e => setParams(e.target.value)}
              placeholder="path|string|true|/tmp|文件路径&#10;encoding|string|false|utf8|字符编码" rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} loading={saving}>{isCreate ? '创建' : '保存'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Skill 预览/编辑弹窗 ============
function SkillPreviewDialog({ skill, open, onOpenChange, onSave, saving }: {
  skill: Skill | null; open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, input: Partial<CreateSkillInput>) => void;
  saving: boolean;
}) {
  const isCreate = !skill;
  const isAutoGenerated = skill?.source === 'auto';
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SkillCategory>('custom');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const prevIdRef = { current: '' };
  if (open) {
    if (skill && skill.id !== prevIdRef.current) {
      prevIdRef.current = skill.id;
      setName(skill.name); setIdentifier(skill.identifier); setDescription(skill.description);
      setCategory(skill.category); setTags(skill.tags?.join(', ') ?? ''); setContent(skill.content ?? '');
      setIsEditing(false);
    } else if (!skill && prevIdRef.current !== '__create__') {
      prevIdRef.current = '__create__';
      setName(''); setIdentifier(''); setDescription(''); setCategory('custom'); setTags(''); setContent('');
      setIsEditing(false);
    }
  }

  const handleSave = () => {
    onSave(skill ? skill.id : '__create__', {
      name, identifier, description, category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean), content,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{isCreate ? '新建 Skill' : `Skill：${skill?.name}`}</DialogTitle>
            <div className="flex gap-2 items-center">
              {!isCreate && !isAutoGenerated && (
                <Button variant={isEditing ? 'default' : 'outline'} size="sm" onClick={() => setIsEditing(!isEditing)}>
                  <Edit2 className="w-3.5 h-3.5 mr-1" />{isEditing ? '预览' : '编辑'}
                </Button>
              )}
              {isAutoGenerated && (
                <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />自动生成 · 内容只读
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden gap-4 mt-2 min-h-0">
          {/* 左侧元信息 */}
          <div className="w-56 shrink-0 space-y-3 overflow-y-auto">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">名称</label>
              {(isEditing || isCreate) ? (
                <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" placeholder="Skill 名称" />
              ) : (
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">{skill?.name}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">标识符</label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 font-mono">{skill?.identifier ?? '—'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">描述</label>
              {(isEditing || isCreate) ? (
                <Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1" rows={2} placeholder="描述" />
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{skill?.description ?? '—'}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">分类</label>
              {(isEditing || isCreate) ? (
                <Select value={category} onValueChange={v => setCategory(v as SkillCategory)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SKILL_CATEGORIES.filter(c => c.value).map(c => <SelectItem key={c.value} value={c.value!}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{categoryLabel(skill?.category ?? '', SKILL_CATEGORIES)}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">标签</label>
              {(isEditing || isCreate) ? (
                <Input value={tags} onChange={e => setTags(e.target.value)} className="mt-1" placeholder="react, frontend" />
              ) : (
                <div className="flex flex-wrap gap-1 mt-1">
                  {skill?.tags?.length ? skill.tags.map(t => <Badge key={t} variant="default">{t}</Badge>) : <span className="text-sm text-gray-400">—</span>}
                </div>
              )}
            </div>
            {skill?.applicableAgents?.length ? (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">适用 Agent</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {skill.applicableAgents.map(a => <Badge key={a} variant="info">{a}</Badge>)}
                </div>
              </div>
            ) : null}
            {skill?.generatedAt && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">生成时间</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{new Date(skill.generatedAt).toLocaleString()}</p>
              </div>
            )}
            {skill?.linkedProject && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">关联项目</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{skill.linkedProject}</p>
              </div>
            )}
          </div>

          {/* 右侧内容 */}
          <div className="flex-1 min-w-0 overflow-y-auto border-l border-gray-200 dark:border-slate-700 pl-4">
            {(isEditing || isCreate) ? (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">内容 (Markdown)</label>
                <Textarea value={content} onChange={e => setContent(e.target.value)} className="font-mono text-sm min-h-[400px]"
                  placeholder="# Skill 内容&#10;&#10;使用 Markdown 编写..." />
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{skill?.content ?? '_暂无内容_'}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        {(isEditing || isCreate) && (
          <DialogFooter>
            <Button variant="outline" onClick={() => { onOpenChange(false); setIsEditing(false); }}>取消</Button>
            <Button onClick={handleSave} loading={saving}>{isCreate ? '创建' : '保存'}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============ Tool 卡片 ============
function ToolCard({ tool, onToggle, onEdit, onDelete, toggling }: {
  tool: Tool; onToggle: (id: string, enabled: boolean) => void;
  onEdit: (tool: Tool) => void; onDelete: (tool: Tool) => void; toggling?: boolean;
}) {
  return (
    <Card className={`transition-all duration-200 hover:shadow-md border-l-4 ${tool.enabled ? 'border-l-green-400' : 'border-l-gray-300 dark:border-l-slate-600 opacity-75'}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{tool.name}</h3>
              {tool.source === 'builtin' && <Badge variant="info">内置</Badge>}
              {tool.riskLevel === 'high' && <Badge variant="error">高风险</Badge>}
            </div>
            <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-2">{tool.identifier}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{tool.description}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
              <span>分类：{categoryLabel(tool.category, TOOL_CATEGORIES)}</span>
              <span>来源：{sourceLabel(tool.source)}</span>
              <span>{RISK_ICON[tool.riskLevel]} 风险：{tool.riskLevel === 'low' ? '低' : tool.riskLevel === 'medium' ? '中' : '高'}</span>
              {tool.requiresApproval && <span>⚠️ 需审批</span>}
            </div>
            {tool.parameters?.length ? (
              <div className="mb-3">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">参数：</p>
                <div className="flex flex-wrap gap-1">
                  {tool.parameters.map(p => <Badge key={p.name} variant="default" className="font-mono text-xs">{p.name}{p.required ? '*' : ''}</Badge>)}
                </div>
              </div>
            ) : null}
          </div>
          <div className="shrink-0">
            {toggling ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              : <Switch checked={tool.enabled} onCheckedChange={checked => onToggle(tool.id, checked)} size="sm" />}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
          <Button variant="ghost" size="sm" onClick={() => onEdit(tool)}><Edit2 className="w-3.5 h-3.5 mr-1" />编辑</Button>
          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 dark:text-red-400" onClick={() => onDelete(tool)}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />删除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Skill 卡片 ============
function SkillCard({ skill, onToggle, onEdit, onDelete, onPreview, toggling }: {
  skill: Skill; onToggle: (id: string, enabled: boolean) => void;
  onEdit: (skill: Skill) => void; onDelete: (skill: Skill) => void; onPreview: (skill: Skill) => void; toggling?: boolean;
}) {
  const isAuto = skill.source === 'auto';
  return (
    <Card className={`transition-all duration-200 hover:shadow-md border-l-4 ${skill.enabled ? 'border-l-blue-400' : 'border-l-gray-300 dark:border-l-slate-600 opacity-75'}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{skill.name}</h3>
              {isAuto && <Badge variant="warning">🤖 自动生成</Badge>}
            </div>
            <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-2">{skill.identifier}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{skill.description}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
              <span>分类：{categoryLabel(skill.category, SKILL_CATEGORIES)}</span>
              <span>来源：{sourceLabel(skill.source)}</span>
            </div>
            {skill.applicableAgents?.length ? (
              <div className="mb-3">
                <span className="text-xs text-gray-400 mr-1">适用：</span>
                <div className="inline-flex flex-wrap gap-1">
                  {skill.applicableAgents.map(a => <Badge key={a} variant="info">{a}</Badge>)}
                </div>
              </div>
            ) : null}
            {skill.tags?.length ? (
              <div className="flex flex-wrap gap-1">
                {skill.tags.map(t => <Badge key={t} variant="default" className="text-xs">{t}</Badge>)}
              </div>
            ) : null}
          </div>
          <div className="shrink-0">
            {toggling ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              : <Switch checked={skill.enabled} onCheckedChange={checked => onToggle(skill.id, checked)} size="sm" />}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
          <Button variant="ghost" size="sm" onClick={() => onPreview(skill)}><Eye className="w-3.5 h-3.5 mr-1" />预览</Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(skill)}><Edit2 className="w-3.5 h-3.5 mr-1" />编辑</Button>
          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 dark:text-red-400" onClick={() => onDelete(skill)}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />删除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ 统计概览 ============
function StatsOverview({ tools = [], skills = [] }: { tools?: Tool[]; skills?: Skill[] }) {
  const toolEnabled = tools.filter(t => t.enabled).length;
  const toolBySource = countBy(tools, 'source');
  const skillEnabled = skills.filter(s => s.enabled).length;
  const skillBySource = countBy(skills, 'source');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-4 h-4 text-blue-500" />
            <span className="font-medium text-gray-900 dark:text-gray-100">Tools</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {tools.length} 个 <span className="text-sm font-normal text-gray-500 ml-2">（{toolEnabled} 启用 / {tools.length - toolEnabled} 禁用）</span>
          </div>
          <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
            {toolBySource.builtin ? <span>内置: {toolBySource.builtin}</span> : null}
            {toolBySource.user ? <span>用户: {toolBySource.user}</span> : null}
            {toolBySource.imported ? <span>导入: {toolBySource.imported}</span> : null}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-purple-500" />
            <span className="font-medium text-gray-900 dark:text-gray-100">Skills</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {skills.length} 个 <span className="text-sm font-normal text-gray-500 ml-2">（{skillEnabled} 启用 / {skills.length - skillEnabled} 禁用）</span>
          </div>
          <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
            {skillBySource.auto ? <span>生成: {skillBySource.auto}</span> : null}
            {skillBySource.user ? <span>用户: {skillBySource.user}</span> : null}
            {skillBySource.imported ? <span>导入: {skillBySource.imported}</span> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ 主页面 ============
export default function CapabilitiesPage() {
  const [activeTab, setActiveTab] = useState<'tools' | 'skills'>('tools');

  // Tool filters
  const [toolCategory, setToolCategory] = useState<ToolCategory | ''>('');
  const [toolSource, setToolSource] = useState<ToolSource | ''>('');
  const [toolSearch, setToolSearch] = useState('');

  // Skill filters
  const [skillCategory, setSkillCategory] = useState<SkillCategory | ''>('');
  const [skillSource, setSkillSource] = useState<SkillSource | ''>('');
  const [skillSearch, setSkillSearch] = useState('');

  // Dialog states
  const [toolDialog, setToolDialog] = useState<{ open: boolean; tool: Tool | null }>({ open: false, tool: null });
  const [skillDialog, setSkillDialog] = useState<{ open: boolean; skill: Skill | null }>({ open: false, skill: null });
  const [deleteTarget, setDeleteTarget] = useState<{ open: boolean; type: 'tool' | 'skill'; item: Tool | Skill | null }>({
    open: false, type: 'tool', item: null,
  });

  // Data fetching
  const toolFilters = { category: toolCategory, source: toolSource, search: toolSearch };
  const skillFilters = { category: skillCategory, source: skillSource, search: skillSearch };

  const { data: toolData, isLoading: toolsLoading } = useTools(toolFilters);
  const { data: skillData, isLoading: skillsLoading } = useSkills(skillFilters);

  const createTool = useCreateTool();
  const updateTool = useUpdateTool();
  const deleteTool = useDeleteTool();
  const toggleTool = useToggleTool();

  const createSkill = useCreateSkill();
  const updateSkill = useUpdateSkill();
  const deleteSkill = useDeleteSkill();
  const toggleSkill = useToggleSkill();
  const syncSkills = useSyncSkills();

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [savingToolId, setSavingToolId] = useState<string | null>(null);
  const [savingSkillId, setSavingSkillId] = useState<string | null>(null);

  const tools: Tool[] = toolData?.list ?? [];
  const skills: Skill[] = skillData?.list ?? [];

  // Tool handlers
  const handleToolToggle = async (id: string, enabled: boolean) => {
    setTogglingId(id);
    try { await toggleTool.mutateAsync({ id, enabled }); }
    finally { setTogglingId(null); }
  };

  const handleToolSave = async (id: string, input: Partial<CreateToolInput> & { parameters?: ToolParameter[] }) => {
    setSavingToolId(id);
    try {
      if (id === '__create__') {
        await createTool.mutateAsync(input as CreateToolInput);
      } else {
        await updateTool.mutateAsync({ id, input });
      }
      setToolDialog({ open: false, tool: null });
    } finally {
      setSavingToolId(null);
    }
  };

  const handleToolDelete = (tool: Tool) => setDeleteTarget({ open: true, type: 'tool', item: tool });
  const handleSkillDelete = (skill: Skill) => setDeleteTarget({ open: true, type: 'skill', item: skill });

  const handleDeleteConfirm = async () => {
    if (!deleteTarget.item) return;
    const id = deleteTarget.item.id;
    if (deleteTarget.type === 'tool') {
      await deleteTool.mutateAsync(id);
    } else {
      await deleteSkill.mutateAsync(id);
    }
    setDeleteTarget({ open: false, type: 'tool', item: null });
  };

  // Skill handlers
  const handleSkillToggle = async (id: string, enabled: boolean) => {
    setTogglingId(id);
    try { await toggleSkill.mutateAsync({ id, enabled }); }
    finally { setTogglingId(null); }
  };

  const handleSkillSave = async (id: string, input: Partial<CreateSkillInput>) => {
    setSavingSkillId(id);
    try {
      if (id === '__create__') {
        await createSkill.mutateAsync(input as CreateSkillInput);
      } else {
        await updateSkill.mutateAsync({ id, input });
      }
      setSkillDialog({ open: false, skill: null });
    } finally {
      setSavingSkillId(null);
    }
  };

  const isLoading = activeTab === 'tools' ? toolsLoading : skillsLoading;

  return (
    <div className="page-container">
      <div className="page-header mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tools & Skills 管理中心</h1>
            <p className="page-header-subtitle">管理智能体的工具和技能配置</p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'skills' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncSkills.mutate()}
                loading={syncSkills.isPending}
              >
                <HardDrive className="w-4 h-4 mr-1" />
                磁盘同步
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                if (activeTab === 'tools') setToolDialog({ open: true, tool: null });
                else setSkillDialog({ open: true, skill: null });
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              新建 {activeTab === 'tools' ? 'Tool' : 'Skill'}
            </Button>
          </div>
        </div>
      </div>

      {/* 统计概览 */}
      <StatsOverview tools={tools} skills={skills} />

      {/* Tab 切换 */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'tools' | 'skills')}>
        <TabsList className="mb-6">
          <TabsTrigger value="tools">
            <Wrench className="w-4 h-4 mr-1.5" />
            Tools
          </TabsTrigger>
          <TabsTrigger value="skills">
            <BookOpen className="w-4 h-4 mr-1.5" />
            Skills
          </TabsTrigger>
        </TabsList>

        {/* ========== Tools Tab ========== */}
        <TabsContent value="tools">
          {/* 筛选栏 */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* 分类筛选 */}
            <div className="flex items-center gap-1.5">
              {TOOL_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setToolCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    toolCategory === cat.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* 来源筛选 */}
              <Select value={toolSource} onValueChange={v => setToolSource(v as ToolSource | '')}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="全部来源" />
                </SelectTrigger>
                <SelectContent>
                  {TOOL_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={toolSearch}
                  onChange={e => setToolSearch(e.target.value)}
                  placeholder="搜索 Tools..."
                  className="pl-9 w-52"
                />
              </div>
            </div>
          </div>

          {/* 卡片网格 */}
          {isLoading ? (
            <ToolSkeletonGrid />
          ) : tools.length === 0 ? (
            <Card>
              <CardContent className="py-0">
                <EmptyState
                  icon={Wrench}
                  title="暂无 Tools"
                  description="还没有创建任何 Tool，点击右上角「新建」开始添加"
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.map(tool => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onToggle={handleToolToggle}
                  onEdit={t => setToolDialog({ open: true, tool: t })}
                  onDelete={handleToolDelete}
                  toggling={togglingId === tool.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ========== Skills Tab ========== */}
        <TabsContent value="skills">
          {/* 筛选栏 */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* 分类筛选 */}
            <div className="flex items-center gap-1.5">
              {SKILL_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSkillCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    skillCategory === cat.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* 来源筛选 */}
              <Select value={skillSource} onValueChange={v => setSkillSource(v as SkillSource | '')}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="全部来源" />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={skillSearch}
                  onChange={e => setSkillSearch(e.target.value)}
                  placeholder="搜索 Skills..."
                  className="pl-9 w-52"
                />
              </div>
            </div>
          </div>

          {/* 卡片网格 */}
          {isLoading ? (
            <SkillSkeletonGrid />
          ) : skills.length === 0 ? (
            <Card>
              <CardContent className="py-0">
                <EmptyState
                  icon={BookOpen}
                  title="暂无 Skills"
                  description="还没有创建任何 Skill，点击右上角「新建」开始添加"
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map(skill => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onToggle={handleSkillToggle}
                  onEdit={s => setSkillDialog({ open: true, skill: s })}
                  onDelete={handleSkillDelete}
                  onPreview={s => setSkillDialog({ open: true, skill: s })}
                  toggling={togglingId === skill.id}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Tool 编辑弹窗 */}
      <ToolDetailDialog
        tool={toolDialog.tool}
        open={toolDialog.open}
        onOpenChange={open => setToolDialog(prev => ({ ...prev, open }))}
        onSave={handleToolSave}
        saving={savingToolId !== null}
      />

      {/* Skill 预览/编辑弹窗 */}
      <SkillPreviewDialog
        skill={skillDialog.skill}
        open={skillDialog.open}
        onOpenChange={open => setSkillDialog(prev => ({ ...prev, open }))}
        onSave={handleSkillSave}
        saving={savingSkillId !== null}
      />

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={deleteTarget.open}
        title={`删除 ${deleteTarget.type === 'tool' ? 'Tool' : 'Skill'}？`}
        description={`确定要删除「${(deleteTarget.item as Tool | Skill)?.name}」吗？此操作无法撤销。`}
        confirmLabel="删除"
        variant="destructive"
        loading={deleteTarget.type === 'tool' ? deleteTool.isPending : deleteSkill.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget({ open: false, type: 'tool', item: null })}
      />
    </div>
  );
}
