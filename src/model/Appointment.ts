export interface AppointmentModel {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleYear?: number;
  vehicleMileage?: number;
  vinNumber?: string;
  hasServiceOrder?: boolean;
  serviceOrderId?: string;
  services: string[];
  appointmentDate: string;
  appointmentTime: string;
  serviceBay?: string;
  assignedStaff?: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  createdAt: string;
}
