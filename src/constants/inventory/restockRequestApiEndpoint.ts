export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const RESTOCK_REQUEST_API_ENDPOINTS = {
    RESTOCK_REQUESTS: `${API_BASE_URL}/api/inventory/restock-requests`,
    RESOLVE: (id: number) => `${API_BASE_URL}/api/inventory/restock-requests/${id}/resolve`,
    SUMMARY: `${API_BASE_URL}/api/inventory/restock-requests/summary`,
    HISTORY: `${API_BASE_URL}/api/inventory/restock-requests/history`,
    EXPORT_EXCEL: `${API_BASE_URL}/api/inventory/restock-requests/export-excel`,
    IMPORT_EXCEL_PREVIEW: `${API_BASE_URL}/api/inventory/restock-requests/import-excel`,
    CONFIRM_IMPORT: `${API_BASE_URL}/api/inventory/restock-requests/confirm-import`,
};
