export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const HISTORY_API_ENDPOINTS = {
    GET_HISTORY: `${API_BASE_URL}/api/customer/history`
};
