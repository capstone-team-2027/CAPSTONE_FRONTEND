const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const RECEPTION_API = {
  APPOINTMENTS: `${BASE}/api/reception/appointments`,
  APPOINTMENT_DETAIL: (id: string) => `${BASE}/api/reception/appointments/${id}`,
  SERVICE_ORDERS: `${BASE}/api/reception/service-orders`,
  FEEDBACK: `${BASE}/api/reception/feedback`,
  SERVICE_HISTORY: (customerId: string) => `${BASE}/api/reception/customers/${customerId}/history`,
  PAYMENTS: `${BASE}/api/reception/payments`,
  QUOTES: `${BASE}/api/reception/quotes`,
  QUOTE_DETAIL: (id: string) => `${BASE}/api/reception/quotes/${id}`,
  QUOTE_APPROVE: (id: string) => `${BASE}/api/reception/quotes/${id}/approve`,
  QUOTE_REJECT: (id: string) => `${BASE}/api/reception/quotes/${id}/reject`,
};
