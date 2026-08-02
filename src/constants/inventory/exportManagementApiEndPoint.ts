export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const EXPORT_LOG_API_ENDPOINTS = {
    EXPORT_LOG: `${API_BASE_URL}/api/inventory/export`,
    EXPORT_DETAIL: (receiptCode: string) =>
        `${API_BASE_URL}/api/inventory/export/${receiptCode}`,
};
