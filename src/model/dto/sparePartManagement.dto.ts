export interface SparePartCategoryResponse {
    id: number;
    category_name: string
}
export interface SparePartResponse {
  id: number;
  sku: string;
  name: string;
  brand: string;
  stock_quantity: number;
  retail_price: number;
  warranty_km_limit: number;
  warranty_period_months: number;
  category: SparePartCategoryResponse;
}


export interface UpdateSparePartRequest {
  name: string;
  brand: string;
  retail_price: number;
  warranty_km_limit: number;
  warranty_period_months: number;
}