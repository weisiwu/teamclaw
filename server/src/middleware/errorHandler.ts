import { Request, Response, NextFunction } from 'express';
import { error } from '../utils/response.js';

export interface HttpError extends Error {
  statusCode?: number;
  code?: string;
}

export function globalErrorHandler(
  err: HttpError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log server-side for debugging
  console.error(`[ERROR] ${req.method} ${req.path}:`, {
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Never expose internal error details in production
  const safeMessage =
    statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : message;

  res.status(statusCode).json(error(statusCode, safeMessage));
}

/**
 * 404 handler for unmatched routes.
 * Place after all routes in index.ts.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(error(404, `Route not found: ${req.method} ${req.path}`));
}
