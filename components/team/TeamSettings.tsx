'use client';

import { useState, useEffect, useCallback } from 'react';
import { Role, ROLES, ROLE_OPTIONS } from '@/lib/auth/roles';
import {
  listTeamMembers,
  addMember,
  updateMemberRole,
  removeMember,
  TeamMember,
  AddMemberRequest,
} from '@/lib/api/team';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  Search,
  Loader2,
  ChevronDown,
  MoreHorizontal,
  X,
  Info,
} from 'lucide-react';

interface TeamSettingsProps {
  currentUserRole: Role;
}

type Tab = 'members' | 'invites';

// 内联简易下拉菜单（避免 asChild 问题）
function RoleDropdown({
  currentRole,
  memberId,
  onUpdate,
  disabled,
}: {
  currentRole: Role;
  memberId: string;
  onUpdate: (id: string, role: Role) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        className="flex items-center gap-1.5 cursor-pointer"
        disabled={disabled}
      >
        <Badge className={ROLES[currentRole]?.color ?? 'bg-gray-100 text-gray-800'}>
          <Shield className="w-3 h-3 mr-1" />
          {ROLES[currentRole]?.labelZh}
        </Badge>
        {!disabled && <ChevronDown className="w-3 h-3 text-gray-400" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border rounded-lg shadow-lg py-1 min-w-[120px]">
            {ROLE_OPTIONS.filter(r => r.id !== 'owner').map(r => (
              <button
                key={r.id}
                onClick={() => { onUpdate(memberId, r.id); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${currentRole === r.id ? 'opacity-50 cursor-default' : ''}`}
              >
                <Badge className={ROLES[r.id]?.color ?? 'bg-gray-100 text-gray-800'}>
                  {r.labelZh}
                </Badge>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function TeamSettings({ currentUserRole }: TeamSettingsProps) {
  const [tab, setTab] = useState<Tab>('members');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');

  // 新增成员 Dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddMemberRequest>({ name: '', role: 'developer' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // 操作菜单
  const [menuMemberId, setMenuMemberId] = useState<string | null>(null);

  // 删除确认 Dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listTeamMembers({
        page: 1,
        pageSize: 50,
        role: roleFilter === 'all' ? undefined : roleFilter,
        search: search || undefined,
      });
      setMembers(data.data);
    } catch (e) {
      console.error('Failed to load members:', e);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleAddMember = async () => {
    if (!addForm.name.trim()) {
      setAddError('请输入成员名称');
      return;
    }
    setAddLoading(true);
    setAddError('');
    try {
      await addMember(addForm);
      setAddOpen(false);
      setAddForm({ name: '', role: 'developer' });
      loadMembers();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : '添加失败');
    } finally {
      setAddLoading(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: Role) => {
    try {
      await updateMemberRole(memberId, newRole);
      loadMembers();
    } catch (e) {
      console.error('Failed to update role:', e);
    }
  };

  const handleRemoveMember = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await removeMember(deleteId);
      setDeleteId(null);
      loadMembers();
    } catch (e) {
      console.error('Failed to remove member:', e);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab 切换 */}
      <div className="flex items-center justify-between">
        <div className="flex border-b">
          <button
            onClick={() => setTab('members')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'members'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4 inline mr-1.5" />
            成员管理
          </button>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="w-4 h-4 mr-1" />
            添加成员
          </Button>
        )}
      </div>

      {/* 搜索和筛选 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索成员..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value as Role | 'all')}
          className="px-3 py-2 border rounded-md text-sm bg-background"
        >
          <option value="all">全部角色</option>
          {ROLE_OPTIONS.map(r => (
            <option key={r.id} value={r.id}>{r.labelZh}</option>
          ))}
        </select>
      </div>

      {/* 成员列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>暂无成员</p>
          {canManage && (
            <Button variant="outline" className="mt-3" onClick={() => setAddOpen(true)}>
              <UserPlus className="w-4 h-4 mr-1" />
              添加第一个成员
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-500">成员</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">角色</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">状态</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">最近活跃</th>
                {canManage && <th className="text-right px-4 py-3 font-medium text-gray-500">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map(member => (
                <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{member.name}</div>
                        {member.email && (
                          <div className="text-xs text-gray-500">{member.email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleDropdown
                      currentRole={member.role}
                      memberId={member.id}
                      onUpdate={handleUpdateRole}
                      disabled={!canManage}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={member.status === 'active' ? 'success' : member.status === 'pending' ? 'warning' : 'default'}
                    >
                      {member.status === 'active' ? '活跃' : member.status === 'pending' ? '待激活' : '停用'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {member.lastActiveAt
                      ? new Date(member.lastActiveAt).toLocaleDateString('zh-CN')
                      : '—'}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setMenuMemberId(menuMemberId === member.id ? null : member.id)}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <MoreHorizontal className="w-4 h-4 text-gray-500" />
                        </button>
                        {menuMemberId === member.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuMemberId(null)} />
                            <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border rounded-lg shadow-lg py-1 min-w-[120px]">
                              <button
                                onClick={() => { setDeleteId(member.id); setMenuMemberId(null); }}
                                className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                disabled={member.role === 'owner'}
                              >
                                <Trash2 className="w-4 h-4" />
                                移除成员
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 角色说明 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-300">角色说明</p>
          {ROLE_OPTIONS.map(r => (
            <div key={r.id} className="text-sm text-blue-800 dark:text-blue-400 flex gap-2">
              <Badge className={ROLES[r.id]?.color}>{r.labelZh}</Badge>
              <span>{r.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 新增成员 Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent title="添加团队成员" onClose={() => setAddOpen(false)}>
          <div className="space-y-4 py-2">
            {addError && (
              <div className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{addError}</div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">成员名称 *</label>
              <Input
                placeholder="输入成员名称"
                value={addForm.name}
                onChange={e => setAddForm({ ...addForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">邮箱（可选）</label>
              <Input
                type="email"
                placeholder="member@example.com"
                value={addForm.email ?? ''}
                onChange={e => setAddForm({ ...addForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">角色</label>
              <select
                className="w-full p-2 border rounded-md bg-background text-sm"
                value={addForm.role}
                onChange={e => setAddForm({ ...addForm, role: e.target.value as Role })}
              >
                {ROLE_OPTIONS.filter(r => r.id !== 'owner').map(r => (
                  <option key={r.id} value={r.id}>{r.labelZh} — {r.description}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>取消</Button>
            <Button onClick={handleAddMember} disabled={addLoading}>
              {addLoading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent title="确认移除成员" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-600">
            移除后该成员将无法访问团队资源。此操作可以恢复。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>取消</Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={deleteLoading}>
              {deleteLoading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              移除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
