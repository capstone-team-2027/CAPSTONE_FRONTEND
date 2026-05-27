export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const SERVICE_BAYS_API_ENDPOINTS = {
  LIST: `${API_BASE_URL}/api/admin/serviceBays`,
  CREATE: `${API_BASE_URL}/api/admin/serviceBay`,
  UPDATE: (id: number | string) => `${API_BASE_URL}/api/admin/serviceBay/${id}`,
  DELETE: (id: number | string) => `${API_BASE_URL}/api/admin/serviceBay/${id}`,
};
