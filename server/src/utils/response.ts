import { randomUUID } from 'crypto';

// ============ Response Type Definitions ============

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  code: 200;
  data: T;
  message: string;
  requestId: string;
}

export interface ApiErrorResponse {
  success: false;
  code: number;
  errorCode: string;
  message: string;
  requestId: string;
  timestamp: string;
  path?: string;
  method?: string;
}

// ============ Success / Error Helpers ============

export function success<T>(data: T, requestId?: string): ApiSuccessResponse<T> {
  return {
    success: true,
    code: 200,
    data,
    message: 'ok',
    requestId: requestId || randomUUID(),
  };
}

/**
 * Build an error response.
 *
 * Overload signatures:
 *   error(statusCode, message)            → auto-derive errorCode from statusCode
 *   error(statusCode, message, errorCode)
 *   error(errorCode: string, message: string) → backward-compat for routes that
 *     called error('INVALID_PARAMS', 'msg') before the signature was locked.
 *     Detected when first arg is string AND second arg is string.
 */
export function error(
  statusCode: number,
  message: string,
  errorCode?: string,
  requestId?: string
): ApiErrorResponse;
export function error(
  errorCode: string,
  message: string
): ApiErrorResponse;
export function error(
  codeOrErrorCode: number | string,
  messageOrCode: string,
  maybeErrorCode?: string,
  maybeRequestId?: string
): ApiErrorResponse {
  // Backward-compat: error('INVALID_PARAMS', '需要 q 参数')
  // First arg is a string and second arg is also a string → treat as (errorCode, message)
  if (typeof codeOrErrorCode === 'string' && typeof messageOrCode === 'string') {
    const errorCode = codeOrErrorCode;
    const message = messageOrCode;
    const statusCode = errorCodeToStatusCode(errorCode);
    return buildErrorResponse(statusCode, message, errorCode);
  }

  const statusCode = codeOrErrorCode as number;
  const message = messageOrCode;
  const errorCode = maybeErrorCode ?? statusCodeToErrorCode(statusCode);
  const requestId = maybeRequestId;

  return buildErrorResponse(statusCode, message, errorCode, requestId);
}

function buildErrorResponse(
  statusCode: number,
  message: string,
  errorCode: string,
  requestId?: string
): ApiErrorResponse {
  return {
    success: false,
    code: statusCode,
    errorCode,
    message,
    requestId: requestId || randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

function statusCodeToErrorCode(status: number): string {
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    429: 'RATE_LIMITED',
    500: 'INTERNAL_ERROR',
  };
  return map[status] || 'UNKNOWN_ERROR';
}

function errorCodeToStatusCode(errorCode: string): number {
  const map: Record<string, number> = {
    BAD_REQUEST: 400,
    VALIDATION_ERROR: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
    ABILITY_NOT_FOUND: 404,
    INVALID_PARAMS: 400,
  };
  return map[errorCode] || 500;
}

// ============ ApiError class ============

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

// Error code constants
export const ErrorCodes = {
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;
