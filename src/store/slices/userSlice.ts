import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { UserModel } from "../../model/User";

export interface User {
    id: number;
    fullName: string;
    email?: string;
    phoneNumber: string;
    avatar: string;
    role: string;
}

interface UserState {
    user: UserModel | null;
    isAuthenticated: boolean;
}

const initialState: UserState = {
    user: null,
    isAuthenticated: false,
};

const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        loginSuccess: (state, action: PayloadAction<User>) => {
            state.user = action.payload;
            state.isAuthenticated = true;
        },
        logout: (state) => {
            state.user = null;
            state.isAuthenticated = false;
        },
    },
});

export const { loginSuccess, logout } = userSlice.actions;
export default userSlice.reducer;