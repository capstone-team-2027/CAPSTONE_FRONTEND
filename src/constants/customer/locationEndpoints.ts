export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const LOCATION_ENDPOINTS = {
    UPDATE_LOCATION: `${API_BASE_URL}/api/customer/location`,
    GET_ACTIVE_RESCUE: `${API_BASE_URL}/api/customer/rescue/active`,
};
