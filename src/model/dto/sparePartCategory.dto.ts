export interface GetPartCategory  { 
    id: number,
    category_name: string,
    description: string,
    is_active: boolean;
}

export interface CreatePartCategory  { 
    category_name: string,
    description: string,
    is_active: boolean;
}

export interface UpdatePartCategory  { 
    id: number
    category_name: string,
    is_active: boolean;
    description: string,

}