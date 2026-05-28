export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const SERVICE_CATALOG_API_ENDPOINTS = {
    SERVICE_CATALOG: `${API_BASE_URL}/api/admin/service-catalog`,
    SERVICE_CATEGORY: `${API_BASE_URL}/api/admin/service-categories`,
};