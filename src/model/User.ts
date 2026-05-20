export interface Role {
    id: number;
    name: string;
}

export interface User {
    id: number;
    fullName: string;
    email: string;
    phone: string;
    address?: string;
    avatarUrl?: string;
    role?: Role;
    createdAt?: string;
    updatedAt?: string;
}