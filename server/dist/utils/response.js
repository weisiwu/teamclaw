import { randomUUID } from 'crypto';
// ============ Success / Error Helpers ============
export function success(data, requestId) {
    return {
        success: true,
        code: 200,
        data,
        message: 'ok',
        requestId: requestId || randomUUID(),
    };
}
export function error(codeOrErrorCode, messageOrCode, maybeErrorCode, maybeRequestId) {
    // Backward-compat: error('INVALID_PARAMS', '需要 q 参数')
    // First arg is a string and second arg is also a string → treat as (errorCode, message)
    if (typeof codeOrErrorCode === 'string' && typeof messageOrCode === 'string') {
        const errorCode = codeOrErrorCode;
        const message = messageOrCode;
        const statusCode = errorCodeToStatusCode(errorCode);
        return buildErrorResponse(statusCode, message, errorCode);
    }
    const statusCode = codeOrErrorCode;
    const message = messageOrCode;
    const errorCode = maybeErrorCode ?? statusCodeToErrorCode(statusCode);
    const requestId = maybeRequestId;
    return buildErrorResponse(statusCode, message, errorCode, requestId);
}
function buildErrorResponse(statusCode, message, errorCode, requestId) {
    return {
        success: false,
        code: statusCode,
        errorCode,
        message,
        requestId: requestId || randomUUID(),
        timestamp: new Date().toISOString(),
    };
}
function statusCodeToErrorCode(status) {
    const map = {
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
function errorCodeToStatusCode(errorCode) {
    const map = {
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
    statusCode;
    errorCode;
    requestId;
    constructor(statusCode = 500, errorCode = 'INTERNAL_ERROR', message = 'Internal server error') {
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
};
