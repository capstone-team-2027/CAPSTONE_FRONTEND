export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const APPOINTMENT_API_ENDPOINTS = {
    GET_APPOINTMENTS: `${API_BASE_URL}/api/receptionist/appointments`,
    GET_APPOINTMENT_DETAIL: (key: string) => `${API_BASE_URL}/api/receptionist/appointment/${key}`,
    RECEIVE_APPOINTMENT: (key: string) => `${API_BASE_URL}/api/receptionist/appointment/${key}/receive`,
};
