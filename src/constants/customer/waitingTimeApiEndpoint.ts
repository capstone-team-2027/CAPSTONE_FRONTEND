export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const WAITING_TIME_API_ENDPOINTS = {
    GET_WAITING_TIME: `${API_BASE_URL}/api/customer/waiting-time`,
    GET_REPAIR_PROGRESS: `${API_BASE_URL}/api/customer/repair-progress`
};
