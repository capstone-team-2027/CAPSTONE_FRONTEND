export interface FeedbackModel {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  serviceOrderId?: string;
  category: FeedbackCategory;
  content: string;
  internalNotes?: string;
  receivedDate: string;
  receivedBy: string;
  status: 'new' | 'processing' | 'resolved' | 'closed';
}

export type FeedbackCategory =
  | 'service_quality'
  | 'staff_attitude'
  | 'facilities'
  | 'wait_time'
  | 'pricing'
  | 'other';

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  service_quality: 'Chất lượng dịch vụ',
  staff_attitude: 'Thái độ nhân viên',
  facilities: 'Cơ sở vật chất',
  wait_time: 'Thời gian chờ',
  pricing: 'Giá cả',
  other: 'Khác',
};
