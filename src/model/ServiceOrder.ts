export interface ServiceOrderModel {
  id: string;
  appointmentId: string;
  customerId: string;
  customerName: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleModel: string;
  services: ServiceItem[];
  checkInDate: string;
  notes?: string;
  status: 'created' | 'in_progress' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  category: string;
  price: number;
  selected?: boolean;
}
