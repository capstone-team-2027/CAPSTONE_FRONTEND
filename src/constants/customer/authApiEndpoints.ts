export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const AUTH_API_ENDPOINTS = {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    LOGIN_GOOGLE: `${API_BASE_URL}/api/auth/google`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    CHECK_PHONE: `${API_BASE_URL}/api/auth/phone`,
    FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgot-password`,
};