export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const SHIFT_API_ENDPOINTS = {
    // Khung ca
    GET_SLOTS: `${API_BASE_URL}/api/admin/shift/slots`,
    CREATE_SLOT: `${API_BASE_URL}/api/admin/shift/slots`,
    UPDATE_SLOT: (id: number | string) => `${API_BASE_URL}/api/admin/shift/slots/${id}`,

    // Xếp ca
    GET_TEMPLATES: `${API_BASE_URL}/api/admin/shift/templates`,
    ASSIGN_SHIFT: `${API_BASE_URL}/api/admin/shift/templates/assign`,
    AUTO_GENERATE: `${API_BASE_URL}/api/admin/shift/templates/auto-generate`,
    CONFIRM_SCHEDULE: `${API_BASE_URL}/api/admin/shift/templates/confirm`
};
