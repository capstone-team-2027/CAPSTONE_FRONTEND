export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const WAITING_STOCK_API_ENDPOINTS = {
    // Router BE khai báo "/inventory/waiting-stock" và được mount dưới prefix
    // "/api/inventory" nên đường dẫn thật bị lặp một đoạn "inventory".
    WAITING_STOCK_ITEMS: `${API_BASE_URL}/api/inventory/inventory/waiting-stock`,
    CONFIRM_ARRIVAL: (id: number) => `${API_BASE_URL}/api/inventory/custom-part-orders/${id}/confirm-arrival`,
    EXPORT_CUSTOM_PART: (id: number) => `${API_BASE_URL}/api/inventory/custom-part-orders/${id}/export`,
};
