export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const PART_CATEGORY_API_ENDPOINTS = {
    PART_CATEGORY: `${API_BASE_URL}/api/inventory/part-category`,
};