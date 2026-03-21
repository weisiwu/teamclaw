/**
 * RequireAuth — 客户端路由守卫组件
 * 包装需要认证的路由，未登录用户会被重定向
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface RequireAuthProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  requireAdmin?: boolean;
}

export function RequireAuth({ 
  children, 
  fallback,
  redirectTo = "/",
  requireAdmin = false,
}: RequireAuthProps) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated === false) {
      // 未登录，重定向
      router.push(redirectTo);
    } else if (isAuthenticated === true && requireAdmin && user?.role !== "admin") {
      // 需要管理员权限但当前用户不是管理员
      router.push(redirectTo);
    }
  }, [isAuthenticated, user, requireAdmin, redirectTo, router]);

  // 加载中状态
  if (isAuthenticated === null) {
    return (
      <>
        {fallback || (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
      </>
    );
  }

  // 未认证
  if (isAuthenticated === false) {
    return null;
  }

  // 需要管理员权限但未满足
  if (requireAdmin && user?.role !== "admin") {
    return null;
  }

  // 已认证，渲染子组件
  return <>{children}</>;
}

export default RequireAuth;
