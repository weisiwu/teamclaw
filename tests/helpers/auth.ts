/**
 * 认证辅助函数
 * 生成测试用认证 header
 *
 * 当前兼容开发模式 header 认证
 * H2 完成后改为返回 Bearer Token
 */

/**
 * 生成带身份信息的请求 header（开发模式兼容）
 */
export function authHeaders(role: string = 'admin', userId: string = 'test_user') {
  return {
    'X-User-Id': userId,
    'X-User-Role': role,
  };
}

/**
 * 生成无认证的请求 header
 */
export function noAuthHeaders() {
  return {};
}

/**
 * 生成管理员身份的认证 header
 */
export function adminAuth() {
  return authHeaders('admin', 'test_admin');
}

/**
 * 生成普通用户身份的认证 header
 */
export function userAuth() {
  return authHeaders('user', 'test_user');
}

/**
 * 生成只读角色的认证 header
 */
export function viewerAuth() {
  return authHeaders('viewer', 'test_viewer');
}
