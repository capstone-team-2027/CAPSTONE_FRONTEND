  export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  export const TASK_ASSIGNMENT_ENDPOINTS = {
    CREATE_QUOTATION: `${API_BASE_URL}/api/receptionist/quote`,
    GET_SPARE_PARTS: `${API_BASE_URL}/api/receptionist/spare-parts`,
  }