export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const INVENTORY_LOG_API_ENDPOINTS = {
    INVENTORY_LOG: `${API_BASE_URL}/api/inventory/import`,
    IMPORT_DETAIL: (receiptCode: string) => `${API_BASE_URL}/api/inventory/import/${receiptCode}`,
    // Nhập kho cho phụ tùng đặt riêng đang chờ hàng (gắn với dòng báo giá)
    IMPORT_ORDER_ITEM: `${API_BASE_URL}/api/inventory/import/order-item`,
    SCAN_INVOICE: `${API_BASE_URL}/api/inventory/import/scan-invoice`,
};
