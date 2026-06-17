export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const GARAGE_CONFIG_API_ENDPOINTS = {
    GET_CONFIGURATIONS: `${API_BASE_URL}/api/guest/garage-configurations`,
    GET_CONFIGURATION_BY_KEY: (key: string) => `${API_BASE_URL}/api/guest/garage-configurations/${key}`,
    GET_AVAILABILITY: `${API_BASE_URL}/api/guest/availability`,
};
