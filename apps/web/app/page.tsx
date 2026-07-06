"use client";

import { createGameClientApi } from "@workspace/trpc";
import { LoaderCircle, Route } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { parseRuntimeApiError } from "@/lib/apiErrorParser";
import { loadRuntimeApiContext } from "@/lib/runtimeApiContext";
import { useAuthStore } from "@/store/auth.store";

const BASE_URL = process.env.NEXT_PUBLIC_CLIENT_URL ?? "";

export default function RuntimeGatewayPage() {
	const router = useRouter();
	const { token, clearAuth } = useAuthStore();
	const [hydrated, setHydrated] = useState(false);
	const [message, setMessage] = useState("در حال تشخیص نقش شما…");
	const api = useMemo(
		() =>
			createGameClientApi({
				baseURL: BASE_URL,
				headers: token ? { Authorization: `Bearer ${token}` } : undefined,
			}),
		[token],
	);

	useEffect(() => {
		setHydrated(useAuthStore.persist.hasHydrated());
		return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
	}, []);

	useEffect(() => {
		if (!hydrated) return;
		if (!token) {
			router.replace("/login");
			return;
		}
		let active = true;
		void loadRuntimeApiContext(api)
			.then((context) => {
				if (!active) return;
				router.replace(
					context.role === "GOVERNMENT" ? "/government" : "/player",
				);
			})
			.catch((error: unknown) => {
				if (!active) return;
				const parsed = parseRuntimeApiError(error, "تشخیص نقش ممکن نشد.");
				if (parsed.status === 401 || parsed.status === 403) {
					clearAuth();
					router.replace("/login");
					return;
				}
				setMessage("بازی فعالی پیدا نشد؛ ورود به داشبورد بازیکن…");
				router.replace("/player");
			});
		return () => {
			active = false;
		};
	}, [api, clearAuth, hydrated, router, token]);

	return (
		<main
			dir="rtl"
			className="grid min-h-screen place-items-center bg-[#070b17] p-6 text-slate-100"
		>
			<div className="text-center">
				<div className="mx-auto grid size-16 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
					<Route className="size-8" />
				</div>
				<LoaderCircle className="mx-auto mt-5 size-6 animate-spin text-cyan-300" />
				<p className="mt-3 text-sm text-slate-400">{message}</p>
			</div>
		</main>
	);
}
