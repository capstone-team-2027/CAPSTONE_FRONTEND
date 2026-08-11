export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const LEADER_SERVICE_ORDER_API_ENDPOINTS = {
    CREATE: `${API_BASE_URL}/api/head-technician/service-order`,
    GET_DETAIL: (id: string) => `${API_BASE_URL}/api/head-technician/service-order/${id}`,
    CLOSE_EARLY: (id: string) => `${API_BASE_URL}/api/head-technician/service-order/${id}/close-early`,
};
