/**
 * 统一 API 错误处理中间件
 * 统一错误响应格式: { error: true, code: "ERROR_CODE", message: "...", requestId: "..." }
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// 自定义 API 错误类
export class ApiError extends Error {
  public statusCode: number;
  public errorCode: string;
  public requestId: string;

  constructor(
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_ERROR',
    message: string = 'Internal server error',
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.requestId = randomUUID();
    this.name = 'ApiError';
  }
}

// 错误代码映射
export const ErrorCodes = {
  // 400 系列
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  
  // 500 系列
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

// 统一错误响应格式
interface ErrorResponse {
  error: true;
  code: string;
  message: string;
  requestId: string;
  timestamp: string;
  path?: string;
  method?: string;
}

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
  const requestId = (err as ApiError).requestId || randomUUID();
  
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
    console.error(`[Error ${requestId}] ${err.name}: ${err.message}`);
    console.error(err.stack);
  }

  const errorResponse: ErrorResponse = {
    error: true,
    code: errorCode,
    message,
    requestId,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  };

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 处理中间件
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({
    error: true,
    code: ErrorCodes.NOT_FOUND,
    message: `Route ${req.method} ${req.path} not found`,
    requestId: randomUUID(),
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  });
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

export default unifiedErrorHandler;
