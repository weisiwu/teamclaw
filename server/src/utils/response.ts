interface ApiResponse<T = unknown> {
  code: number;
  data: T | null;
  message: string;
}

export function success<T>(data: T, message = 'ok'): ApiResponse<T> {
  return { code: 0, data, message };
}

export function error(code: number, message: string): ApiResponse<null> {
  return { code, data: null, message };
}
