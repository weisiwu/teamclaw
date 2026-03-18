/**
 * BranchPanel Component
 * 分支管理面板 - 显示分支列表、创建、删除、设为主分支
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Star, Trash2, Plus, X, Loader2, Check } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  description?: string;
  isMain: boolean;
  createdAt: string;
}

interface BranchPanelProps {
  branches: Branch[];
  isOpen: boolean;
  onClose: () => void;
  onCreateBranch: (data: { name: string; description?: string; baseBranch?: string }) => void;
  onDeleteBranch: (branchId: string) => void;
  onSetMainBranch: (branchId: string) => void;
  isCreatingBranch: boolean;
  isDeletingBranch: boolean;
  isSettingMainBranch: boolean;
  baseBranches?: Branch[];
}

export function BranchPanel({
  branches,
  isOpen,
  onClose,
  onCreateBranch,
  onDeleteBranch,
  onSetMainBranch,
  isCreatingBranch,
  isDeletingBranch,
  isSettingMainBranch,
  baseBranches = [],
}: BranchPanelProps) {
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchDesc, setNewBranchDesc] = useState("");
  const [selectedBaseBranch, setSelectedBaseBranch] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!newBranchName.trim()) return;
    onCreateBranch({
      name: newBranchName,
      description: newBranchDesc,
      baseBranch: selectedBaseBranch || undefined,
    });
    setNewBranchName("");
    setNewBranchDesc("");
    setSelectedBaseBranch("");
  };

  const handleDelete = (branchId: string) => {
    if (deleteConfirmId === branchId) {
      onDeleteBranch(branchId);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(branchId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 面板 */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* 标题 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            <h2 className="text-lg font-semibold">分支管理</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 创建新分支 */}
        <div className="p-4 border-b bg-gray-50">
          <h3 className="text-sm font-medium mb-3">创建新分支</h3>
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="分支名称"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <Input
              placeholder="描述（可选）"
              value={newBranchDesc}
              onChange={(e) => setNewBranchDesc(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            {baseBranches.length > 0 && (
              <select
                value={selectedBaseBranch}
                onChange={(e) => setSelectedBaseBranch(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="">基于分支...</option>
                {baseBranches.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <Button
              onClick={handleCreate}
              disabled={!newBranchName.trim() || isCreatingBranch}
            >
              {isCreatingBranch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              创建
            </Button>
          </div>
        </div>

        {/* 分支列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium mb-3">分支列表 ({branches.length})</h3>
          <div className="space-y-2">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className={`p-4 rounded-lg border ${
                  branch.isMain ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GitBranch className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{branch.name}</span>
                        {branch.isMain && (
                          <Badge variant="success" className="text-xs">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            主分支
                          </Badge>
                        )}
                      </div>
                      {branch.description && (
                        <p className="text-sm text-gray-500">{branch.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">创建于 {branch.createdAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!branch.isMain && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSetMainBranch(branch.id)}
                          disabled={isSettingMainBranch}
                        >
                          {isSettingMainBranch ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Star className="w-4 h-4" />
                          )}
                          设为主分支
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(branch.id)}
                          disabled={isDeletingBranch}
                          className={deleteConfirmId === branch.id ? 'text-red-500 border-red-500' : ''}
                        >
                          {deleteConfirmId === branch.id ? (
                            <>
                              <Check className="w-4 h-4" />
                              确认删除
                            </>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BranchPanel;
