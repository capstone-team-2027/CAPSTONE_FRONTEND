export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const SERVICE_CATEGORY_API_ENDPOINTS = {
  LIST: `${API_BASE_URL}/api/admin/service-category`,
  CREATE: `${API_BASE_URL}/api/admin/service-category`,
  DETAIL: (id: number | string) => `${API_BASE_URL}/api/admin/service-category/${id}`,
  UPDATE: (id: number | string) => `${API_BASE_URL}/api/admin/service-category/${id}`,
  DELETE: (id: number | string) => `${API_BASE_URL}/api/admin/service-category/${id}`,
};
