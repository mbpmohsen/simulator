"use client";

import { parseApiError } from "@workspace/trpc";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
	ArrowLeft,
	KeyRound,
	LoaderCircle,
	LockKeyhole,
	ShieldCheck,
} from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { loginAdmin } from "@/lib/game-plan";

interface LoginCardProps {
	onAuthenticated: (token: string) => void;
}

export default function LoginCard({ onAuthenticated }: LoginCardProps) {
	const passwordId = useId();
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!password.trim()) {
			setError("رمز عبور مدیر را وارد کنید.");
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const token = await loginAdmin(password);
			onAuthenticated(token);
		} catch (loginError) {
			const parsed = parseApiError(loginError, "ورود مدیر ناموفق بود.");
			setError(
				parsed.status === 401 || parsed.status === 403
					? "رمز عبور مدیر صحیح نیست."
					: parsed.message,
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<main
			dir="rtl"
			className="grid min-h-screen place-items-center bg-[#070b17] px-4 py-10 text-slate-100"
		>
			<div className="w-full max-w-md">
				<div className="mb-5 flex items-center justify-center gap-2 text-xs text-cyan-300">
					<ShieldCheck className="size-4" /> پنل مدیریت شبیه‌ساز
				</div>
				<Card className="overflow-hidden border-white/10 bg-slate-950/75 text-slate-100 ">
					<CardHeader className="space-y-5 px-7 pb-3 pt-7">
						<div className="grid size-14 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
							<LockKeyhole className="size-7" />
						</div>
						<div>
							<CardTitle className="text-2xl font-black">
								ورود مدیر بازی
							</CardTitle>
							<p className="mt-2 text-sm leading-7 text-slate-400">
								برای پیکربندی بازی و انتخاب اعضای تیم‌ها ابتدا وارد شوید.
							</p>
						</div>
					</CardHeader>
					<CardContent className="px-7 pb-7">
						<form onSubmit={submit} className="space-y-5">
							<div className="space-y-2">
								<Label htmlFor={passwordId} className="text-slate-300">
									رمز عبور مدیر
								</Label>
								<div className="relative">
									<KeyRound className="absolute right-3 top-3 size-4 text-slate-500" />
									<Input
										id={passwordId}
										type="password"
										autoComplete="current-password"
										autoFocus
										value={password}
										onChange={(event) => setPassword(event.target.value)}
										placeholder="رمز عبور"
										className="h-12 border-white/10 bg-white/5 pr-10 text-slate-100 placeholder:text-slate-600 focus-visible:ring-cyan-400/40"
									/>
								</div>
							</div>
							{error && (
								<div
									role="alert"
									className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200"
								>
									{error}
								</div>
							)}
							<Button
								type="submit"
								disabled={busy}
								className="h-12 w-full bg-cyan-400 font-bold text-slate-950 hover:bg-cyan-300"
							>
								{busy ? (
									<LoaderCircle className="size-5 animate-spin" />
								) : (
									<ArrowLeft className="size-5" />
								)}
								{busy ? "در حال ورود…" : "ورود به پنل مدیریت"}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
