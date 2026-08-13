export interface GetAllSparePartsResponse {
  id: number;
  sku: string;
  name: string;
  brand: string;
  retail_price: number;
  stock_quantity: number;
  // Tồn thực tế trừ phần đã bị báo giá APPROVED giữ chỗ nhưng chưa xuất kho
  available_quantity: number;
}
export interface GetServicesResponse {
  id: number;
  service_name: string;
  labor_price: number;
}
export interface CreateQuotationItemRequest {
  issue_id?: number;
  spare_part_id?: number;
  custom_item_name?: string;
  service_id?: number;
  unit_price?: number;
  repair_price?: number;
  quantity: number;
}
export interface CreateQuotationRequest {
  // Một trong hai bắt buộc phải có: task_id (luồng cũ, issue gắn Task) hoặc service_order_id
  // (lỗi phát sinh không gắn Task — backend tự chọn 1 Task bất kỳ của đơn làm điểm neo).
  task_id?: number;
  service_order_id?: number;
  items: CreateQuotationItemRequest[];
  deposit_amount?: number;
  note?: string;
}
export interface IssueHistoryUser {
  id: number;
  fullName: string | null;
  phoneNumber: string | null;
}
export interface IssueHistoryCustomer {
  id: number;
  name: string | null;
  phone: string | null;
  user?: IssueHistoryUser | null;
}
export interface IssueHistoryVehiclesModel {
  id: number;
  model_name: string;
}
export interface IssueHistoryVehicles {
  id: number;
  license_plate: string;
  color: string;
  model?: IssueHistoryVehiclesModel
  customer?: IssueHistoryCustomer | null;
}
export interface IssueHistoryServiceOrder {
  id: number;
  symptoms?: string | null;
  vehicle?: IssueHistoryVehicles | null;
}
export interface IssueHistoryTask {
  id: number;
  status: string;
  serviceOrder?: IssueHistoryServiceOrder | null
}
export interface GetSparePartResponse {
  id: number;
  sku: string;
  name: string;
  brand: string;
  retail_price: number;
}
export interface QuotationUserRef {
  id: number;
  fullName: string | null;
}
export interface IssueComponentRef {
  id: number;
  name: string;
}
export interface IssueComponent {
  id: number;
  name: string;
  parent_id: number | null;
  parent?: IssueComponentRef | null;
  children?: IssueComponentRef[];
}
// Lỗi (issue) gắn với từng dòng detail của báo giá
export interface QuotationDetailIssue {
  id: number;
  error_description: string;
  note: string | null;
  component?: IssueComponent | null;
}
// Task của quotation: BE chỉ select ["id"], không có status
export interface QuotationTask {
  id: number;
  serviceOrder?: IssueHistoryServiceOrder | null;
}
// Phụ tùng đặt riêng tách khỏi Quotation_Details — sống ở bảng riêng với state machine
// riêng (WAITING_DEPOSIT -> WAITING_ARRIVAL -> READY_FOR_USE -> EXPORTED).
export interface CustomPartOrderDto {
  id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  actual_unit_price?: number | null;
  arrived_at?: string | null;
  status: "WAITING_DEPOSIT" | "WAITING_ARRIVAL" | "READY_FOR_USE" | "EXPORTED" | "CANCELLED";
}
export interface GetQuotationDetailResponse {
  id: number;
  quantity: number;
  unit_price: number;
  repair_price: number;
  amount: number;
  // custom_item_name không còn được ghi mới — dữ liệu thật của phụ tùng đặt riêng nằm ở
  // customPartOrder. Giữ field cũ optional để không vỡ code cũ chưa migrate xong.
  custom_item_name?: string | null;
  status?: string | null;
  issue?: QuotationDetailIssue | null;
  sparePart: GetSparePartResponse | null;
  service_catalog: GetServicesResponse | null;
  customPartOrder?: CustomPartOrderDto | null;
}
export interface GetQuotationResponse {
  id: number;
  task_id: number;
  created_by: number;
  updated_by?: number | null;
  total_amount: number;
  deposit_amount?: number;
  deposit_paid_at?: string | null;
  approval_method?: string | null;
  approved_phone?: string | null;
  status: string;
  note?: string | null;
  rejection_reason?: string | null;
  approved_at?: string | null;
  createdAt: string;
  creator?: QuotationUserRef | null;
  updater?: QuotationUserRef | null;
  // Thông tin khách hàng & xe: task -> serviceOrder -> vehicle -> customer
  task?: QuotationTask | null;
  items: GetQuotationDetailResponse[];
}

export interface RejectCustomerQuotationRequest {
  reason: string;
}

export interface CustomerQuotationActionResponse {
  message: string;
  data?: GetQuotationResponse;
}
