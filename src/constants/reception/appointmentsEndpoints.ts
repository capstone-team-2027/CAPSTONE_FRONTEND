export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const APPOINTMENT_API_ENDPOINTS = {
    GET_APPOINTMENTS: `${API_BASE_URL}/api/receptionist/appointments`,
    GET_APPOINTMENT_DETAIL: (key: string) => `${API_BASE_URL}/api/receptionist/appointment/${key}`,
    RECEIVE_APPOINTMENT: (key: string) => `${API_BASE_URL}/api/receptionist/appointment/${key}/receive`,
    UPDATE_VIN: (key: string) => `${API_BASE_URL}/api/receptionist/appointment/${key}/vin`,
    CHECK_VEHICLE_INFO: (key: string) => `${API_BASE_URL}/api/receptionist/appointment/${key}/vehicle-info`,
};

export const SERVICE_ORDER_API_ENDPOINTS = {
    CREATE: `${API_BASE_URL}/api/receptionist/service-order`,
    GET_ALL: `${API_BASE_URL}/api/receptionist/service-orders`,
    GET_DETAIL: (id: string) => `${API_BASE_URL}/api/receptionist/service-order/${id}`,
    UPDATE_ODO: (id: string) => `${API_BASE_URL}/api/receptionist/service-order/${id}/odo`,
};

