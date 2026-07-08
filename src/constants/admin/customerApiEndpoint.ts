export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const CUSTOMER_API_ENDPOINTS = {
  LIST: `${API_BASE_URL}/api/admin/customer`,
  DETAIL: (id: number | string) => `${API_BASE_URL}/api/admin/customer/${id}`,
};
