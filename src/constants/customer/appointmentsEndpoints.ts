export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const APPOINTMENT_API_ENDPOINTS = {
    GET_APPOINTMENTS: `${API_BASE_URL}/api/customer/appointment`,
    CREATE_APPOINTMENT: `${API_BASE_URL}/api/customer/appointment`,
    DELETE_APPOINTMENT: `${API_BASE_URL}/api/customer/appointment`,
    CANCEL_APPOINTMENT: `${API_BASE_URL}/api/customer/appointment/cancel`,
    ANALYZE_CAR_COLOR: `${API_BASE_URL}/api/customer/analyze-car-color`,
    GET_APPOINTMENT_VEHICLE: `${API_BASE_URL}/api/customer/appointment-vehicle`,
    CHECK_LICENSE_PLATE: `${API_BASE_URL}/api/guest/check-license-plate`,
};
