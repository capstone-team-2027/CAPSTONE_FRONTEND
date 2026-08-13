export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const STATISTICS_API_ENDPOINTS = {
  GET_STATS: (timeframe: string, startDate?: string, endDate?: string) => {
    let url = `${API_BASE_URL}/api/admin/statistics?timeframe=${timeframe}`;
    if (startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }
    return url;
  },
  GET_ADVANCED: `${API_BASE_URL}/api/admin/statistics/advanced`,
  GET_AI_HISTORY: `${API_BASE_URL}/api/admin/ai-analysis/history`,
  GET_AI_HISTORY_DETAIL: (id: number | string) => `${API_BASE_URL}/api/admin/ai-analysis/history/${id}`,
  DELETE_AI_HISTORY: (id: number | string) => `${API_BASE_URL}/api/admin/ai-analysis/history/${id}`,
};
