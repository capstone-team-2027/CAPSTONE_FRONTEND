export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const WARRANTY_POLICIES_API_ENDPOINTS = {
    LIST_WARRANTY_POLICIES: `${API_BASE_URL}/api/admin/warranty-policies`,
    CREATE_WARRANTY_POLICY: `${API_BASE_URL}/api/admin/warranty-policy`,
    UPDATE_WARRANTY_POLICY: (id: number | string) => `${API_BASE_URL}/api/admin/warranty-policy/${id}`,
};
