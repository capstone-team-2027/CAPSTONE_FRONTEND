export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const PROFILE_API_ENDPOINTS = {
    GET_PROFILE: `${API_BASE_URL}/api/customer/profile`,
    UPDATE_PROFILE: `${API_BASE_URL}/api/customer/profile`,
    CHANGE_PASSWORD: `${API_BASE_URL}/api/customer/change-password`,
    GET_VEHICLES: `${API_BASE_URL}/api/customer/vehicle`
};