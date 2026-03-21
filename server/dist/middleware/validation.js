/**
 * API 输入校验 Schema
 * 使用 Zod 进行参数和请求体验证
 */
import { z } from 'zod';
// 版本 ID 校验：必须以 v 开头，后跟数字或下划线
export const versionIdSchema = z.string().regex(/^v[_0-9a-zA-Z]+$/, {
    message: '版本 ID 格式无效，必须以 v 开头',
});
// UUID 校验
export const uuidSchema = z.string().uuid({
    message: '无效的 UUID 格式',
});
// 分页参数校验
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
// 版本状态校验
export const versionStatusSchema = z.enum(['draft', 'published', 'archived']);
// 构建状态校验
export const buildStatusSchema = z.enum(['pending', 'building', 'success', 'failed']);
// 版本号校验（语义化版本）
export const semverSchema = z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/, { message: '无效的语义化版本号格式' });
// 创建版本请求体验证
export const createVersionSchema = z.object({
    version: semverSchema,
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    status: versionStatusSchema.optional(),
    tags: z.array(z.string()).optional(),
    branch: z.string().optional(),
    projectPath: z.string().optional(),
});
// 更新版本请求体验证
export const updateVersionSchema = z.object({
    status: versionStatusSchema.optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    tags: z.array(z.string()).optional(),
});
// 回滚请求体验证
export const rollbackSchema = z.object({
    target: z.string().min(1),
    type: z.enum(['tag', 'branch', 'commit']).optional(),
    createBranch: z.boolean().optional(),
});
// 构建配置请求体验证
export const buildConfigSchema = z.object({
    buildCommand: z.string().optional(),
    projectPath: z.string().optional(),
});
// 通用 ID 参数校验中间件
export function validateId(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.params.id);
        if (!result.success) {
            return res.status(400).json({
                code: 400,
                data: null,
                message: `参数校验失败: ${result.error.errors[0].message}`,
            });
        }
        next();
    };
}
// 请求体验证中间件
export function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            return res.status(400).json({
                code: 400,
                data: null,
                message: `请求体验证失败: ${errors}`,
            });
        }
        // 将校验后的数据替换到请求体
        req.body = result.data;
        next();
    };
}
// 查询参数校验中间件
export function validateQuery(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            return res.status(400).json({
                code: 400,
                data: null,
                message: `查询参数校验失败: ${result.error.errors[0].message}`,
            });
        }
        req.query = result.data;
        next();
    };
}
