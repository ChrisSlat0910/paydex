export interface ApiError {
  code: string;
  message: string;
}

export interface ApiMeta {
  nextCursor?: string;
  hasMore?: boolean;
  total?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta: ApiMeta | null;
}

export type UserRole = 'admin' | 'developer';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  apiKeyId?: string;
}
