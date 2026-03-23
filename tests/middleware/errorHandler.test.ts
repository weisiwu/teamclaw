/**
 * Error Handler Tests
 * 覆盖 server/src/middleware/errorHandler.ts 统一错误处理
 */

import { describe, it, expect, vi } from 'vitest';
import { ApiError, ErrorCodes, unifiedErrorHandler, notFoundHandler, asyncHandler } from '../../server/src/middleware/errorHandler';

describe('ErrorHandler', () => {
  describe('ApiError', () => {
    it('should create error with default values', () => {
      const error = new ApiError();
      
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('INTERNAL_ERROR');
      expect(error.message).toBe('Internal server error');
      expect(error.name).toBe('ApiError');
      expect(error.requestId).toBeDefined();
    });

    it('should create error with custom values', () => {
      const error = new ApiError(404, 'NOT_FOUND', 'Version not found');
      
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('NOT_FOUND');
      expect(error.message).toBe('Version not found');
    });

    it('should have unique requestId for each error', () => {
      const error1 = new ApiError();
      const error2 = new ApiError();
      
      expect(error1.requestId).not.toBe(error2.requestId);
    });
  });

  describe('ErrorCodes', () => {
    it('should have all expected error codes', () => {
      expect(ErrorCodes.BAD_REQUEST).toBe('BAD_REQUEST');
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCodes.RATE_LIMITED).toBe('RATE_LIMITED');
      expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ErrorCodes.DATABASE_ERROR).toBe('DATABASE_ERROR');
      expect(ErrorCodes.EXTERNAL_SERVICE_ERROR).toBe('EXTERNAL_SERVICE_ERROR');
    });
  });

  describe('unifiedErrorHandler', () => {
    const mockReq = {
      path: '/api/v1/versions/v123',
      method: 'GET',
    } as any;

    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;

    const mockNext = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle ApiError correctly', () => {
      const apiError = new ApiError(404, 'NOT_FOUND', 'Version not found');
      
      unifiedErrorHandler(apiError, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          code: 'NOT_FOUND',
          message: 'Version not found',
          requestId: expect.any(String),
          timestamp: expect.any(String),
          path: '/api/v1/versions/v123',
          method: 'GET',
        })
      );
    });

    it('should handle generic Error with not found message', () => {
      const error = new Error('Resource not found');
      
      unifiedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          code: 'NOT_FOUND',
          message: 'Resource not found',
        })
      );
    });

    it('should handle generic Error with unauthorized message', () => {
      const error = new Error('Unauthorized access');
      
      unifiedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          code: 'UNAUTHORIZED',
          message: 'Unauthorized access',
        })
      );
    });

    it('should handle generic Error with forbidden message', () => {
      const error = new Error('Forbidden');
      
      unifiedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          code: 'FORBIDDEN',
          message: 'Forbidden',
        })
      );
    });

    it('should handle SyntaxError as bad request', () => {
      const syntaxError = new SyntaxError('Unexpected token');
      
      unifiedErrorHandler(syntaxError, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          code: 'BAD_REQUEST',
          message: 'Invalid JSON format',
        })
      );
    });

    it('should handle unknown errors as internal error', () => {
      const error = new Error('Something went wrong');
      
      unifiedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        })
      );
    });
  });

  describe('notFoundHandler', () => {
    const mockReq = {
      path: '/api/v1/unknown',
      method: 'POST',
    } as any;

    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;

    const mockNext = vi.fn();

    it('should return 404 for unknown routes', () => {
      notFoundHandler(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          code: 'NOT_FOUND',
          message: 'Route POST /api/v1/unknown not found',
          requestId: expect.any(String),
          timestamp: expect.any(String),
          path: '/api/v1/unknown',
          method: 'POST',
        })
      );
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async function', async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);
      const wrapped = asyncHandler(mockFn);
      
      const mockReq = {} as any;
      const mockRes = {} as any;
      const mockNext = vi.fn();
      
      await wrapped(mockReq, mockRes, mockNext);
      
      expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass errors to next()', async () => {
      const error = new Error('Async error');
      const mockFn = vi.fn().mockRejectedValue(error);
      const wrapped = asyncHandler(mockFn);
      
      const mockReq = {} as any;
      const mockRes = {} as any;
      const mockNext = vi.fn();
      
      await wrapped(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
