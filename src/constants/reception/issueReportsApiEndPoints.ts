  export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  export const ISSUE_REPORTS_ENDPOINTS = {
    ISSUES_REPORT: `${API_BASE_URL}/api/receptionist/issues`,
  }