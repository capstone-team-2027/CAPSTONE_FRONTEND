export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const LEADER_QUOTE_MANAGEMENT_ENDPOINTS = {
  GET_COMPONENTS: `${API_BASE_URL}/api/head-technician/components`,
  ACTIVE_TASKS_FOR_ISSUE_REPORT: `${API_BASE_URL}/api/head-technician/issue-report/tasks`,
  CREATE_ISSUE_REPORT: `${API_BASE_URL}/api/head-technician/issue-report`,
  CREATE_STANDALONE_ISSUE_REPORT: `${API_BASE_URL}/api/head-technician/issue-report/standalone`,
  GET_ALL_TECHNICIANS: `${API_BASE_URL}/api/head-technician/technicians`,
  ISSUES_REPORT: `${API_BASE_URL}/api/head-technician/issues`,
  QUOTE_MANAGEMENT: `${API_BASE_URL}/api/head-technician/quote`,
  APPROVE_QUOTE: (id: number) => `${API_BASE_URL}/api/head-technician/quotation/${id}/approve`,
  GET_QUOTATION_BY_ID: (id: number) => `${API_BASE_URL}/api/head-technician/quotation/${id}`,
  GET_SPARE_PARTS: `${API_BASE_URL}/api/head-technician/spare-parts`,
  GET_SERVICES: `${API_BASE_URL}/api/head-technician/services`,
  CREATE_RESTOCK_REQUEST: `${API_BASE_URL}/api/head-technician/restock-requests`,
};
