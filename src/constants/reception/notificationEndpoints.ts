export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const NOTIFICATION_API_ENDPOINTS = {
    GET_NOTIFICATIONS: `${API_BASE_URL}/api/receptionist/notifications`,
    GET_NOTIFICATION_DETAIL: (id: string | number) => `${API_BASE_URL}/api/receptionist/notification/${id}`,
    MARK_AS_READ: (id: string | number) => `${API_BASE_URL}/api/receptionist/notification/${id}/read`,
    GET_UNREAD_COUNT: `${API_BASE_URL}/api/receptionist/notifications/unread-count`,
};
