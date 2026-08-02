export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const SERVICE_HISTORY_API_ENDPOINTS = {
    GET_SERVICE_HISTORY: `${API_BASE_URL}/api/customer/service-history`,
};
