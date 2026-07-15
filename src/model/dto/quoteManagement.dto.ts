export interface GetAllSparePartsResponse {
  id: number;
  sku: string;
  name: string;
  brand: string;
  retail_price: number;
  stock_quantity: number;
}
export interface GetServicesResponse {
  id: number;
  service_name: string;
  labor_price: number;
}
export interface CreateQuotationItemRequest {
  issue_id?: number;
  spare_part_id?: number;
  service_id?: number;
  repair_price?: number;
  quantity: number;
}
export interface CreateQuotationRequest {
  task_id: number;
  items: CreateQuotationItemRequest[];
  note?: string;
}
export interface IssueHistoryUser{
    id: number;
    fullName: string | null;
    phoneNumber: string | null;
}
export interface IssueHistoryCustomer{
    id: number;
    name: string | null;
    phone: string | null;
    user?: IssueHistoryUser | null;
}
export interface IssueHistoryVehiclesModel{
    id: number;
    model_name: string;
}
export interface IssueHistoryVehicles{
    id: number;
    license_plate: string;
    color: string;
    model?: IssueHistoryVehiclesModel
    customer?: IssueHistoryCustomer | null;
}
export interface IssueHistoryServiceOrder{
    id: number;
    vehicle?: IssueHistoryVehicles | null;
}
export interface IssueHistoryTask{
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
export interface GetQuotationDetailResponse {
  id: number;
  quantity: number;
  unit_price: number;
  repair_price: number;
  amount: number;
  issue?: QuotationDetailIssue | null;
  sparePart: GetSparePartResponse | null;
  service_catalog: GetServicesResponse | null;
}
export interface GetQuotationResponse {
  id: number;
  task_id: number;
  created_by: number;
  updated_by?: number | null;
  total_amount: number;
  status: string;
  note?: string | null;
  approved_at?: string | null;
  createdAt: string;
  creator?: QuotationUserRef | null;
  updater?: QuotationUserRef | null;
  // Thông tin khách hàng & xe: task -> serviceOrder -> vehicle -> customer
  task?: QuotationTask | null;
  items: GetQuotationDetailResponse[];
}
