export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const SERVICE_API_ENDPOINTS = {
    // Categories
    GET_CATEGORIES: `${API_BASE_URL}/api/guest/service-categories`,
    GET_CATEGORIES_SHORT: `${API_BASE_URL}/api/guest/categories`,

    // Services (Catalogs)
    GET_SERVICES: `${API_BASE_URL}/api/guest/service-catalogs`,
    GET_SERVICES_SHORT: `${API_BASE_URL}/api/guest/services`,

    // Combos
    GET_COMBOS: `${API_BASE_URL}/api/guest/service-combos`,
    GET_COMBOS_SHORT: `${API_BASE_URL}/api/guest/combos`,
};
