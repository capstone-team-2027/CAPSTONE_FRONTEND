
export interface Parts {
    id: number;
    sku: string,
    name: string,
}
export interface Suppliers {
    id: number;
    name: string,
}
export interface Users{
    id: number;
    fullName: string;
}
export interface ImportResponse {
    id: number;
    type: string;
    receipt_code: string,
    createdAt: string
    quantity: number;
    unit_price: number;
    manager: { fullName: string };
    part: { sku: string , name: string };
    supplier: { name: string };
}

