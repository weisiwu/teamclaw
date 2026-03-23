/**
 * 统一 API 错误处理中间件
 * 统一错误响应格式: { success: false, code: number, errorCode: string, message: "...", requestId: "...", timestamp: "..." }
 */

import { Request, Response, NextFunction } from 'express';
import { error, ApiError, ErrorCodes } from '../utils/response.js';

/**
 * 全局错误处理中间件
 * 捕获所有错误并统一响应格式
 */
export function unifiedErrorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const existingRequestId = (err as ApiError).requestId;

  // 默认错误信息
  let statusCode = 500;
  let errorCode = ErrorCodes.INTERNAL_ERROR;
  let message = 'Internal server error';

  // 处理 ApiError
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;
  } else if (err.name === 'SyntaxError') {
    // JSON 解析错误
    statusCode = 400;
    errorCode = ErrorCodes.BAD_REQUEST;
    message = 'Invalid JSON format';
  } else if (err.message?.includes('not found') || err.message?.includes('Not found')) {
    statusCode = 404;
    errorCode = ErrorCodes.NOT_FOUND;
    message = err.message;
  } else if (err.message?.includes('unauthorized') || err.message?.includes('Unauthorized')) {
    statusCode = 401;
    errorCode = ErrorCodes.UNAUTHORIZED;
    message = err.message;
  } else if (err.message?.includes('forbidden') || err.message?.includes('Forbidden')) {
    statusCode = 403;
    errorCode = ErrorCodes.FORBIDDEN;
    message = err.message;
  }

  // 开发环境记录详细错误
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Error ${existingRequestId || 'unknown'}] ${err.name}: ${err.message}`);
    console.error(err.stack);
  }

  const body = error(statusCode, message, errorCode, existingRequestId);
  res.status(statusCode).json({ ...body, path: req.path, method: req.method });
}

/**
 * 404 处理中间件
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const body = error(404, `Route ${req.method} ${req.path} not found`, ErrorCodes.NOT_FOUND);
  res.status(404).json({ ...body, path: req.path, method: req.method });
}

/**
 * 异步处理包装器
 * 自动捕获 async 函数中的错误并传递给 next()
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export { ApiError, ErrorCodes };
export default unifiedErrorHandler;
