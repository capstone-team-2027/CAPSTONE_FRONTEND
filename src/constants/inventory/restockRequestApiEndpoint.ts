export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const RESTOCK_REQUEST_API_ENDPOINTS = {
    RESTOCK_REQUESTS: `${API_BASE_URL}/api/inventory/restock-requests`,
    RESOLVE: (id: number) => `${API_BASE_URL}/api/inventory/restock-requests/${id}/resolve`,
};
