"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import LoginCard from "@/components/LoginCard";
import { getAdminToken, listAdminUsers, logoutAdmin } from "@/lib/game-plan";

interface AdminAuthContextValue {
	logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export const useAdminAuth = (): AdminAuthContextValue => {
	const value = useContext(AdminAuthContext);
	if (!value)
		throw new Error("useAdminAuth must be used inside AdminAuthGate.");
	return value;
};

export default function AdminAuthGate({ children }: { children: ReactNode }) {
	const [status, setStatus] = useState<
		"checking" | "anonymous" | "authenticated"
	>("checking");

	useEffect(() => {
		const token = getAdminToken();
		if (!token) {
			setStatus("anonymous");
			return;
		}

		let active = true;
		void listAdminUsers(token, 1)
			.then(() => {
				if (active) setStatus("authenticated");
			})
			.catch((error: unknown) => {
				const candidate = error as { response?: { status?: number } };
				const statusCode = candidate.response?.status;
				if (statusCode === 401 || statusCode === 403) logoutAdmin();
				if (active) setStatus("anonymous");
			});

		return () => {
			active = false;
		};
	}, []);

	const context = useMemo<AdminAuthContextValue>(
		() => ({
			logout: () => {
				logoutAdmin();
				setStatus("anonymous");
			},
		}),
		[],
	);

	if (status === "checking") {
		return (
			<div
				dir="rtl"
				className="grid min-h-screen place-items-center bg-[#060a14] text-sm text-cyan-200"
			>
				در حال بررسی نشست مدیریت…
			</div>
		);
	}

	if (status === "anonymous") {
		return <LoginCard onAuthenticated={() => setStatus("authenticated")} />;
	}

	return (
		<AdminAuthContext.Provider value={context}>
			{children}
		</AdminAuthContext.Provider>
	);
}
