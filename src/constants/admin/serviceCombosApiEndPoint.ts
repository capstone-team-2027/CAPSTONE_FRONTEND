export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const SERVICE_COMBOS_API_ENDPOINTS = {
  LIST_SERVICE_COMBOS: `${API_BASE_URL}/api/admin/service-combos`,
  SEARCH_SERVICE_COMBOS: `${API_BASE_URL}/api/admin/service-combos/search`,
  CREATE_SERVICE_COMBOS: `${API_BASE_URL}/api/admin/service-combos`,
  UPDATE_SERVICE_COMBOS: (id: number | string) => `${API_BASE_URL}/api/admin/service-combos/${id}`,
};
