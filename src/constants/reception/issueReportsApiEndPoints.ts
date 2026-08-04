  export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  export const ISSUE_REPORTS_ENDPOINTS = {
    // BE đã gộp danh sách lỗi INSPECTION + REPAIR chung vào endpoint này (GET /issues).
    ISSUES_REPORT: `${API_BASE_URL}/api/receptionist/issues`,
  }
