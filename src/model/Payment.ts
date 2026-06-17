export interface PaymentModel {
  id: string;
  invoiceId: string;
  serviceOrderId: string;
  customerId: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  vat: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  processedBy: string;
}

export interface InvoiceItem {
  name: string;
  type: 'service' | 'part';
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'ewallet';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Tiền mặt',
  card: 'Thẻ ngân hàng',
  transfer: 'Chuyển khoản',
  ewallet: 'Ví điện tử',
};
