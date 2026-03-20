/**
 * 统一 API 响应格式
 * 所有 API 路由应使用此工具函数确保响应格式一致
 */

export interface ApiSuccess<T = unknown> {
  code: 0;
  message: 'ok';
  data: T;
}

export interface ApiError {
  code: number; // HTTP 状态码
  message: string;
  data?: never;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

/**
 * 成功响应
 */
export function apiSuccess<T>(data: T): ApiSuccess<T> {
  return { code: 0, message: 'ok', data };
}

/**
 * 错误响应
 */
export function apiError(message: string, status = 500): ApiError {
  return { code: status, message };
}

/**
 * 便捷的 JSON 响应构造器
 */
export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(apiSuccess(data), init);
}

import { NextResponse } from 'next/server';
export { NextResponse };
