import { API_BASE_URL } from '../../constants/customer/profileApiEndpoint';

export const RESTOCK_SUGGESTION_API_ENDPOINTS = {
  LIST: `${API_BASE_URL}/api/inventory/restock-suggestions`,
  AI_ANALYZE: `${API_BASE_URL}/api/inventory/restock-proposals/ai-analyze`,
  PROPOSALS_LIST: `${API_BASE_URL}/api/inventory/restock-proposals`,
  PROPOSAL_DETAIL: (id: number | string) => `${API_BASE_URL}/api/inventory/restock-proposals/${id}`,
};
