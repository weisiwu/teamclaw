/**
 * Branch Manager Component
 * 分支管理面板 - 展示分支列表，支持创建、删除、设置主分支，保护等操作
 */
"use client";

import { useState, useEffect } from "react";
import type { GitBranch } from "@/lib/api/types";
import {
  useBranches,
  useBranchStats,
  useCreateBranch,
  useDeleteBranch,
  useSetMainBranch,
  useRenameBranch,
  useSetBranchProtection,
  useCheckoutBranch,
} from "@/lib/api/branches";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GitBranch as GitBranchIcon,
  Plus,
  Trash2,
  Shield,
  ShieldOff,
  Star,
  MoreHorizontal,
  Loader2,
  Clock,
  User,
  Pencil,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface BranchManagerProps {
  compact?: boolean;
}

export function BranchManager({ compact = false }: BranchManagerProps) {
  const { data: branchData, isLoading } = useBranches();
  const { data: stats } = useBranchStats();
  const createMutation = useCreateBranch();
  const deleteMutation = useDeleteBranch();
  const setMainMutation = useSetMainBranch();
  const renameMutation = useRenameBranch();
  const protectMutation = useSetBranchProtection();
  const checkoutMutation = useCheckoutBranch();
  const { success, error: toastError } = useToast();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [branchToRename, setBranchToRename] = useState<GitBranch | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<GitBranch | null>(null);

  // Reset create dialog input when opening
  useEffect(() => {
    if (showCreateDialog) setNewBranchName("");
  }, [showCreateDialog]);

  const branches = branchData?.data || [];
  const mainBranch = branches.find((b) => b.isMain);

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    try {
      await createMutation.mutateAsync({ name: newBranchName.trim() });
      setNewBranchName("");
      setShowCreateDialog(false);
      success("分支创建成功");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "创建分支失败");
    }
  };

  const handleDeleteBranch = async () => {
    if (!branchToDelete) return;
    try {
      await deleteMutation.mutateAsync(branchToDelete.id);
      setBranchToDelete(null);
      success("分支已删除");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "删除分支失败");
    }
  };

  const handleSetMain = async (branch: GitBranch) => {
    try {
      await setMainMutation.mutateAsync(branch.id);
      success(`已设为主分支: ${branch.name}`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "设置主分支失败");
    }
  };

  const handleToggleProtection = async (branch: GitBranch) => {
    try {
      await protectMutation.mutateAsync({ branchId: branch.id, protected: !branch.isProtected });
      success(branch.isProtected ? `已取消保护: ${branch.name}` : `已保护分支: ${branch.name}`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "设置保护失败");
    }
  };

  const handleCheckout = async (branch: GitBranch) => {
    try {
      await checkoutMutation.mutateAsync(branch.id);
      success(`已检出分支: ${branch.name}`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "检出分支失败");
    }
  };

  const handleRename = async () => {
    if (!branchToRename || !newBranchName.trim()) return;
    try {
      await renameMutation.mutateAsync({ branchId: branchToRename.id, newName: newBranchName.trim() });
      setNewBranchName("");
      setBranchToRename(null);
      setShowRenameDialog(false);
      success("分支重命名成功");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "重命名失败");
    }
  };

  const openRenameDialog = (branch: GitBranch) => {
    setBranchToRename(branch);
    setNewBranchName(branch.name);
    setShowRenameDialog(true);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <GitBranchIcon className="h-5 w-5" />
            <h3 className="font-semibold">分支管理</h3>
          </div>
          {stats && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="default">{stats.total} 个分支</Badge>
              {stats.protected > 0 && (
                <Badge variant="info">
                  <Shield className="h-3 w-3 mr-1" />
                  {stats.protected} 个受保护
                </Badge>
              )}
            </div>
          )}
        </div>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          新建分支
        </Button>
      </div>

      {/* Main Branch Banner */}
      {mainBranch && !compact && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <div className="flex-1">
            <span className="font-medium">{mainBranch.name}</span>
            <span className="text-xs text-muted-foreground ml-2">主分支</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDate(mainBranch.lastCommitAt)}
          </span>
        </div>
      )}

      {/* Branch List */}
      <div className="space-y-2">
        {branches.map((branch) => (
          <div
            key={branch.id}
            className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            {/* Branch Icon & Name */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <GitBranchIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium truncate">{branch.name}</span>
              <div className="flex items-center gap-1 shrink-0">
                {branch.isMain && (
                  <Badge variant="default" className="text-xs">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    主分支
                  </Badge>
                )}
                {branch.isProtected && !branch.isMain && (
                  <Badge variant="warning" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    受保护
                  </Badge>
                )}
              </div>
            </div>

            {/* Meta info - hidden in compact mode */}
            {!compact && (
              <>
                <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Clock className="h-3 w-3" />
                  {formatDate(branch.lastCommitAt)}
                </div>
                <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground max-w-[160px] truncate shrink-0">
                  {branch.commitMessage}
                </div>
                <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <User className="h-3 w-3" />
                  {branch.author}
                </div>
              </>
            )}

            {/* Actions */}
            <div className="shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!branch.isMain && (
                    <DropdownMenuItem onClick={() => handleSetMain(branch)}>
                      <Star className="h-4 w-4 mr-2" />
                      设为主分支
                    </DropdownMenuItem>
                  )}
                  {!branch.isMain && (
                    <DropdownMenuItem onClick={() => openRenameDialog(branch)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      重命名
                    </DropdownMenuItem>
                  )}
                  {!branch.isMain && (
                    <DropdownMenuItem onClick={() => handleCheckout(branch)}>
                      <GitBranchIcon className="h-4 w-4 mr-2" />
                      检出此分支
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleToggleProtection(branch)}
                    disabled={branch.isMain}
                  >
                    {branch.isProtected ? (
                      <>
                        <ShieldOff className="h-4 w-4 mr-2" />
                        取消保护
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        保护分支
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {!branch.isMain && (
                    <DropdownMenuItem
                      onClick={() => setBranchToDelete(branch)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      删除分支
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {branches.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <GitBranchIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无分支</p>
        </div>
      )}

      {/* Create Branch Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent title="创建新分支" onClose={() => setShowCreateDialog(false)}>
          <p className="text-sm text-muted-foreground mb-4">
            输入分支名称，从当前主分支创建新分支。
          </p>
          <div className="mb-4">
            <Input
              placeholder="例如：feature/new-feature"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateBranch()}
            />
            <p className="text-xs text-muted-foreground mt-2">
              支持字母、数字、_、.、/、- 等字符
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleCreateBranch}
              disabled={!newBranchName.trim() || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              创建分支
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Branch Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent title="重命名分支" onClose={() => setShowRenameDialog(false)}>
          <p className="text-sm text-muted-foreground mb-4">
            将分支 <span className="font-mono font-medium">{branchToRename?.name}</span> 重命名为新名称。
          </p>
          <div className="mb-4">
            <Input
              placeholder="新分支名称"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleRename}
              disabled={!newBranchName.trim() || renameMutation.isPending}
            >
              {renameMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              确认重命名
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!branchToDelete} onOpenChange={(open) => !open && setBranchToDelete(null)}>
        <DialogContent title="确认删除分支" onClose={() => setBranchToDelete(null)}>
          <p className="text-sm text-muted-foreground mb-4">
            确定要删除分支{" "}
            <span className="font-mono font-medium text-destructive">
              {branchToDelete?.name}
            </span>{" "}
            吗？此操作不可撤销。
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setBranchToDelete(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBranch}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              删除分支
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
