'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileJson, Archive, FileText, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toolsApi } from '@/lib/api/tools';
import { skillsApi } from '@/lib/api/skills';
import { useQueryClient } from '@tanstack/react-query';
import { toolKeys } from '@/hooks/useTools';
import { skillKeys } from '@/hooks/useSkills';

type ImportMode = 'json' | 'zip' | 'markdown';
type ImportType = 'tools' | 'skills';

interface ImportItem {
  name: string;
  identifier: string;
  description: string;
  category: string;
  conflict?: boolean; // true = 已存在
  selected?: boolean;
}

interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors?: string[];
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importType: ImportType;
}

const MODE_OPTIONS: { value: ImportMode; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'json', label: 'JSON 文件', icon: FileJson, desc: '上传标准导出的 JSON 文件' },
  { value: 'zip', label: 'ZIP 文件', icon: Archive, desc: '上传包含 manifest.json 的 ZIP 包（仅 Skills）' },
  { value: 'markdown', label: '粘贴 Markdown', icon: FileText, desc: '直接粘贴单个 Skill 的 Markdown 内容' },
];

function parseToolsFromJson(json: unknown): ImportItem[] {
  const items: ImportItem[] = [];
  if (!json || typeof json !== 'object') return items;
  const data = json as Record<string, unknown>;
  const list = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
  for (const item of list) {
    if (item && typeof item === 'object') {
      const t = item as Record<string, unknown>;
      items.push({
        name: String(t.name ?? ''),
        identifier: String(t.identifier ?? t.name ?? ''),
        description: String(t.description ?? ''),
        category: String(t.category ?? 'custom'),
        selected: true,
      });
    }
  }
  return items;
}

function parseSkillsFromJson(json: unknown): ImportItem[] {
  const items: ImportItem[] = [];
  if (!json || typeof json !== 'object') return items;
  const data = json as Record<string, unknown>;
  const list = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
  for (const item of list) {
    if (item && typeof item === 'object') {
      const t = item as Record<string, unknown>;
      items.push({
        name: String(t.name ?? ''),
        identifier: String(t.identifier ?? t.name ?? ''),
        description: String(t.description ?? ''),
        category: String(t.category ?? 'custom'),
        selected: true,
      });
    }
  }
  return items;
}

async function parseZipForSkills(file: File): Promise<ImportItem[]> {
  const items: ImportItem[] = [];
  try {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(file);
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) return items;
    const manifestJson = JSON.parse(await manifestFile.async('string'));
    const skills = Array.isArray(manifestJson.skills) ? manifestJson.skills : [];
    for (const s of skills) {
      items.push({
        name: String(s.name ?? s.displayName ?? ''),
        identifier: String(s.name ?? ''),
        description: String(s.description ?? ''),
        category: String(s.category ?? 'custom'),
        selected: true,
      });
    }
  } catch {
    // ZIP 解析失败，返回空
  }
  return items;
}

