export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const PROFILE_API_ENDPOINTS = {
    GET_PROFILE: `${API_BASE_URL}/api/customer/profile`,
    UPDATE_PROFILE: `${API_BASE_URL}/api/customer/profile`,
    CHANGE_PASSWORD: `${API_BASE_URL}/api/customer/change-password`,
    GET_VEHICLES: `${API_BASE_URL}/api/customer/vehicle`,
    GET_PENDING_QUOTATIONS: `${API_BASE_URL}/api/customer/quotations/pending`,
    GET_QUOTATION_HISTORY: `${API_BASE_URL}/api/customer/quotations/history`,
    APPROVE_QUOTATION: (id: number) =>
        `${API_BASE_URL}/api/customer/quotations/${id}/approve`,
    REJECT_QUOTATION: (id: number) =>
        `${API_BASE_URL}/api/customer/quotations/${id}/reject`,
};
