export interface UserModel {
    id: number;
    fullName: string;
    phoneNumber: string;
    avatar?: string;
    role?: string;
    status?: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'BANNED';
    membershipTier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    loyaltyPoints?: number;
    totalSpent?: number;
    createdAt?: string;
    updatedAt?: string;
}