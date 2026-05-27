export interface Role {
    id: number,
    roleCode: string,
    roleName: string
}

export interface StaffManagement {
    id: number;
    fullName: string;
    phoneNumber: string;
    status: string;
    role: Role
}

