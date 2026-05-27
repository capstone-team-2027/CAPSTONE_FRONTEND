export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const STAFF_MANAGEMENT_API_ENDPOINTS = {
    STAFF_MANAGEMENT: `${API_BASE_URL}/api/admin/staff`,
    GET_ROLE: `${API_BASE_URL}/api/admin/role`,
};