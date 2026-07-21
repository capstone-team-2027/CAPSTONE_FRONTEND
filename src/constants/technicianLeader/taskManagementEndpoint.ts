export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const TECHNICIAN_LEADER_TASK_ENDPOINTS = {
    // TODO: đổi lại cho khớp route BE
    GET_ALL_TASKS: `${API_BASE_URL}/api/head-technician/tasks`,
    GET_ALL_TECHNICIAN: `${API_BASE_URL}/api/head-technician/technicians`,
    ASSIGN_TASK: `${API_BASE_URL}/api/head-technician/assign`,
};