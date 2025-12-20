export interface ApiResponse<T = unknown> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  message: string;
  code: number;
}

export function success<T>(data: T): ApiResponse<T> {
  return {
    data,
    error: null,
  };
}

export function error(message: string, code: number): ApiResponse<never> {
  return {
    data: null,
    error: {
      message,
      code,
    },
  };
}
