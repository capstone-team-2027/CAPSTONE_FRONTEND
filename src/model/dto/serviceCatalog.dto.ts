export interface Category {
    id: number;
    category_name: string;
}

export interface ServiceCatalog {
    id: number;
    service_name: string;
    description?: string;
    estimated_duration: number;
    category_id: number;
    category: { category_name: string };
    is_active: boolean;
}
