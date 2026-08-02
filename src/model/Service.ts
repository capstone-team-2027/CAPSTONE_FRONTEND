export interface ServiceCombo {
    id: number;
    combo_name: string;
    category_id: number;
    service_ids: number[];
    discount_percentage: number;
    is_active: boolean;
    createdAt: string;
}

export interface ServiceItem {
    id: number;
    title: string;
    desc: string;
    price: string;
    numericPrice: number;
    badge?: string;
    rating: number;
    reviewCount: number;
    details?: string[];
    originalPrice?: string;
    discountPercentage?: number;
    promoText?: string;
    category_id?: number;
    sparePartName?: string;
}
