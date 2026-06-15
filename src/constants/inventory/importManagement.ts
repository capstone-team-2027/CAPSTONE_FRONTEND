export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const INVENTORY_LOG_API_ENDPOINTS = {
    INVENTORY_LOG: `${API_BASE_URL}/api/inventory/import`,
};
