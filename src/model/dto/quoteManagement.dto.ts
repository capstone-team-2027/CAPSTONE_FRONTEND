export interface GetSparePartsResponse {
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
