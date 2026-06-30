export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const APPROVED_QUOTE_API_ENDPOINTS = {
    APPROVED_QUOTES: `${API_BASE_URL}/api/inventory/approved-quote`,
    APPROVE_EXPORT: (quotationId: number) => `${API_BASE_URL}/api/inventory/export/${quotationId}/approve`,
};
