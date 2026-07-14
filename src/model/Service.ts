import type { ReactNode } from 'react';

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
    icon?: ReactNode;
    price: string;
    numericPrice?: number;
    category?: string;
    categoryLabel?: string;
    image?: string;
    duration?: string;
    badge?: string;
    rating?: number;
    reviewCount?: number;
    details?: string[];
    originalPrice?: string;
    discountPercentage?: number;
    promoText?: string;
    category_id?: number;
    is_active?: boolean;
}

export interface ServiceCategoryInfo {
    id: number;
    category_name: string;
}

export interface ServiceDetailData {
    id: number;
    category_id: number;
    service_name: string;
    description: string;
    estimated_duration: number;
    is_active: boolean;
    category: ServiceCategoryInfo;
}

export interface ServiceDetailResponse {
    success: boolean;
    message: string;
    data: ServiceDetailData;
}

export interface ServiceSearchPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface ServiceSearchData {
    items: ServiceDetailData[];
    pagination: ServiceSearchPagination;
}

export interface ServiceSearchResponse {
    success: boolean;
    message: string;
    data: ServiceSearchData;
}
