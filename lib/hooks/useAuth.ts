/**
 * useAuth — 前端认证状态管理 Hook
 * 检查用户登录状态，提供 requireAuth 功能
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface AuthUser {
  id: string;
  name: string;
  role: string;
}

const AUTH_KEY = "tc_user_id";
const ROLE_KEY = "tc_user_role";
const NAME_KEY = "tc_user_name";

// 需要认证的路由前缀
const PROTECTED_ROUTES = ["/admin", "/settings", "/members"];

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  // 检查认证状态
  const checkAuth = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    
    const userId = localStorage.getItem(AUTH_KEY);
    const role = localStorage.getItem(ROLE_KEY);
    const name = localStorage.getItem(NAME_KEY);
    
    if (userId && role) {
      setUser({
        id: userId,
        role,
        name: name || "Unknown",
      });
      setIsAuthenticated(true);
      return true;
    }
    
    setUser(null);
    setIsAuthenticated(false);
    return false;
  }, []);

  // 初始化检查
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 路由守卫检查
  useEffect(() => {
    if (isAuthenticated === null) return; // 等待初始化
    
    const isProtected = PROTECTED_ROUTES.some(route => 
      pathname?.startsWith(route)
    );
    
    if (isProtected && !isAuthenticated) {
      // 重定向到登录页或首页
      router.push("/");
    }
  }, [isAuthenticated, pathname, router]);

  // 登录
  const login = useCallback((user: AuthUser) => {
    if (typeof window === "undefined") return;
    
    localStorage.setItem(AUTH_KEY, user.id);
    localStorage.setItem(ROLE_KEY, user.role);
    localStorage.setItem(NAME_KEY, user.name);
    
    setUser(user);
    setIsAuthenticated(true);
  }, []);

  // 登出
  const logout = useCallback(() => {
    if (typeof window === "undefined") return;
    
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(NAME_KEY);
    
    setUser(null);
    setIsAuthenticated(false);
    router.push("/");
  }, [router]);

  // 强制要求认证（用于组件内）
  const requireAuth = useCallback((redirectTo: string = "/"): boolean => {
    const authed = checkAuth();
    if (!authed) {
      router.push(redirectTo);
    }
    return authed;
  }, [checkAuth, router]);

  return {
    isAuthenticated,
    user,
    login,
    logout,
    requireAuth,
    checkAuth,
  };
}

export default useAuth;
