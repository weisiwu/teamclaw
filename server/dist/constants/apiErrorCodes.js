/**
 * API 错误码标准定义
 * 统一错误码体系，便于客户端做错误分支处理
 *
 * 错误码结构：[类别][序号]
 * - 1xxx: 通用错误（认证、授权、参数校验）
 * - 2xxx: 资源操作错误（CRUD）
 * - 3xxx: 业务逻辑错误（状态不对、冲突等）
 * - 4xxx: 第三方服务错误（Git、构建、LLM等）
 * - 5xxx: 系统错误（数据库、文件系统等）
 */
export const API_ERROR_CODES = {
    // ========== 1xxx 通用错误 ==========
    UNAUTHORIZED: 1001, // 未认证（未登录/Token缺失）
    FORBIDDEN: 1002, // 无权限（已登录但无权限）
    INVALID_PARAMETER: 1003, // 参数格式错误
    MISSING_PARAMETER: 1004, // 缺少必填参数
    RESOURCE_NOT_FOUND: 1005, // 资源不存在
    METHOD_NOT_ALLOWED: 1006, // HTTP 方法不允许
    REQUEST_TIMEOUT: 1007, // 请求超时
    RATE_LIMITED: 1008, // 请求过于频繁（限流）
    // ========== 2xxx 资源操作错误 ==========
    CREATE_FAILED: 2001, // 创建资源失败
    UPDATE_FAILED: 2002, // 更新资源失败
    DELETE_FAILED: 2003, // 删除资源失败
    QUERY_FAILED: 2004, // 查询资源失败
    DUPLICATE_RESOURCE: 2005, // 资源已存在（冲突）
    BULK_OPERATION_PARTIAL: 2006, // 批量操作部分失败
    BULK_OPERATION_FAILED: 2007, // 批量操作全部失败
    // ========== 3xxx 业务逻辑错误 ==========
    INVALID_STATUS: 3001, // 状态不合法（如对已发布的版本重复发布）
    INVALID_TRANSITION: 3002, // 状态转换不合法（如从 pending 回滚）
    CONCURRENT_MODIFICATION: 3003, // 并发修改冲突
    PRECONDITION_FAILED: 3004, // 前置条件不满足
    DEPENDENCY_NOT_READY: 3005, // 依赖资源未就绪
    QUOTA_EXCEEDED: 3006, // 配额超限
    FEATURE_DISABLED: 3007, // 功能已禁用
    // ========== 4xxx 第三方服务错误 ==========
    GIT_ERROR: 4001, // Git 操作失败
    BUILD_ERROR: 4002, // 构建失败
    LLM_ERROR: 4003, // LLM API 调用失败
    WEBHOOK_ERROR: 4004, // Webhook 调用失败
    FILE_STORAGE_ERROR: 4005, // 文件存储服务错误
    EXTERNAL_API_ERROR: 4006, // 外部 API 调用失败
    // ========== 5xxx 系统错误 ==========
    DATABASE_ERROR: 5001, // 数据库操作失败
    CACHE_ERROR: 5002, // 缓存服务错误
    INTERNAL_ERROR: 5003, // 内部错误（未分类）
    SERVICE_UNAVAILABLE: 5004, // 服务不可用
    NOT_IMPLEMENTED: 5005, // 功能未实现
};
/**
 * 将错误码转换为人类可读消息
 */
export function getErrorMessage(code) {
    const messages = {
        [API_ERROR_CODES.UNAUTHORIZED]: '未认证，请登录后操作',
        [API_ERROR_CODES.FORBIDDEN]: '无权访问此资源',
        [API_ERROR_CODES.INVALID_PARAMETER]: '参数格式错误',
        [API_ERROR_CODES.MISSING_PARAMETER]: '缺少必填参数',
        [API_ERROR_CODES.RESOURCE_NOT_FOUND]: '资源不存在',
        [API_ERROR_CODES.METHOD_NOT_ALLOWED]: 'HTTP 方法不允许',
        [API_ERROR_CODES.REQUEST_TIMEOUT]: '请求超时',
        [API_ERROR_CODES.RATE_LIMITED]: '请求过于频繁，请稍后再试',
        [API_ERROR_CODES.CREATE_FAILED]: '创建资源失败',
        [API_ERROR_CODES.UPDATE_FAILED]: '更新资源失败',
        [API_ERROR_CODES.DELETE_FAILED]: '删除资源失败',
        [API_ERROR_CODES.QUERY_FAILED]: '查询资源失败',
        [API_ERROR_CODES.DUPLICATE_RESOURCE]: '资源已存在',
        [API_ERROR_CODES.BULK_OPERATION_PARTIAL]: '批量操作部分失败',
        [API_ERROR_CODES.BULK_OPERATION_FAILED]: '批量操作全部失败',
        [API_ERROR_CODES.INVALID_STATUS]: '资源状态不合法',
        [API_ERROR_CODES.INVALID_TRANSITION]: '状态转换不合法',
        [API_ERROR_CODES.CONCURRENT_MODIFICATION]: '资源已被其他操作修改，请刷新后重试',
        [API_ERROR_CODES.PRECONDITION_FAILED]: '操作前置条件不满足',
        [API_ERROR_CODES.DEPENDENCY_NOT_READY]: '依赖资源未就绪',
        [API_ERROR_CODES.QUOTA_EXCEEDED]: '配额超限',
        [API_ERROR_CODES.FEATURE_DISABLED]: '功能已禁用',
        [API_ERROR_CODES.GIT_ERROR]: 'Git 操作失败',
        [API_ERROR_CODES.BUILD_ERROR]: '构建失败',
        [API_ERROR_CODES.LLM_ERROR]: 'AI 服务调用失败',
        [API_ERROR_CODES.WEBHOOK_ERROR]: 'Webhook 调用失败',
        [API_ERROR_CODES.FILE_STORAGE_ERROR]: '文件存储服务错误',
        [API_ERROR_CODES.EXTERNAL_API_ERROR]: '外部服务调用失败',
        [API_ERROR_CODES.DATABASE_ERROR]: '数据库操作失败',
        [API_ERROR_CODES.CACHE_ERROR]: '缓存服务错误',
        [API_ERROR_CODES.INTERNAL_ERROR]: '内部错误，请联系管理员',
        [API_ERROR_CODES.SERVICE_UNAVAILABLE]: '服务暂时不可用',
        [API_ERROR_CODES.NOT_IMPLEMENTED]: '功能开发中，暂不支持',
    };
    return messages[code] ?? '未知错误';
}
