
export interface Parts {
    id: number;
    sku: string,
    name: string,
    brand?: string | null,
}
export interface Suppliers {
    id: number;
    name: string,
}
export interface Users{
    fullName: string;
}
export interface ImportSparePartResponse {
    id: number;
    type: string;
    receipt_code: string,
    createdAt: string
    quantity: number;
    unit_price: number;
    manager: Users;
    part: Parts;
    supplier: Suppliers;
}

// 1 phiếu nhập đã gom theo receipt_code (GET /import)
export interface ImportReceipt {
    receipt_code: string;
    imported_at: string;
    item_count: number;
    total_amount: number;
    manager_name: string;
}

// 1 dòng phụ tùng trong phiếu nhập (GET /import/:receiptCode)
export interface ImportDetailLine {
    id: number;
    receipt_code: string;
    createdAt: string;
    quantity: number;
    unit_price: number;
    part: Parts;
    supplier: Suppliers;
}

export interface ConflictPart {
  id: number;
  sku: string;
  name: string;
  brand?: string;
}

export interface ImportSparePartItemRequest {
  quantity: number;
  unit_price: number;
  retail_price?: number;
  part_id?: number;
  name?: string;
  brand?: string;
  category_id?: number;
  warranty_period_months?: number;
  warranty_km_limit?: number;
  force: boolean;
  // Dòng QuotationDetail đang WAITING_STOCK -> BE gắn spare_part_id và đổi
  // trạng thái sang PENDING sau khi nhập kho xong
  quotation_item_id?: number;
}

export interface ImportSparePartRequest {
  supplier_id: number;
  items: ImportSparePartItemRequest[];
}
