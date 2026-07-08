export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const MY_SHIFTS_ENDPOINT = {
  GET_MY_SHIFTS: `${API_BASE_URL}/api/technician/shifts`,
};
