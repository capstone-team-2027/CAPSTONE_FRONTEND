  export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Lễ tân xem báo giá (khung chat trả lời khách, xem tổng hợp thu cọc) và duyệt hộ các báo
  // giá mà kỹ thuật viên trưởng không tự duyệt tại chỗ được (khách không có mặt — lễ tân gọi
  // điện/gửi Zalo xác nhận rồi duyệt). Tạo/sửa báo giá vẫn thuộc kỹ thuật viên trưởng
  // (constants/technicianLeader/quoteManagementEndpoints.ts).
  export const QUOTE_MANAGEMENT_ENDPOINTS = {
    QUOTE_MANAGEMENT: `${API_BASE_URL}/api/receptionist/quote`,
    APPROVE_QUOTE: (id: number) => `${API_BASE_URL}/api/receptionist/quotation/${id}/approve`,
    GET_QUOTATION_BY_ID: (id: number) => `${API_BASE_URL}/api/receptionist/quotation/${id}`,
    PAYMENT_SUMMARY: (serviceOrderId: number) => `${API_BASE_URL}/api/receptionist/quote/service-order/${serviceOrderId}/payment-summary`,
  }
