import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { UserModel } from "../../model/User";

export type User = UserModel;

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
        loginSuccess: (state, action: PayloadAction<UserModel>) => {
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