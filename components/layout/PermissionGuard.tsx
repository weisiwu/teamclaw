"use client";

import { useEffect, useState } from "react";
import { ShieldOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PermissionGuardProps {
  children: React.ReactNode;
  /** Required role(s) to access the content. Defaults to 'admin'. */
  requiredRole?: "admin" | "sub_admin";
  /** Where to redirect non-authorized users. Default: '/' */
  redirectTo?: string;
}

/**
 * PermissionGuard — frontend UX guard for admin pages.
 *
 * Checks the user's role from localStorage (key: tc_user_role).
 * The REAL security enforcement is on the backend API (requireAdmin middleware).
 * This component prevents non-admins from seeing admin UI at all.
 *
 * Usage:
 *   <PermissionGuard requiredRole="admin">
 *     <AdminConfigPage />
 *   </PermissionGuard>
 */
export function PermissionGuard({
  children,
  requiredRole = "admin",
  redirectTo = "/",
}: PermissionGuardProps) {
  const [authorized, setAuthorized] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    const storedRole = localStorage.getItem("tc_user_role");
    if (storedRole === "admin" || storedRole === "sub_admin") {
      // sub_admin has partial access; pages can further gate specific actions
      setAuthorized(requiredRole === "sub_admin" ? storedRole === "sub_admin" || storedRole === "admin" : storedRole === "admin");
    } else {
      // Role not set — treat as non-admin for safety (backend will reject anyway)
      setAuthorized(false);
    }
  }, [requiredRole]);

  if (authorized === null) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-gray-400">检查权限...</div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <ShieldOff className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
          无权访问
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
          此页面仅限{requiredRole === "admin" ? "管理员" : "副管理员及以上"}访问。
          <br />
          <span className="text-sm">如需权限请联系管理员。</span>
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回上一页
          </Button>
          <Button onClick={() => (window.location.href = redirectTo)}>
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
