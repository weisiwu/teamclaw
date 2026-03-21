"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LegacySelect as Select } from "@/components/ui/select";
import { MemberForm } from "@/components/members";
import { EmptyState } from "@/components/ui/empty-state";
import { MembersSkeleton } from "@/components/ui/projects-skeleton";
import { useMemberList, useCreateMember, useUpdateMember, useDeleteMember, useBatchDeleteMembers } from "@/hooks/useMembers";
import { usePermission } from "@/hooks/usePermission";
import { Member, ROLE_LABELS, MEMBER_ROLE_OPTIONS, MemberRole, MemberStatus, CreateMemberRequest, UpdateMemberRequest } from "@/lib/api/types";
import { Pencil, Trash2, UserPlus, Loader2, Search, Users, ArrowUpDown, ArrowUp, ArrowDown, Download, Upload, X, Power, PowerOff, Eye } from "lucide-react";
import * as XLSX from "xlsx";

type SortField = "name" | "role" | "weight" | "createdAt";
type SortOrder = "asc" | "desc";

export default function MembersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<MemberRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<MemberStatus | "all">("all");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);

  const { data, isLoading, error } = useMemberList();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();
  const batchDeleteMembers = useBatchDeleteMembers();

  // 权限检查
  const { isAdminOrAbove, canDeleteMembers } = usePermission();

  const members = data?.data || [];

  // Filter and sort members
  const filteredMembers = useMemo(() => {
    let result = [...members];
    
    // Filter by search query
    if (searchQuery) {
      result = result.filter(m => m.name.includes(searchQuery));
    }
    
    // Filter by role
    if (roleFilter !== "all") {
      result = result.filter(m => m.role === roleFilter);
    }
    
    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter(m => m.status === statusFilter);
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "role":
          comparison = a.role.localeCompare(b.role);
          break;
        case "weight":
          comparison = a.weight - b.weight;
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return result;
  }, [members, searchQuery, roleFilter, statusFilter, sortBy, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-40" />;
    return sortOrder === "asc" ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredMembers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMembers.map(m => m.id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleExport = () => {
    const exportData = filteredMembers.map(m => ({
      姓名: m.name,
      角色: ROLE_LABELS[m.role],
      权重: m.weight,
      状态: m.status === "active" ? "启用" : "禁用",
      加入时间: m.createdAt,
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "成员列表");
    XLSX.writeFile(wb, "members.xlsx");
  };

  const handleImport = async () => {
    if (!importFile) return;
    
    try {
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet) as Array<{ 姓名: string; 角色: string; 权重: number }>;
      
      for (const row of json) {
        let role: MemberRole = "member";
        if (row.角色 === "管理员") role = "admin";
        else if (row.角色 === "副管理员") role = "sub_admin";
        
        await createMember.mutateAsync({
          name: row.姓名,
          role,
          weight: row.权重 || 1,
          status: "active",
        });
      }
      
      setImportFile(null);
    } catch (err) {
      console.error("Failed to import members:", err);
    }
  };

  const handleBatchDelete = async () => {
    try {
      await batchDeleteMembers.mutateAsync(Array.from(selectedIds));
      setSelectedIds(new Set());
      setBatchDeleteConfirm(false);
    } catch (err) {
      console.error("Failed to batch delete members:", err);
    }
  };

  const handleToggleStatus = async (member: Member) => {
    try {
      const newStatus: MemberStatus = member.status === "active" ? "inactive" : "active";
      await updateMember.mutateAsync({ id: member.id, data: { status: newStatus } });
    } catch (err) {
      console.error("Failed to toggle member status:", err);
    }
  };

  const handleBatchRoleChange = async (newRole: MemberRole) => {
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => 
          updateMember.mutateAsync({ id, data: { role: newRole } })
        )
      );
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to batch change role:", err);
    }
  };

  const handleAdd = () => {
    setEditingMember(null);
    setIsFormOpen(true);
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setIsFormOpen(true);
  };

  const handleSubmit = async (data: CreateMemberRequest | UpdateMemberRequest) => {
    try {
      if (editingMember) {
        await updateMember.mutateAsync({ id: editingMember.id, data: data as UpdateMemberRequest });
      } else {
        await createMember.mutateAsync(data as CreateMemberRequest);
      }
      setIsFormOpen(false);
      setEditingMember(null);
    } catch (err) {
      console.error("Failed to save member:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMember.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to delete member:", err);
    }
  };

  const getRoleBadgeVariant = (role: MemberRole) => {
    switch (role) {
      case "admin":
        return "error";
      case "sub_admin":
        return "warning";
      default:
        return "default";
    }
  };

  if (error) {
    return (
      <div className="page-container">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">成员管理</h1>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
          加载数据失败，请刷新页面重试
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">成员管理</h1>
        {isAdminOrAbove() && (
          <Button onClick={handleAdd}>
            <UserPlus className="w-4 h-4 mr-2" />
            添加成员
          </Button>
        )}
      </div>

      {/* Search and Actions Bar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索姓名..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Role Filter */}
        <Select 
          value={roleFilter} 
          onChange={(e) => setRoleFilter(e.target.value as MemberRole | "all")}
          className="w-36"
          options={[{ value: "all", label: "全部角色" }, ...MEMBER_ROLE_OPTIONS]}
        />
        
        {/* Status Filter */}
        <Select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value as MemberStatus | "all")}
          className="w-36"
          options={[
            { value: "all", label: "全部状态" },
            { value: "active", label: "启用" },
            { value: "inactive", label: "禁用" },
          ]}
        />
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
          
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => document.getElementById("import-input")?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              导入
            </Button>
            <input
              id="import-input"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
          </div>
          
          {importFile && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{importFile.name}</span>
              <Button size="sm" onClick={handleImport} disabled={createMember.isPending}>
                {createMember.isPending ? "导入中..." : "确认导入"}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setImportFile(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          {selectedIds.size > 0 && isAdminOrAbove() && (
            <>
              <Select 
                onChange={(e) => e.target.value && handleBatchRoleChange(e.target.value as MemberRole)}
                className="w-36 h-8"
                value=""
                options={[{ value: "", label: "批量修改角色" }, ...MEMBER_ROLE_OPTIONS]}
              />
              <Button variant="destructive" size="sm" onClick={() => setBatchDeleteConfirm(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                批量删除 ({selectedIds.size})
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <MembersSkeleton />
        ) : filteredMembers.length === 0 ? (
          <div className="py-6">
            <EmptyState
              icon={searchQuery ? Search : Users}
              title={searchQuery ? "没有匹配的成员" : "暂无成员数据"}
              description={searchQuery ? "请尝试其他搜索条件或清除筛选" : isAdminOrAbove() ? "点击上方「添加成员」开始添加" : "暂无成员数据"}
              action={
                !searchQuery && isAdminOrAbove() && (
                  <Button onClick={handleAdd}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    添加成员
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800/50 border-b dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredMembers.length && filteredMembers.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 dark:border-slate-600"
                    />
                  </th>
                  <th
                    className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center">
                      姓名
                      {getSortIcon("name")}
                    </div>
                  </th>
                  <th
                    className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50"
                    onClick={() => handleSort("role")}
                  >
                    <div className="flex items-center">
                      角色
                      {getSortIcon("role")}
                    </div>
                  </th>
                  <th
                    className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50"
                    onClick={() => handleSort("weight")}
                  >
                    <div className="flex items-center">
                      权重
                      {getSortIcon("weight")}
                    </div>
                  </th>
                  <th
                    className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center">
                      加入时间
                      {getSortIcon("createdAt")}
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">状态</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(member.id)}
                        onChange={() => handleSelect(member.id)}
                        className="rounded border-gray-300 dark:border-slate-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{member.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {ROLE_LABELS[member.role]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{member.weight}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{member.createdAt}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={member.status === "active" ? "success" : "info"}>
                          {member.status === "active" ? "启用" : "禁用"}
                        </Badge>
                        {isAdminOrAbove() && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleToggleStatus(member)}
                            title={member.status === "active" ? "禁用" : "启用"}
                          >
                            {member.status === "active" ? (
                              <PowerOff className="w-4 h-4 text-orange-500" />
                            ) : (
                              <Power className="w-4 h-4 text-green-500" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setViewingMember(member)}
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4 text-blue-500" />
                        </Button>
                        {isAdminOrAbove() && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(member)}
                            >
                              <Pencil className="w-4 h-4 dark:text-white" />
                            </Button>
                            {canDeleteMembers() && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeleteConfirmId(member.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Form Dialog */}
      <MemberForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        member={editingMember}
        onSubmit={handleSubmit}
        isLoading={createMember.isPending || updateMember.isPending}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setDeleteConfirmId(null)}
          />
          <div className="relative z-50 bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">确认删除</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              确定要删除该成员吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmId(null)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleteMember.isPending}
              >
                {deleteMember.isPending ? "删除中..." : "删除"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Dialog */}
      {batchDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setBatchDeleteConfirm(false)}
          />
          <div className="relative z-50 bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">确认批量删除</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              确定要删除选中的 {selectedIds.size} 个成员吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setBatchDeleteConfirm(false)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={handleBatchDelete}
                disabled={batchDeleteMembers.isPending}
              >
                {batchDeleteMembers.isPending ? "删除中..." : "删除"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Member Detail Dialog */}
      {viewingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setViewingMember(null)}
          />
          <div className="relative z-50 bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">成员详情</h3>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setViewingMember(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b dark:border-slate-700">
                <span className="text-gray-500 dark:text-gray-400">ID</span>
                <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{viewingMember.id}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b dark:border-slate-700">
                <span className="text-gray-500 dark:text-gray-400">姓名</span>
                <span className="text-gray-900 dark:text-white font-medium">{viewingMember.name}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b dark:border-slate-700">
                <span className="text-gray-500 dark:text-gray-400">角色</span>
                <Badge variant={getRoleBadgeVariant(viewingMember.role)}>
                  {ROLE_LABELS[viewingMember.role]}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-3 border-b dark:border-slate-700">
                <span className="text-gray-500 dark:text-gray-400">权重</span>
                <span className="text-gray-900 dark:text-white">{viewingMember.weight}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b dark:border-slate-700">
                <span className="text-gray-500 dark:text-gray-400">状态</span>
                <Badge variant={viewingMember.status === "active" ? "success" : "info"}>
                  {viewingMember.status === "active" ? "启用" : "禁用"}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-3 border-b dark:border-slate-700">
                <span className="text-gray-500 dark:text-gray-400">加入时间</span>
                <span className="text-gray-700 dark:text-gray-300">{viewingMember.createdAt}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setViewingMember(null);
                  handleEdit(viewingMember);
                }}
              >
                <Pencil className="w-4 h-4 mr-2" />
                编辑
              </Button>
              <Button
                onClick={() => setViewingMember(null)}
              >
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
