"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MemberForm } from "@/components/members";
import { useMemberList, useCreateMember, useUpdateMember, useDeleteMember } from "@/hooks/useMembers";
import { Member, ROLE_LABELS, MemberRole, CreateMemberRequest, UpdateMemberRequest } from "@/lib/api/types";
import { Pencil, Trash2, UserPlus, Loader2 } from "lucide-react";

export default function MembersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data, isLoading, error } = useMemberList();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const members = data?.data || [];

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

      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-500">加载中...</span>
          </div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            暂无成员数据
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">姓名</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">角色</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">权重</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">加入时间</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
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
    </div>
  );
}
