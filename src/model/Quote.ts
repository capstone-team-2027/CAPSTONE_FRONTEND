export interface QuoteModel {
  id: string;
  serviceOrderId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  vehicleModel: string;
  services: QuoteServiceItem[];
  parts: QuotePartItem[];
  laborCost: number;
  partsCost: number;
  totalAmount: number;
  approvalNotes?: string;
  rejectionReason?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedDate?: string;
  createdAt: string;
}

export interface QuoteServiceItem {
  name: string;
  laborCost: number;
}

export interface QuotePartItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}
