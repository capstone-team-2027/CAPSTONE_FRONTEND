export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const TECHNICAL_DOCUMENT_API_ENDPOINTS = {
    LIST_TECHNICAL_DOCUMENTS: `${API_BASE_URL}/api/admin/technical-documents`,
    CREATE_TECHNICAL_DOCUMENT: `${API_BASE_URL}/api/admin/technical-document`,
    DELETE_TECHNICAL_DOCUMENT: (id: number | string) => `${API_BASE_URL}/api/admin/technical-document/${id}`,
    LIST_VEHICLE_MAKES: `${API_BASE_URL}/api/admin/vehicle-makes`,
};
