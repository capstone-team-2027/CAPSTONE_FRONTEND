export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const TECHNICIAN_LEADER_TASK_ENDPOINTS = {
    GET_ALL_TASKS: `${API_BASE_URL}/api/head-technician/tasks`,
    GET_ALL_TECHNICIAN: `${API_BASE_URL}/api/head-technician/technicians`,
    ASSIGN_TASK: `${API_BASE_URL}/api/head-technician/assign`,
    GET_ASSIGNMENT_HISTORY: `${API_BASE_URL}/api/head-technician/assignments`,
    UPDATE_ASSIGNMENT: (assignmentId: number) =>
        `${API_BASE_URL}/api/head-technician/assignments/${assignmentId}`,
    COMPLETE_ASSIGNMENT: (assignmentId: number) =>
        `${API_BASE_URL}/api/head-technician/assignments/${assignmentId}/complete`,
    GET_TASK_TRACKING: `${API_BASE_URL}/api/head-technician/task-tracking`,
    GET_RECEIVED_APPOINTMENTS: `${API_BASE_URL}/api/head-technician/appointments`,
};