export interface UserModel {
    id: number;
    fullName: string;
    email?: string;
    phoneNumber: string;
    avatar?: string;
    role?: string;
    createdAt?: string;
    updatedAt?: string;
}