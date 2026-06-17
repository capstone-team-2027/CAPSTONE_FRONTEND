export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const NOTIFICATION_API_ENDPOINTS = {
    GET_NOTIFICATIONS: `${API_BASE_URL}/api/technician/notifications`,
    GET_UNREAD_COUNT: `${API_BASE_URL}/api/technician/notifications/unread-count`,
    MARK_ALL_AS_READ: `${API_BASE_URL}/api/technician/notifications/read-all`,
    MARK_AS_READ: (id: string | number) => `${API_BASE_URL}/api/technician/notifications/${id}/read`,
};
