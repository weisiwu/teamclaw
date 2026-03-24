'use client';

import { useState } from 'react';
import { Download, FileJson, Archive, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toolsApi } from '@/lib/api/tools';
import { skillsApi } from '@/lib/api/skills';

type ExportType = 'tools' | 'skills';
type ExportFormat = 'json' | 'zip';
type ScopeType = 'all' | 'category' | 'source';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportType: ExportType;
}

const TOOL_CATEGORIES = ['file', 'git', 'shell', 'api', 'browser', 'custom'];
const TOOL_SOURCES = ['builtin', 'user', 'imported'];
const SKILL_CATEGORIES = ['build', 'deploy', 'test', 'structure', 'code', 'review', 'custom'];
const SKILL_SOURCES = ['auto', 'user', 'imported'];

const CATEGORY_LABELS: Record<string, string> = {
  file: '文件操作', git: 'Git', shell: 'Shell', api: 'API', browser: '浏览器', custom: '自定义',
  build: '构建', deploy: '部署', test: '测试', structure: '结构', code: '编码', review: '审查',
};
const SOURCE_LABELS: Record<string, string> = {
  builtin: '内置', user: '用户创建', imported: '导入', auto: '自动生成',
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportDialog({ open, onOpenChange, exportType }: ExportDialogProps) {
  
  const typeLabel = exportType === 'tools' ? 'Tool' : 'Skill';

  const [scope, setScope] = useState<ScopeType>('all');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const [format, setFormat] = useState<ExportFormat>('json');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const categories = exportType === 'tools' ? TOOL_CATEGORIES : SKILL_CATEGORIES;
  const sources = exportType === 'tools' ? TOOL_SOURCES : SKILL_SOURCES;

  const handleExport = async () => {
    setLoading(true);
    setDone(false);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      let filename = '';

      if (exportType === 'tools') {
        const blob = await toolsApi.exportTools();
        filename = `teamclaw-tools-${timestamp}.json`;
        downloadBlob(blob, filename);
      } else {
        // Skills export — the API returns blob; if ZIP requested, the API handles it
        const blob = await skillsApi.exportSkills();
        filename = format === 'zip'
          ? `teamclaw-skills-${timestamp}.zip`
          : `teamclaw-skills-${timestamp}.json`;
        downloadBlob(blob, filename);
      }

      setDone(true);
    } catch (err) {
      console.error('Export failed:', err);
      alert(`导出失败: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setScope('all');
    setCategory('');
    setSource('');
    setFormat('json');
    setDone(false);
    onOpenChange(false);
  };

  const scopeLabel = scope === 'all' ? '全部' :
    scope === 'category' ? `分类：${CATEGORY_LABELS[category] || category}` :
      `来源：${SOURCE_LABELS[source] || source}`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-green-500" />
            导出 {typeLabel}s
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* 导出范围 */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block flex items-center gap-1.5">
              <Filter className="w-4 h-4" />
              导出范围
            </label>
            <div className="space-y-2">
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={scope === 'all'}
                    onChange={() => setScope('all')}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">全部 {typeLabel}s</span>
                </label>

                {exportType === 'skills' && (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="scope"
                        checked={scope === 'category'}
                        onChange={() => setScope('category')}
                        className="text-blue-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">按分类筛选</span>
                    </label>
                    {scope === 'category' && (
                      <div className="ml-6 mt-1">
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="选择分类" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat} value={cat}>
                                {CATEGORY_LABELS[cat] ?? cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="scope"
                        checked={scope === 'source'}
                        onChange={() => setScope('source')}
                        className="text-blue-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">按来源筛选</span>
                    </label>
                    {scope === 'source' && (
                      <div className="ml-6 mt-1">
                        <Select value={source} onValueChange={setSource}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="选择来源" />
                          </SelectTrigger>
                          <SelectContent>
                            {sources.map(src => (
                              <SelectItem key={src} value={src}>
                                {SOURCE_LABELS[src] ?? src}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 导出格式 */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">导出格式</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat('json')}
                className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                  format === 'json'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-slate-600 hover:border-blue-300'
                }`}
              >
                <FileJson className={`w-6 h-6 ${format === 'json' ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className="text-xs font-medium">JSON</span>
              </button>
              {exportType === 'skills' && (
                <button
                  onClick={() => setFormat('zip')}
                  className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                    format === 'zip'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-slate-600 hover:border-blue-300'
                  }`}
                >
                  <Archive className={`w-6 h-6 ${format === 'zip' ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className="text-xs font-medium">ZIP</span>
                </button>
              )}
            </div>
          </div>

          {/* 预览信息 */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex justify-between mb-1">
              <span>范围：</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">{scopeLabel}</span>
            </div>
            <div className="flex justify-between">
              <span>格式：</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {format.toUpperCase()}
                {format === 'zip' && exportType === 'skills' && '（含 manifest.json + Markdown 文件）'}
              </span>
            </div>
          </div>

          {done && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                ✅ 导出成功，文件已开始下载
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>{done ? '关闭' : '取消'}</Button>
          {!done && (
            <Button onClick={handleExport} loading={loading}>
              <Download className="w-4 h-4 mr-1" />
              导出 {format.toUpperCase()}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