export function ImportDialog({ open, onOpenChange, importType }: ImportDialogProps) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<ImportMode>('json');
  const [file, setFile] = useState<File | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [previewItems, setPreviewItems] = useState<ImportItem[]>([]);
  const [step, setStep] = useState<'input' | 'preview' | 'result'>('input');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typeLabel = importType === 'tools' ? 'Tool' : 'Skill';

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    if (importType === 'skills' && mode === 'zip') {
      const items = await parseZipForSkills(f);
      setPreviewItems(items);
    } else {
      const text = await f.text();
      try {
        const json = JSON.parse(text);
        const items = importType === 'tools' ? parseToolsFromJson(json) : parseSkillsFromJson(json);
        setPreviewItems(items);
      } catch {
        setPreviewItems([]);
      }
    }
  }, [importType, mode]);

  const handleMarkdownChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setMarkdown(text);
    // 简单解析：从 markdown 头部提取 name/description
    const nameMatch = text.match(/^#\s+(.+)/m);
    const descMatch = text.match(/^>\s*(.+)/m) || text.match(/\*\*(.+?)\*\*[:：]/);
    const catMatch = text.match(/category[:：]\s*(\S+)/i);
    if (nameMatch) {
      setPreviewItems([{
        name: nameMatch[1].trim(),
        identifier: nameMatch[1].replace(/\s+/g, '-').toLowerCase(),
        description: descMatch?.[1]?.trim() ?? '',
        category: catMatch?.[1] ?? 'custom',
        selected: true,
      }]);
    }
  }, []);

  const handleDetectConflicts = useCallback(async (items: ImportItem[]) => {
    // 获取现有列表，检测名称冲突
    const type = importType;
    let existingNames: string[] = [];
    if (type === 'tools') {
      const data = await qc.fetchQuery({ queryKey: toolKeys.list(), queryFn: () => toolsApi.getAll() });
      existingNames = data.list.map(t => t.identifier);
    } else {
      const data = await qc.fetchQuery({ queryKey: skillKeys.list(), queryFn: () => skillsApi.getAll() });
      existingNames = data.list.map(s => s.identifier);
    }
    const conflicts = new Set<string>();
    for (const item of items) {
      if (existingNames.includes(item.identifier)) conflicts.add(item.identifier);
    }
    setConflictNames(conflicts);
    setPreviewItems(items.map(i => ({ ...i, conflict: conflicts.has(i.identifier) })));
  }, [importType, qc]);

  const handleNextToPreview = useCallback(async () => {
    if (mode === 'markdown') {
      if (!markdown.trim()) return;
      const nameMatch = markdown.match(/^#\s+(.+)/m);
      if (!nameMatch) return;
      const descMatch = markdown.match(/^>\s*(.+)/m) || markdown.match(/\*\*(.+?)\*\*[:：]/);
      const catMatch = markdown.match(/category[:：]\s*(\S+)/i);
      const item: ImportItem = {
        name: nameMatch[1].trim(),
        identifier: nameMatch[1].replace(/\s+/g, '-').toLowerCase(),
        description: descMatch?.[1]?.trim() ?? '',
        category: catMatch?.[1] ?? 'custom',
        selected: true,
      };
      await handleDetectConflicts([item]);
    } else {
      if (!file) return;
      await handleDetectConflicts(previewItems);
    }
    setStep('preview');
  }, [mode, markdown, file, previewItems, handleDetectConflicts]);

  const handleImport = useCallback(async () => {
    setLoading(true);
    const selectedItems = previewItems.filter(i => i.selected);
    if (selectedItems.length === 0) {
      setLoading(false);
      return;
    }

    try {
      if (importType === 'tools') {
        // 工具只支持 JSON
        if (!file) { setLoading(false); return; }
        const result = await toolsApi.importTools(file);
        setResult({ imported: result.imported, skipped: 0, failed: result.failed });
      } else {
        // Skills 支持 JSON / ZIP / Markdown
        if (mode === 'markdown') {
          const nameMatch = markdown.match(/^#\s+(.+)/m);
          const descMatch = markdown.match(/^>\s*(.+)/m) || markdown.match(/\*\*(.+?)\*\*[:：]/);
          const catMatch = markdown.match(/category[:：]\s*(\S+)/i);
          const tagsMatch = markdown.match(/tags?[:：]\s*(.+)/i);
          const content = markdown;

          const input: Record<string, unknown> = {
            name: nameMatch?.[1]?.trim() ?? 'Imported Skill',
            identifier: nameMatch?.[1]?.replace(/\s+/g, '-').toLowerCase() ?? `skill-${Date.now()}`,
            description: descMatch?.[1]?.trim() ?? '',
            category: catMatch?.[1] ?? 'custom',
            tags: tagsMatch?.[1]?.split(',').map(t => t.trim()) ?? [],
            content,
            source: 'imported' as const,
          };

          const created = await skillsApi.create(input as Parameters<typeof skillsApi.create>[0]);
          setResult({ imported: created ? 1 : 0, skipped: 0, failed: created ? 0 : 1 });
        } else {
          if (!file) { setLoading(false); return; }
          const result = await skillsApi.importSkills(file);
          setResult({ imported: result.imported, skipped: 0, failed: result.failed });
        }
      }

      setStep('result');
      // 刷新列表
      qc.invalidateQueries({ queryKey: importType === 'tools' ? toolKeys.all : skillKeys.all });
    } catch (err) {
      setResult({ imported: 0, skipped: 0, failed: 1, errors: [String(err)] });
      setStep('result');
    } finally {
      setLoading(false);
    }
  }, [importType, mode, file, markdown, previewItems, qc]);

  const handleClose = () => {
    setStep('input');
    setFile(null);
    setMarkdown('');
    setPreviewItems([]);
    setConflictNames(new Set());
    setResult(null);
    onOpenChange(false);
  };

  const toggleItem = (idx: number) => {
    setPreviewItems(prev => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item));
  };

  const conflictCount = previewItems.filter(i => i.conflict).length;
  const selectedCount = previewItems.filter(i => i.selected).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-500" />
            导入 {typeLabel}s
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: 选择输入方式 */}
        {step === 'input' && (
          <div className="space-y-5 mt-2">
            {/* 模式选择 */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">选择导入方式</p>
              <div className="grid grid-cols-3 gap-2">
                {MODE_OPTIONS.filter(opt => importType === 'skills' || opt.value !== 'zip').map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setMode(opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                      mode === opt.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500'
                    }`}
                  >
                    <opt.icon className={`w-6 h-6 ${mode === opt.value ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`} />
                    <span className="text-xs font-medium text-center">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 文件上传 or 粘贴 */}
            {mode !== 'markdown' ? (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  上传 {mode === 'json' ? 'JSON' : 'ZIP'} 文件
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={mode === 'json' ? '.json' : '.zip'}
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 p-8 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                >
                  {file ? (
                    <>
                      <FileJson className="w-8 h-8 text-blue-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                      <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">点击或拖拽文件到此处</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">粘贴 Markdown 内容</p>
                <Textarea
                  value={markdown}
                  onChange={handleMarkdownChange}
                  placeholder={`# Skill 名称\n\n> 简短描述\n\n**category**: coding\n\n---\n\nSkill 详细内容（Markdown）...`}
                  className="font-mono text-sm min-h-[200px]"
                />
                <p className="text-xs text-gray-400 mt-1">将自动从内容中提取名称、描述和分类</p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>取消</Button>
              <Button
                onClick={handleNextToPreview}
                disabled={
                  (mode !== 'markdown' && !file) ||
                  (mode === 'markdown' && !markdown.trim())
                }
              >
                下一步：预览
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: 预览列表 */}
        {step === 'preview' && (
          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                预览导入列表 ({previewItems.length} 项)
              </p>
              <div className="flex gap-2 items-center">
                {conflictCount > 0 && (
                  <Badge variant="warning" className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {conflictCount} 个冲突
                  </Badge>
                )}
                <span className="text-xs text-gray-500">{selectedCount} 项已选</span>
              </div>
            </div>

            {/* 列表 */}
            <div className="border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/50 sticky top-0">
                  <tr>
                    <th className="w-8 px-3 py-2 text-left"></th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">名称</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">标识符</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">分类</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {previewItems.map((item, idx) => (
                    <tr key={idx} className={`hover:bg-gray-50 dark:hover:bg-slate-700/30 ${item.conflict ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={item.selected ?? true}
                          onChange={() => toggleItem(idx)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
                        {item.conflict && (
                          <Badge variant="warning" className="ml-2 text-xs">冲突</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs font-mono text-gray-500 dark:text-gray-400">{item.identifier}</td>
                      <td className="px-3 py-2">
                        <Badge variant="default" className="text-xs">{item.category}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewItems.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500">未检测到可导入项</div>
              )}
            </div>

            {conflictCount > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                标记为「冲突」的项目将覆盖现有同名 {typeLabel}，确认导入吗？
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('input')}>上一步</Button>
              <Button onClick={handleImport} loading={loading} disabled={selectedCount === 0}>
                确认导入 {selectedCount > 0 && `(${selectedCount} 项)`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: 结果 */}
        {step === 'result' && result && (
          <div className="space-y-4 mt-2">
            <div className="flex flex-col items-center gap-3 py-4">
              {result.failed === 0 ? (
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              ) : (
                <XCircle className="w-12 h-12 text-red-500" />
              )}
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {result.failed === 0 ? '导入完成' : '导入完成（部分失败）'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{result.imported}</div>
                <div className="text-xs text-gray-500">成功</div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">{result.skipped}</div>
                <div className="text-xs text-gray-500">跳过</div>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{result.failed}</div>
                <div className="text-xs text-gray-500">失败</div>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">错误信息</p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-500 dark:text-red-400">{e}</p>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>关闭</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
