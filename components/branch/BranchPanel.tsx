/**
 * BranchPanel Component
 * 分支管理面板 - 显示分支列表、创建、删除、设为主分支、重命名、保护
 */
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  GitBranch,
  Star,
  Trash2,
  Plus,
  X,
  Loader2,
  Check,
  Search,
  RefreshCw,
  Shield,
  ShieldOff,
  Edit3,
} from 'lucide-react';

export interface Branch {
  id: string;
  name: string;
  description?: string;
  isMain: boolean;
  isProtected: boolean;
  createdAt: string;
}

export interface BranchPanelProps {
  branches: Branch[];
  isOpen: boolean;
  onClose: () => void;
  onCreateBranch: (data: { name: string; description?: string; baseBranch?: string }) => void;
  onDeleteBranch: (branchId: string) => void;
  onSetMainBranch: (branchId: string) => void;
  onRenameBranch: (branchId: string, newName: string) => void;
  onToggleProtection: (branchId: string, isProtected: boolean) => void;
  isCreatingBranch: boolean;
  isDeletingBranch: boolean;
  isSettingMainBranch: boolean;
  isRenamingBranch: boolean;
  isTogglingProtection: boolean;
  baseBranches?: Branch[];
}

export function BranchPanel({
  branches,
  isOpen,
  onClose,
  onCreateBranch,
  onDeleteBranch,
  onSetMainBranch,
  onRenameBranch,
  onToggleProtection,
  isCreatingBranch,
  isDeletingBranch,
  isSettingMainBranch,
  isRenamingBranch,
  isTogglingProtection,
  baseBranches = [],
}: BranchPanelProps) {
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchDesc, setNewBranchDesc] = useState('');
  const [selectedBaseBranch, setSelectedBaseBranch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  // Search/filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProtected, setFilterProtected] = useState<'all' | 'protected' | 'unprotected'>(
    'all'
  );
  // Rename state
  const [renameBranchId, setRenameBranchId] = useState<string | null>(null);
  const [renameNewName, setRenameNewName] = useState('');
  // Refresh loading state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Escape key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!newBranchName.trim()) return;
    onCreateBranch({
      name: newBranchName,
      description: newBranchDesc,
      baseBranch: selectedBaseBranch || undefined,
    });
    setNewBranchName('');
    setNewBranchDesc('');
    setSelectedBaseBranch('');
  };

  const handleDelete = (branchId: string) => {
    if (deleteConfirmId === branchId) {
      onDeleteBranch(branchId);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(branchId);
    }
  };

  const handleStartRename = (branch: Branch) => {
    setRenameBranchId(branch.id);
    setRenameNewName(branch.name);
  };

  const handleConfirmRename = () => {
    if (!renameBranchId || !renameNewName.trim()) return;
    onRenameBranch(renameBranchId, renameNewName.trim());
    setRenameBranchId(null);
    setRenameNewName('');
  };

  const handleCancelRename = () => {
    setRenameBranchId(null);
    setRenameNewName('');
  };

  // Filter branches
  const filteredBranches = branches.filter(branch => {
    // Search filter
    if (searchQuery && !branch.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Protection filter
    if (filterProtected === 'protected' && !branch.isProtected) return false;
    if (filterProtected === 'unprotected' && branch.isProtected) return false;
    return true;
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 面板 */}
      <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* 标题 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            <h2 className="text-lg font-semibold">分支管理</h2>
            <Badge variant="default" className="text-xs">
              {filteredBranches.length} / {branches.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="刷新"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="p-3 border-b bg-gray-50 dark:border-b dark:bg-slate-800 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-400" />
            <Input
              placeholder="搜索分支..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <select
            value={filterProtected}
            onChange={e =>
              setFilterProtected(e.target.value as 'all' | 'protected' | 'unprotected')
            }
            className="px-3 py-2 border border-gray-300 dark:border-slate-500 rounded-md text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="all">全部</option>
            <option value="protected">已保护</option>
            <option value="unprotected">未保护</option>
          </select>
        </div>

        {/* 创建新分支 */}
        <div className="p-4 border-b bg-gray-50 dark:border-b dark:bg-slate-800">
          <h3 className="text-sm font-medium mb-3">创建新分支</h3>
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="分支名称"
              value={newBranchName}
              onChange={e => setNewBranchName(e.target.value)}
              className="flex-1 min-w-[200px]"
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate();
              }}
            />
            <Input
              placeholder="描述（可选）"
              value={newBranchDesc}
              onChange={e => setNewBranchDesc(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            {baseBranches.length > 0 && (
              <select
                value={selectedBaseBranch}
                onChange={e => setSelectedBaseBranch(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-slate-500 rounded-md text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="">基于分支...</option>
                {baseBranches.map(b => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <Button onClick={handleCreate} disabled={!newBranchName.trim() || isCreatingBranch}>
              {isCreatingBranch ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              创建
            </Button>
          </div>
        </div>

        {/* 分支列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium mb-3">
            分支列表 ({filteredBranches.length})
            {searchQuery && (
              <span className="text-gray-500 dark:text-gray-400 ml-1">（搜索结果）</span>
            )}
          </h3>
          {filteredBranches.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <GitBranch className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>没有找到匹配的分支</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBranches.map((branch, index) => (
                <div
                  key={branch.id}
                  className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                    branch.isMain
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700'
                  } ${branch.isProtected ? 'border-amber-200' : ''} animate-fade-in`}
                  style={{
                    animationDelay: `${Math.min(index * 30, 300)}ms`,
                    animationFillMode: 'both',
                  }}
                >
                  {/* 重命名编辑模式 */}
                  {renameBranchId === branch.id ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={renameNewName}
                          onChange={e => setRenameNewName(e.target.value)}
                          className="flex-1"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleConfirmRename();
                            if (e.key === 'Escape') handleCancelRename();
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={handleConfirmRename}
                          disabled={!renameNewName.trim() || isRenamingBranch}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelRename}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      {branch.isProtected && (
                        <p className="text-xs text-amber-600">
                          ⚠️ 保护分支，需要先取消保护才能重命名
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GitBranch
                          className={`w-4 h-4 ${branch.isProtected ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium font-mono">{branch.name}</span>
                            {branch.isMain && (
                              <Badge variant="success" className="text-xs">
                                <Star className="w-3 h-3 mr-1 fill-current" />
                                主分支
                              </Badge>
                            )}
                            {branch.isProtected && (
                              <Badge variant="warning" className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                保护
                              </Badge>
                            )}
                          </div>
                          {branch.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {branch.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">
                            创建于 {new Date(branch.createdAt).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* 重命名按钮 */}
                        {!branch.isMain && !branch.isProtected && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartRename(branch)}
                            title="重命名分支"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        )}
                        {/* 保护切换 */}
                        {!branch.isMain && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-400 dark:text-gray-400">
                              {branch.isProtected ? (
                                <ShieldOff className="w-3.5 h-3.5 text-amber-500" />
                              ) : (
                                <Shield className="w-3.5 h-3.5 text-gray-400 dark:text-gray-400" />
                              )}
                            </span>
                            <Switch
                              checked={branch.isProtected}
                              onCheckedChange={checked => onToggleProtection(branch.id, checked)}
                              disabled={isTogglingProtection || branch.isMain}
                              size="sm"
                            />
                          </div>
                        )}
                        {!branch.isMain && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onSetMainBranch(branch.id)}
                              disabled={isSettingMainBranch}
                              title="设为主分支"
                            >
                              <Star className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(branch.id)}
                              disabled={isDeletingBranch || branch.isProtected}
                              className={`${deleteConfirmId === branch.id ? 'text-red-500 border-red-500' : ''} ${branch.isProtected ? 'opacity-50' : ''}`}
                              title={branch.isProtected ? '保护分支无法删除' : '删除分支'}
                            >
                              {deleteConfirmId === branch.id ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  确认
                                </>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BranchPanel;
