/**
 * 测试辅助工具
 * 测试用 Express app 工厂 + 认证辅助函数
 */

import express, { Express, Router } from 'express';
import { unifiedErrorHandler, notFoundHandler } from '../../server/src/middleware/errorHandler';

/**
 * 创建测试用 Express app
 * 挂载指定路由 + 错误处理
 */
export function createTestApp(routePath: string, router: Router): Express {
  const app = express();
  app.use(express.json());
  app.use(routePath, router);
  app.use(notFoundHandler);
  app.use(unifiedErrorHandler);
  return app;
}

/**
 * 创建带完整中间件的测试 app（模拟真实 server 环境）
 */
export function createFullApp(router: Router): Express {
  const app = express();
  app.use(express.json());
  // 模拟 server/index.ts 中的 CORS + 安全 headers
  app.use((req, _res, next) => {
    // 简单 mock：允许测试请求继续
    next();
  });
  app.use('/api/v1', router);
  app.use(notFoundHandler);
  app.use(unifiedErrorHandler);
  return app;
}
