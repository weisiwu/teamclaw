/**
 * usePermission — 前端权限检查 Hook
 * 读取 localStorage 中的 tc_user_role，映射到 lib/auth/roles 的 Role 类型
 * 然后调用 hasPermission 进行细粒度检查
 *
 * 注意：真实安全 enforcement 在后端 API，这里只是 UX 层面的隐藏/禁用
 */

import { useCallback } from "react";
import { hasPermission } from "@/lib/auth/permissions";
import type { Role } from "@/lib/auth/roles";
import type { Resource, Action } from "@/lib/auth/permissions";

// localStorage 中的角色值映射到 lib/auth/roles 的 Role
const ROLE_MAP: Record<string, Role> = {
  owner: "owner",
  admin: "admin",
  sub_admin: "admin", // 子管理员映射为 admin（高层级）
  developer: "developer",
  member: "developer", // 普通成员映射为 developer（有读写权限）
  viewer: "viewer",
};

function getMappedRole(storedRole: string | null): Role {
  if (!storedRole) return "viewer"; // 未登录/未知角色默认为 viewer（最严格）
  return ROLE_MAP[storedRole] ?? "viewer";
}

export function usePermission() {
  const getRole = useCallback((): Role => {
    if (typeof window === "undefined") return "viewer";
    const stored = localStorage.getItem("tc_user_role");
    return getMappedRole(stored);
  }, []);

  const can = useCallback(
    (resource: Resource, action: Action): boolean => {
      return hasPermission(getRole(), resource, action);
    },
    [getRole]
  );

  /**
   * 快捷方法：检查是否是管理员及以上（owner 或 admin）
   */
  const isAdminOrAbove = useCallback((): boolean => {
    const role = getRole();
    return role === "owner" || role === "admin";
  }, [getRole]);

  /**
   * 快捷方法：检查是否可以管理成员（owner 或 admin 可删除/修改角色）
   */
  const canManageMembers = useCallback((): boolean => {
    return can("member", "manage");
  }, [can]);

  /**
   * 快捷方法：检查是否可以创建/编辑成员
   */
  const canEditMembers = useCallback((): boolean => {
    return can("member", "create") || can("member", "update");
  }, [can]);

  /**
   * 快捷方法：检查是否可以删除成员
   */
  const canDeleteMembers = useCallback((): boolean => {
    return can("member", "delete");
  }, [can]);

  /**
   * 快捷方法：获取当前角色
   */
  const currentRole = useCallback((): Role => {
    return getRole();
  }, [getRole]);

  return {
    can,
    isAdminOrAbove,
    canManageMembers,
    canEditMembers,
    canDeleteMembers,
    currentRole,
  };
}
