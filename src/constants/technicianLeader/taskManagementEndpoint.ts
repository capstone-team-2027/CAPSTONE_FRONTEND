export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const TECHNICIAN_LEADER_TASK_ENDPOINTS = {
    // TODO: đổi lại cho khớp route BE
    GET_ALL_TASKS: `${API_BASE_URL}/api/head-technician/tasks`,
    GET_ALL_TECHNICIAN: `${API_BASE_URL}/api/head-technician/technicians`,
    ASSIGN_TASK: `${API_BASE_URL}/api/head-technician/assign`,
    // Nghiệm thu tổng thể (Final QC)
    GET_FINAL_QC_ORDERS: `${API_BASE_URL}/api/head-technician/quality-inspection`,
    APPROVE_FINAL_QC: (serviceOrderId: number) =>
        `${API_BASE_URL}/api/head-technician/final-inspection/${serviceOrderId}/approve`,
    REJECT_FINAL_QC: (serviceOrderId: number) =>
        `${API_BASE_URL}/api/head-technician/final-inspection/${serviceOrderId}/reject`,
};