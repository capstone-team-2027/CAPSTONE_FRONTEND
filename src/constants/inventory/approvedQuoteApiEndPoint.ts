export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const EXPORT_REQUEST_API_ENDPOINTS = {
    GET_REQUESTS: `${API_BASE_URL}/api/inventory/export-requests`,
    APPROVE: `${API_BASE_URL}/api/inventory/export-requests/approve`,
    REJECT: `${API_BASE_URL}/api/inventory/export-requests/reject`,
    GET_RECEIPT: (receiptCode: string) =>
        `${API_BASE_URL}/api/inventory/export-requests/${receiptCode}/receipt`,
    SIGN: (receiptCode: string) =>
        `${API_BASE_URL}/api/inventory/export-requests/${receiptCode}/sign`,
};
