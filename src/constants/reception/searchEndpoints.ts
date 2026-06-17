const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const BASE_URL = `${API_BASE_URL}/api/receptionist`;

export const SEARCH_API_ENDPOINTS = {
    CUSTOMER_INFO_BY_PHONE: `${BASE_URL}/customer-info-by-phone`,
};