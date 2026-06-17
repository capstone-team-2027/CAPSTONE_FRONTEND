export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const VEHICLE_MAKE_MODEL_API_ENDPOINTS = {
    GET_VEHICLE_MAKES: `${API_BASE_URL}/api/guest/vehicle_make`,
    GET_VEHICLE_MODELS: `${API_BASE_URL}/api/guest/vehicle_model`,
};
