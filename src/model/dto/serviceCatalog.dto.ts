export interface Category {
    id: number;
    category_name: string;
}

export interface ServiceCatalog {
    id: number;
    service_name: string;
    description: string;
    estimated_duration: number;
    category_id: number;
    category: { category_name: string };
    is_active: boolean;
    labor_price?: string | number;
    spare_part_id?: number | null;
    sparePart?: { id: number; name: string; retail_price: string };
    total_price?: number;
}
