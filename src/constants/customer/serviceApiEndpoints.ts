export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const SERVICE_API_ENDPOINTS = {
    // Categories
    GET_CATEGORIES: `${API_BASE_URL}/api/guest/service-categories`,

    // Services (Catalogs)
    GET_SERVICES: `${API_BASE_URL}/api/guest/service-catalogs`,
    SEARCH_SERVICES: `${API_BASE_URL}/api/guest/service-catalogs/search`,
    GET_SERVICE_DETAIL: (id: number | string) => `${API_BASE_URL}/api/guest/service-catalogs/${id}`,

    // Combos
    GET_COMBOS: `${API_BASE_URL}/api/guest/service-combos`,
};
