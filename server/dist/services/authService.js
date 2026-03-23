import bcrypt from 'bcryptjs';
import { signToken, signRefreshToken, verifyToken } from '../utils/jwt.js';
// 临时：内存用户表（后续迁移到 PostgreSQL）
const users = new Map();
// 初始化默认管理员
async function initDefaultAdmin() {
    const hash = await bcrypt.hash('admin123', 10);
    users.set('admin', { id: 'admin', name: '管理员', role: 'admin', passwordHash: hash });
}
initDefaultAdmin();
export async function login(username, password) {
    const user = users.get(username);
    if (!user)
        throw new Error('用户不存在');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
        throw new Error('密码错误');
    const token = signToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id, role: user.role });
    return { token, refreshToken, user: { id: user.id, name: user.name, role: user.role } };
}
export function refreshAccessToken(refreshToken) {
    const payload = verifyToken(refreshToken);
    return signToken({ userId: payload.userId, role: payload.role });
}
