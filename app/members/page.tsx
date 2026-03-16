"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MemberForm } from "@/components/members";
import { useMemberList, useCreateMember, useUpdateMember, useDeleteMember, useBatchDeleteMembers } from "@/hooks/useMembers";
import { Member, ROLE_LABELS, MemberRole, CreateMemberRequest, UpdateMemberRequest } from "@/lib/api/types";
import { Pencil, Trash2, UserPlus, Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown, Download, Upload, X } from "lucide-react";
import * as XLSX from "xlsx";

type SortField = "name" | "role" | "weight" | "createdAt";
type SortOrder = "asc" | "desc";

export default function MembersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const { data, isLoading, error } = useMemberList();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();
  const batchDeleteMembers = useBatchDeleteMembers();

  const members = data?.data || [];

  // Filter and sort members
  const filteredMembers = useMemo(() => {
    let result = [...members];
    
    // Filter by search query
    if (searchQuery) {
      result = result.filter(m => m.name.includes(searchQuery));
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
  }, [members, searchQuery, sortBy, sortOrder]);

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
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">成员管理</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
          加载数据失败，请刷新页面重试
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">成员管理</h1>
        <Button onClick={handleAdd}>
          <UserPlus className="w-4 h-4 mr-2" />
          添加成员
        </Button>
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
          
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setBatchDeleteConfirm(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              批量删除 ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-500">加载中...</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            {searchQuery ? "没有匹配的成员" : "暂无成员数据"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredMembers.length && filteredMembers.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th 
                    className="text-left px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center">
                      姓名
                      {getSortIcon("name")}
                    </div>
                  </th>
                  <th 
                    className="text-left px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("role")}
                  >
                    <div className="flex items-center">
                      角色
                      {getSortIcon("role")}
                    </div>
                  </th>
                  <th 
                    className="text-left px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("weight")}
                  >
                    <div className="flex items-center">
                      权重
                      {getSortIcon("weight")}
                    </div>
                  </th>
                  <th 
                    className="text-left px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center">
                      加入时间
                      {getSortIcon("createdAt")}
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(member.id)}
                        onChange={() => handleSelect(member.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{member.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {ROLE_LABELS[member.role]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{member.weight}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{member.createdAt}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(member)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteConfirmId(member.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
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
          <div className="relative z-50 bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-2">确认删除</h3>
            <p className="text-gray-600 mb-6">
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
          <div className="relative z-50 bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-2">确认批量删除</h3>
            <p className="text-gray-600 mb-6">
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
    </div>
  );
}
