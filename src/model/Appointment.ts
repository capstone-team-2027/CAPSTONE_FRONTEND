export interface AppointmentModel {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleYear?: number;
  hasServiceOrder?: boolean;
  serviceOrderId?: string;
  services: string[];
  appointmentDate: string;
  appointmentTime: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'information_received' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'expired';
  bookingType?: string;
  createdAt: string;
}
