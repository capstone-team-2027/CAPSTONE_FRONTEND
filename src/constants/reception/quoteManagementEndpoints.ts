  export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  export const QUOTE_MANAGEMENT_ENDPOINTS = {
    QUOTE_MANAGEMENT: `${API_BASE_URL}/api/receptionist/quote`,
    APPROVE_QUOTE: (id: number) => `${API_BASE_URL}/api/receptionist/quotation/${id}/approve`,
    GET_SPARE_PARTS: `${API_BASE_URL}/api/receptionist/spare-parts`,
    GET_SERVICES :`${API_BASE_URL}/api/receptionist/services`,
  }