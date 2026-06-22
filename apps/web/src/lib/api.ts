// Legacy stub — browser-only app uses offlineStore directly.
export const API_ROOT = '';
export const API_BASE = '';

export const axiosInstance = {
  get: async () => ({ data: null }),
  post: async () => ({ data: null }),
  patch: async () => ({ data: null }),
  delete: async () => ({ data: null }),
};

export function getAuthToken(): string | null {
  return null;
}
