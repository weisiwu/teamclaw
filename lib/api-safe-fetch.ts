/**
 * TeamClaw 安全 API 工具
 * 统一的 JSON 安全解析 + 友好错误提示
 * 解决：API 返回非 JSON 时前端 JSON.parse 崩溃
 */

export interface ApiError {
  message: string;
  code: number;
  errorCode?: string;
  isNetworkError?: boolean;
  isContentTypeError?: boolean;
  rawPreview?: string;
}

export interface ApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * Content-Type 检查 + JSON 安全解析
 */
async function safeParseResponse(res: Response): Promise<{ ok: boolean; data?: unknown; error?: ApiError }> {
  const contentType = res.headers.get("content-type") || "";
  const status = res.status;

  // 非 JSON 响应检查
  if (!contentType.includes("application/json")) {
    const text = await res.text().catch(() => "(无法读取响应)");
    return {
      ok: false,
      error: {
        message: `服务器返回了非 JSON 格式（${status}），请检查网络或联系管理员`,
        code: status,
        errorCode: "INVALID_CONTENT_TYPE",
        isContentTypeError: true,
        rawPreview: text.slice(0, 200),
      },
    };
  }

  const text = await res.text().catch(() => "");

  if (!text || text.trim() === "") {
    return {
      ok: false,
      error: {
        message: `服务器返回了空响应（${status}）`,
        code: status,
        errorCode: "EMPTY_RESPONSE",
      },
    };
  }

  try {
    const json = JSON.parse(text);
    return { ok: true, data: json };
  } catch {
    return {
      ok: false,
      error: {
        message: `服务器返回了无效的 JSON 格式（${status}）`,
        code: status,
        errorCode: "INVALID_JSON",
        rawPreview: text.slice(0, 200),
      },
    };
  }
}

/**
 * GET 请求
 */
export async function apiGet<T = unknown>(
  url: string,
  options?: { headers?: Record<string, string> }
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", ...options?.headers },
    });

    const parsed = await safeParseResponse(res);
    if (!parsed.ok) {
      if (res.status === 401) { handleUnauthorized(); }
      return { success: false, error: parsed.error };
    }

    const json = parsed.data as Record<string, unknown>;
    if (json.code !== 200 && json.code !== 0 && json.code !== undefined) {
      if (res.status === 401) { handleUnauthorized(); }
      return {
        success: false,
        error: {
          message: (json.message as string) || `请求失败（${res.status}）`,
          code: res.status,
          errorCode: (json.errorCode as string) || "SERVER_ERROR",
        },
      };
    }

    return { success: true, data: json.data as T };
  } catch (e) {
    const err = e as Error;
    return {
      success: false,
      error: {
        message: err.message?.includes("fetch")
          ? "网络连接失败，请检查网络或服务器状态"
          : err.message || "未知错误",
        code: 0,
        isNetworkError: true,
      },
    };
  }
}

/**
 * POST 请求
 */
export async function apiPost<T = unknown>(
  url: string,
  body: unknown,
  options?: { headers?: Record<string, string> }
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options?.headers,
      },
      body: JSON.stringify(body),
    });

    const parsed = await safeParseResponse(res);
    if (!parsed.ok) {
      if (res.status === 401) { handleUnauthorized(); }
      return { success: false, error: parsed.error };
    }

    const json = parsed.data as Record<string, unknown>;
    if (json.code !== 200 && json.code !== 0 && json.code !== undefined) {
      if (res.status === 401) { handleUnauthorized(); }
      return {
        success: false,
        error: {
          message: (json.message as string) || `请求失败（${res.status}）`,
          code: res.status,
          errorCode: (json.errorCode as string) || "SERVER_ERROR",
        },
      };
    }

    return { success: true, data: json.data as T };
  } catch (e) {
    const err = e as Error;
    return {
      success: false,
      error: {
        message: err.message?.includes("fetch")
          ? "网络连接失败，请检查网络或服务器状态"
          : err.message || "未知错误",
        code: 0,
        isNetworkError: true,
      },
    };
  }
}

/**
 * DELETE 请求
 */
export async function apiDelete<T = unknown>(
  url: string,
  options?: { headers?: Record<string, string> }
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Accept: "application/json", ...options?.headers },
    });

    const parsed = await safeParseResponse(res);
    if (!parsed.ok) {
      if (res.status === 401) { handleUnauthorized(); }
      return { success: false, error: parsed.error };
    }

    const json = parsed.data as Record<string, unknown>;
    if (json.code !== 200 && json.code !== 0 && json.code !== undefined) {
      if (res.status === 401) { handleUnauthorized(); }
      return {
        success: false,
        error: {
          message: (json.message as string) || `请求失败（${res.status}）`,
          code: res.status,
          errorCode: (json.errorCode as string) || "SERVER_ERROR",
        },
      };
    }

    return { success: true, data: json.data as T };
  } catch (e) {
    const err = e as Error;
    return {
      success: false,
      error: {
        message: err.message?.includes("fetch")
          ? "网络连接失败，请检查网络或服务器状态"
          : err.message || "未知错误",
        code: 0,
        isNetworkError: true,
      },
    };
  }
}

/**
 * PUT 请求
 */
export async function apiPut<T = unknown>(
  url: string,
  body: unknown,
  options?: { headers?: Record<string, string> }
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options?.headers,
      },
      body: JSON.stringify(body),
    });

    const parsed = await safeParseResponse(res);
    if (!parsed.ok) {
      if (res.status === 401) { handleUnauthorized(); }
      return { success: false, error: parsed.error };
    }

    const json = parsed.data as Record<string, unknown>;
    if (json.code !== 200 && json.code !== 0 && json.code !== undefined) {
      if (res.status === 401) { handleUnauthorized(); }
      return {
        success: false,
        error: {
          message: (json.message as string) || `请求失败（${res.status}）`,
          code: res.status,
          errorCode: (json.errorCode as string) || "SERVER_ERROR",
        },
      };
    }

    return { success: true, data: json.data as T };
  } catch (e) {
    const err = e as Error;
    return {
      success: false,
      error: {
        message: err.message?.includes("fetch")
          ? "网络连接失败，请检查网络或服务器状态"
          : err.message || "未知错误",
        code: 0,
        isNetworkError: true,
      },
    };
  }
}

/**
 * 友好错误消息展示
 * 用于在 UI 中显示不吓人的错误提示
 */
export function getFriendlyErrorMessage(error: ApiError): string {
  if (error.isNetworkError) {
    return "网络连接失败，请检查网络或稍后重试";
  }
  if (error.isContentTypeError) {
    return "服务器返回了意外格式，请联系管理员或稍后重试";
  }
  if (error.code === 401) return "登录已过期，请重新登录";
  if (error.code === 403) return "没有权限执行此操作";
  if (error.code === 404) return "请求的内容不存在";
  if (error.code === 500) return "服务器内部错误，请稍后重试";
  if (error.code === 503) return "服务暂时不可用，请稍后重试";
  return error.message || "请求失败，请稍后重试";
}

/**
 * 处理 401 认证失效，自动跳转登录页
 */
export function handleUnauthorized(): void {
  if (typeof window !== "undefined") {
    window.location.href = "/signin";
  }
}
