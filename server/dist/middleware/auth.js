/**
 * 权限检查中间件
 * 从请求中提取用户身份并验证权限
 */
import { checkPermission } from "../services/permissionService.js";
/**
 * 从 header 中提取用户身份
 * Header 格式: X-User-Id: user_001
 *             X-User-Role: admin
 */
function extractUserFromHeaders(req) {
    const userId = req.headers["x-user-id"];
    const role = req.headers["x-user-role"];
    return { id: userId, role };
}
/**
 * 权限检查中间件
 * 验证用户是否有权限访问指定的 Agent
 */
export function requirePermission(agent) {
    return (req, res, next) => {
        const { id, role } = extractUserFromHeaders(req);
        // 未携带身份信息
        if (!id || !role) {
            res.status(401).json({
                code: 401,
                data: null,
                message: "未提供身份信息，请检查 X-User-Id 和 X-User-Role 请求头",
            });
            return;
        }
        // 权限检查
        const result = checkPermission(role, agent);
        req.user = { id, role };
        req.permission = result;
        if (!result.allowed) {
            res.status(403).json({
                code: 403,
                data: null,
                message: result.reason || "没有权限",
            });
            return;
        }
        next();
    };
}
/**
 * 可选身份中间件
 * 不强制要求身份信息，但如果有则附加到 req.user
 */
export function optionalAuth(req, _res, next) {
    const { id, role } = extractUserFromHeaders(req);
    if (id && role) {
        req.user = { id, role };
        req.permission = checkPermission(role, "pm"); // 默认检查 pm 权限
    }
    next();
}
/**
 * 检查管理员权限
 */
export function requireAdmin(req, res, next) {
    const { role } = extractUserFromHeaders(req);
    if (!role) {
        res.status(401).json({
            code: 401,
            data: null,
            message: "未提供身份信息",
        });
        return;
    }
    if (role !== "admin") {
        res.status(403).json({
            code: 403,
            data: null,
            message: "需要管理员权限",
        });
        return;
    }
    req.user = { id: req.headers["x-user-id"], role };
    next();
}
