export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const TASK_ASSIGNMENT_ENDPOINTS = {
    GET_MY_ASSIGNMENTS: `${API_BASE_URL}/api/technician/task-assignments`,
    GET_SERVICE_ORDER_DETAIL: (id: string | number) => `${API_BASE_URL}/api/technician/service-orders/${id}`,
    START_TASK: `${API_BASE_URL}/api/technician/task-assignments/start`,
    COMPLETE_TASK: `${API_BASE_URL}/api/technician/task-assignments/complete`,
    GET_MY_RESCUE: `${API_BASE_URL}/api/technician/rescue/my-active`,
    START_RESCUE: `${API_BASE_URL}/api/technician/rescue/start`,
    CREATE_QUOTATION: `${API_BASE_URL}/api/technician/quote`,
    ISSUES_REPORT: `${API_BASE_URL}/api/technician/issues`,
    GET_COMPONENTS: `${API_BASE_URL}/api/technician/component`,
    GET_REPORT_HISTORY: `${API_BASE_URL}/api/technician/component`,
    GET_SPARE_PARTS: `${API_BASE_URL}/api/technician/spare-parts`,
};
