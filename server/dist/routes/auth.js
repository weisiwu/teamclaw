import { Router } from 'express';
import { success, error } from '../utils/response.js';
import { login, refreshAccessToken } from '../services/authService.js';
const router = Router();
// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json(error(400, '用户名和密码不能为空'));
        }
        const result = await login(username, password);
        res.json(success(result));
    }
    catch (err) {
        res.status(401).json(error(401, err instanceof Error ? err.message : '登录失败'));
    }
});
// POST /api/v1/auth/refresh
router.post('/refresh', (req, res) => {
    try {
        const { refreshToken } = req.body;
        const token = refreshAccessToken(refreshToken);
        res.json(success({ token }));
    }
    catch {
        res.status(401).json(error(401, 'Token 已过期，请重新登录'));
    }
});
export default router;
