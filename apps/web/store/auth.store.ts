"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface AuthUser {
	id: number;
	username: string;
}

export interface AuthSuccessResponse {
	success: true;
	data: {
		user: AuthUser;
		token: string;
	};
	timestamp: number;
	schemaVersion: number;
}

export interface AuthErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
	};
	timestamp: number;
	schemaVersion: number;
}

export type AuthResponse = AuthSuccessResponse | AuthErrorResponse;

interface AuthStore {
	user: AuthUser | null;
	token: string | null;
	lastAuthResponse: AuthSuccessResponse | null;
	setAuthFromSuccess: (response: AuthSuccessResponse) => void;
	clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
	persist(
		(set) => ({
			user: null,
			token: null,
			lastAuthResponse: null,
			setAuthFromSuccess: (response) =>
				set({
					user: response.data.user,
					token: response.data.token,
					lastAuthResponse: response,
				}),
			clearAuth: () => set({ user: null, token: null, lastAuthResponse: null }),
		}),
		{
			name: "auth-storage",
			storage: createJSONStorage(() => localStorage),
		},
	),
);
