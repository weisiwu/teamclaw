interface ApiResponse<T = unknown> {
  code: number;
  data: T | null;
  message: string;
}

export function success<T>(data: T, message = 'ok'): ApiResponse<T> {
  return { code: 0, data, message };
}

export function error(code: number, message: string): ApiResponse<null>;
export function error(message: string): ApiResponse<null>;
export function error(codeOrMessage: number | string, message?: string): ApiResponse<null> {
  if (typeof codeOrMessage === 'string') {
    return { code: 500, data: null, message: codeOrMessage };
  }
  return { code: codeOrMessage, data: null, message: message ?? '' };
}
