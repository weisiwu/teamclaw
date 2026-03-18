/**
 * Snapshot Compare Dialog
 * 快照对比功能 - 选择两个快照并展示差异
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  VERSION_STATUS_LABELS, 
  BUILD_STATUS_LABELS,
  BUILD_STATUS_BADGE_VARIANT,
  VERSION_TAG_OPTIONS,
  VersionTag,
  VersionStatus,
} from "@/lib/api/types";
import { GitCompare, Check, Minus, Plus } from "lucide-react";

export interface Snapshot {
  id: string;
  versionId: string;
  version: string;
  name: string;
  description: string;
  tags: VersionTag[];
  status: VersionStatus;
  buildStatus: "pending" | "building" | "success" | "failed";
  artifactUrl: string | null;
  gitBranch: string;
  createdAt: string;
}

interface SnapshotCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshots: Snapshot[];
}

type CompareField = "title" | "description" | "tags" | "status" | "buildStatus" | "artifactUrl";

interface FieldDiff {
  field: CompareField;
  label: string;
  oldValue: string | string[] | null;
  newValue: string | string[] | null;
  changed: boolean;
}

export function SnapshotCompareDialog({ 
  open, 
  onOpenChange, 
  snapshots 
}: SnapshotCompareDialogProps) {
  const [selectedIds, setSelectedIds] = useState<[string | null, string | null]>([null, null]);

  const handleSelect = (id: string) => {
    if (selectedIds[0] === id) {
      setSelectedIds([null, selectedIds[1]]);
    } else if (selectedIds[1] === id) {
      setSelectedIds([selectedIds[0], null]);
    } else if (selectedIds[0] === null) {
      setSelectedIds([id, selectedIds[1]]);
    } else if (selectedIds[1] === null) {
      setSelectedIds([selectedIds[0], id]);
    } else {
      // 已选满两个，替换第二个
      setSelectedIds([selectedIds[0], id]);
    }
  };

  const handleClear = () => {
    setSelectedIds([null, null]);
  };

  const snapshot1 = snapshots.find(s => s.id === selectedIds[0]);
  const snapshot2 = snapshots.find(s => s.id === selectedIds[1]);

  // 计算差异
  const getDiffs = (): FieldDiff[] => {
    if (!snapshot1 || !snapshot2) return [];

    const fields: FieldDiff[] = [
      {
        field: "title",
        label: "名称",
        oldValue: snapshot1.name,
        newValue: snapshot2.name,
        changed: snapshot1.name !== snapshot2.name,
      },
      {
        field: "description",
        label: "描述",
        oldValue: snapshot1.description || null,
        newValue: snapshot2.description || null,
        changed: snapshot1.description !== snapshot2.description,
      },
      {
        field: "tags",
        label: "标签",
        oldValue: snapshot1.tags,
        newValue: snapshot2.tags,
        changed: JSON.stringify(snapshot1.tags) !== JSON.stringify(snapshot2.tags),
      },
      {
        field: "status",
        label: "状态",
        oldValue: VERSION_STATUS_LABELS[snapshot1.status],
        newValue: VERSION_STATUS_LABELS[snapshot2.status],
        changed: snapshot1.status !== snapshot2.status,
      },
      {
        field: "buildStatus",
        label: "构建状态",
        oldValue: BUILD_STATUS_LABELS[snapshot1.buildStatus],
        newValue: BUILD_STATUS_LABELS[snapshot2.buildStatus],
        changed: snapshot1.buildStatus !== snapshot2.buildStatus,
      },
      {
        field: "artifactUrl",
        label: "产物URL",
        oldValue: snapshot1.artifactUrl,
        newValue: snapshot2.artifactUrl,
        changed: snapshot1.artifactUrl !== snapshot2.artifactUrl,
      },
    ];

    return fields;
  };

  const diffs = getDiffs();
  const hasChanges = diffs.some(d => d.changed);

  const renderTags = (tags: VersionTag[]) => {
    if (!tags || tags.length === 0) return <span className="text-gray-400">无</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => {
          const tagOption = VERSION_TAG_OPTIONS.find((t) => t.value === tag);
          return (
            <span
              key={tag}
              className={`px-2 py-0.5 rounded-full text-xs ${tagOption?.color || 'bg-gray-100 text-gray-800'}`}
            >
              {tagOption?.label || tag}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        title="快照对比" 
        className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
        onClose={() => onOpenChange(false)}
      >

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 快照选择区域 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                选择两个快照进行对比 ({selectedIds.filter(Boolean).length}/2)
              </span>
              {selectedIds[0] || selectedIds[1] ? (
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  清除选择
                </Button>
              ) : null}
            </div>
            
            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
              {snapshots.map((snapshot) => {
                const isSelected = selectedIds[0] === snapshot.id || selectedIds[1] === snapshot.id;
                const selectionOrder = selectedIds[0] === snapshot.id ? 1 : selectedIds[1] === snapshot.id ? 2 : 0;
                
                return (
                  <div
                    key={snapshot.id}
                    onClick={() => handleSelect(snapshot.id)}
                    className={`
                      p-3 rounded-lg border-2 cursor-pointer transition-all
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                            {selectionOrder}
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                        )}
                        <span className="font-medium">{snapshot.name}</span>
                      </div>
                      <Badge variant={BUILD_STATUS_BADGE_VARIANT[snapshot.buildStatus]} className="text-xs">
                        {BUILD_STATUS_LABELS[snapshot.buildStatus]}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 ml-7">
                      {new Date(snapshot.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                );
              })}
            </div>

            {snapshots.length < 2 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                需要至少 2 个快照才能进行对比
              </div>
            )}
          </div>

          {/* 对比结果区域 */}
          {snapshot1 && snapshot2 && (
            <div className="flex-1 overflow-y-auto">
              <div className="border rounded-lg overflow-hidden">
                {/* 对比表头 */}
                <div className="grid grid-cols-12 bg-gray-50 border-b">
                  <div className="col-span-3 px-4 py-2 text-sm font-medium text-gray-500">属性</div>
                  <div className="col-span-4 px-4 py-2 text-sm font-medium text-gray-700">
                    <div className="flex items-center gap-2">
                      {snapshot1.name}
                      <Badge variant="info" className="text-xs">旧</Badge>
                    </div>
                  </div>
                  <div className="col-span-4 px-4 py-2 text-sm font-medium text-gray-700">
                    <div className="flex items-center gap-2">
                      {snapshot2.name}
                      <Badge variant="info" className="text-xs">新</Badge>
                    </div>
                  </div>
                  <div className="col-span-1 px-2 py-2 text-center text-xs text-gray-500">差异</div>
                </div>

                {/* 对比内容 */}
                {diffs.map((diff) => (
                  <div 
                    key={diff.field} 
                    className={`grid grid-cols-12 border-b last:border-b-0 ${diff.changed ? 'bg-yellow-50' : ''}`}
                  >
                    <div className="col-span-3 px-4 py-3 text-sm text-gray-500">
                      {diff.label}
                    </div>
                    <div className={`col-span-4 px-4 py-3 text-sm ${diff.changed ? 'text-red-600' : 'text-gray-700'}`}>
                      {diff.field === "tags" ? renderTags(diff.oldValue as VersionTag[]) : 
                       diff.oldValue === null ? <span className="text-gray-400">-</span> : 
                       String(diff.oldValue)}
                    </div>
                    <div className={`col-span-4 px-4 py-3 text-sm ${diff.changed ? 'text-green-600' : 'text-gray-700'}`}>
                      {diff.field === "tags" ? renderTags(diff.newValue as VersionTag[]) : 
                       diff.newValue === null ? <span className="text-gray-400">-</span> : 
                       String(diff.newValue)}
                    </div>
                    <div className="col-span-1 px-2 py-3 flex items-center justify-center">
                      {diff.changed ? (
                        <div className="flex items-center gap-1">
                          <Minus className="w-3 h-3 text-red-500" />
                          <Plus className="w-3 h-3 text-green-500" />
                        </div>
                      ) : (
                        <Check className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 变更摘要 */}
              {hasChanges && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">变更摘要</h4>
                  <ul className="space-y-1">
                    {diffs.filter(d => d.changed).map((diff) => (
                      <li key={diff.field} className="text-sm text-yellow-700 flex items-start gap-2">
                        <span className="text-yellow-600">•</span>
                        <span>
                          <strong>{diff.label}</strong>: 
                          {diff.oldValue === null ? '无' : String(diff.oldValue).slice(0, 30)}
                          {String(diff.oldValue).length > 30 ? '...' : ''} 
                          → 
                          {diff.newValue === null ? '无' : String(diff.newValue).slice(0, 30)}
                          {String(diff.newValue).length > 30 ? '...' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!hasChanges && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                  <Check className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <p className="text-green-700">两个快照完全一致</p>
                </div>
              )}
            </div>
          )}

          {/* 未选择两个快照时的提示 */}
          {(!snapshot1 || !snapshot2) && snapshots.length >= 2 && (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <GitCompare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>请选择两个快照进行对比</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
