export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const SERVICE_COMBOS_API_ENDPOINTS = {
  LIST: `${API_BASE_URL}/api/admin/serviceCombos`,
  CREATE: `${API_BASE_URL}/api/admin/serviceCombos`,
  DETAIL: (id: number | string) => `${API_BASE_URL}/api/admin/serviceCombos/${id}`,
  UPDATE: (id: number | string) => `${API_BASE_URL}/api/admin/serviceCombos/${id}`,
  DELETE: (id: number | string) => `${API_BASE_URL}/api/admin/serviceCombos/${id}`,
};
