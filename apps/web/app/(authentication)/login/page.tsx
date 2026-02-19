"use client";

import { Button } from "@workspace/ui/components/button.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card.tsx";
import { Input } from "@workspace/ui/components/input.tsx";
import { Label } from "@workspace/ui/components/label.tsx";
import { AnimatePresence, motion } from "framer-motion";
import { Shield, Swords } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { loginUser, signupUser } from "@/server/api.ts";
import {
	type AuthErrorResponse,
	type AuthSuccessResponse,
	useAuthStore,
} from "@/store/auth.store.ts";
import { useGameStore } from "@/store/gameState.store.ts";

type AuthMode = "signup" | "login";

const motionVariants = {
	enter: { opacity: 0, y: 20, scale: 0.98 },
	center: { opacity: 1, y: 0, scale: 1 },
	exit: { opacity: 0, y: -12, scale: 0.98 },
};

export default function LoginPage() {
	const router = useRouter();
	const [mode, setMode] = useState<AuthMode>("signup");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const { setAuthFromSuccess, token } = useAuthStore();
	const { setPlayerCode } = useGameStore();

	const title = useMemo(
		() => (mode === "signup" ? "ورود نیروهای جدید" : "بازگشت به میدان"),
		[mode],
	);

	useEffect(() => {
		if (token) {
			router.replace("/");
		}
	}, [router, token]);

	const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setErrorMessage(null);

		if (!username.trim() || !password.trim()) {
			setErrorMessage("نام کاربری و رمز عبور الزامی است.");
			return;
		}

		if (mode === "signup" && password !== confirmPassword) {
			setErrorMessage("تکرار رمز عبور با رمز عبور اصلی مطابقت ندارد.");
			return;
		}

		setIsLoading(true);

		try {
			const response = (mode === "signup"
				? await signupUser({ username: username.trim(), password })
				: await loginUser({ username: username.trim(), password })) as
				| AuthSuccessResponse
				| AuthErrorResponse;

			if (!response.success) {
				setErrorMessage(response.error.message);
				if (response.error.code === "USERNAME_TAKEN" && mode === "signup") {
					setMode("login");
				}
				return;
			}

			setAuthFromSuccess(response);
			setPlayerCode(String(response.data.user.id));
			toast.success(
				mode === "signup" ? "ثبت‌نام انجام شد." : "ورود با موفقیت انجام شد.",
			);
			router.replace("/");
		} catch (error) {
			const fallback =
				mode === "signup"
					? "خطا در ثبت‌نام. لطفا دوباره تلاش کنید."
					: "خطا در ورود. لطفا دوباره تلاش کنید.";
			setErrorMessage(
				error instanceof Error && error.message ? error.message : fallback,
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="relative min-h-screen overflow-hidden bg-[#08130f] text-[#f3f8f6]">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(38,160,109,0.35),transparent_38%),radial-gradient(circle_at_85%_15%,rgba(191,58,58,0.22),transparent_34%),linear-gradient(160deg,#030607_0%,#0a1311_56%,#121713_100%)]" />
			<div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(116,151,131,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(116,151,131,0.14)_1px,transparent_1px)] [background-size:36px_36px]" />

			<div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-10 sm:px-6">
				<motion.div
					initial={{ opacity: 0, y: 28 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.55, ease: "easeOut" }}
					className="grid overflow-hidden rounded-2xl border border-[#325647] bg-[#0f1a15]/90 shadow-[0_35px_120px_rgba(0,0,0,0.52)] lg:grid-cols-[1.2fr_1fr]"
				>
					<div className="relative border-b border-[#2a4238] p-6 sm:p-10 lg:border-b-0 lg:border-l">
						<motion.div
							animate={{ y: [0, -5, 0], opacity: [0.75, 1, 0.75] }}
							transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
							className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#3f7c65] bg-[#0c231a] px-4 py-2 text-xs tracking-wide text-[#9ccbb3]"
						>
							<Shield className="h-4 w-4" />
							سامانه شبیه‌ساز عملیات
						</motion.div>
						<h1 className="mb-3 text-3xl font-extrabold leading-tight text-[#eafaf1] sm:text-4xl">
							کنسول فرماندهی نبرد سایبری
						</h1>
						<p className="max-w-xl text-sm leading-7 text-[#b5cdbf] sm:text-base">
							برای ورود به اتاق عملیات، ابتدا حساب خود را ایجاد کنید یا با حساب
							موجود وارد شوید. اطلاعات ورود شما برای ادامه بازی ذخیره می‌شود.
						</p>
						<div className="mt-8 grid gap-3 sm:grid-cols-2">
							<div className="rounded-xl border border-[#385b4c] bg-[#12241d] p-4">
								<p className="text-xs text-[#97bba8]">وضعیت محیط</p>
								<p className="mt-2 text-lg font-bold text-[#dbf4e5]">Live Match</p>
							</div>
							<div className="rounded-xl border border-[#5f3f3f] bg-[#261313] p-4">
								<p className="text-xs text-[#cdacac]">سطح هشدار</p>
								<p className="mt-2 text-lg font-bold text-[#f4d9d9]">Condition RED</p>
							</div>
						</div>
					</div>

					<div className="p-6 sm:p-8">
						<Card className="border-[#304f42] bg-[#101a16] text-[#f0f8f4] shadow-none">
							<CardHeader className="space-y-4">
								<div className="flex items-center justify-between">
									<CardTitle className="text-xl">{title}</CardTitle>
									<Swords className="h-5 w-5 text-[#79b294]" />
								</div>
								<CardDescription className="text-[#a4beaf]">
									{mode === "signup"
										? "کاربر جدید بسازید و وارد شبیه‌ساز شوید."
										: "با حساب قبلی وارد بازی شوید."}
								</CardDescription>
								<div className="grid grid-cols-2 gap-2 rounded-lg bg-[#13241d] p-1">
									<Button
										type="button"
										onClick={() => setMode("signup")}
										className={
											mode === "signup"
												? "bg-[#2f7d5d] text-white hover:bg-[#2f7d5d]"
												: "bg-transparent text-[#a2bfaf] hover:bg-[#1e332a]"
										}
									>
										ثبت‌نام
									</Button>
									<Button
										type="button"
										onClick={() => setMode("login")}
										className={
											mode === "login"
												? "bg-[#2f7d5d] text-white hover:bg-[#2f7d5d]"
												: "bg-transparent text-[#a2bfaf] hover:bg-[#1e332a]"
										}
									>
										ورود
									</Button>
								</div>
							</CardHeader>

							<form onSubmit={handleAuth}>
								<CardContent className="space-y-4">
									<div className="grid gap-2">
										<Label htmlFor="username">نام کاربری</Label>
										<Input
											id="username"
											value={username}
											onChange={(e) => setUsername(e.target.value)}
											placeholder="player1"
											className="border-[#365748] bg-[#0b1511] text-[#e8f7ef] placeholder:text-[#799a8a]"
										/>
									</div>
									<div className="grid gap-2">
										<Label htmlFor="password">رمز عبور</Label>
										<Input
											id="password"
											type="password"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											placeholder="••••••••"
											className="border-[#365748] bg-[#0b1511] text-[#e8f7ef] placeholder:text-[#799a8a]"
										/>
									</div>

									<AnimatePresence initial={false}>
										{mode === "signup" && (
											<motion.div
												key="confirm-password"
												variants={motionVariants}
												initial="enter"
												animate="center"
												exit="exit"
												transition={{ duration: 0.25 }}
												className="grid gap-2"
											>
												<Label htmlFor="confirmPassword">تکرار رمز عبور</Label>
												<Input
													id="confirmPassword"
													type="password"
													value={confirmPassword}
													onChange={(e) => setConfirmPassword(e.target.value)}
													placeholder="••••••••"
													className="border-[#365748] bg-[#0b1511] text-[#e8f7ef] placeholder:text-[#799a8a]"
												/>
											</motion.div>
										)}
									</AnimatePresence>

									{errorMessage ? (
										<div className="rounded-md border border-[#8a3f3f] bg-[#2a1212] px-3 py-2 text-sm text-[#f3b5b5]">
											{errorMessage}
										</div>
									) : null}
								</CardContent>

								<CardFooter className="flex flex-col gap-3 pt-2">
									<Button
										type="submit"
										disabled={isLoading}
										className="w-full bg-[#348461] text-white hover:bg-[#3c9770]"
									>
										{isLoading
											? "در حال پردازش..."
											: mode === "signup"
												? "ایجاد حساب و ورود"
												: "ورود به بازی"}
									</Button>
									<p className="text-center text-xs text-[#8caa9a]">
										{mode === "signup"
											? "حساب دارید؟ از تب «ورود» استفاده کنید."
											: "کاربر جدید هستید؟ از تب «ثبت‌نام» استفاده کنید."}
									</p>
								</CardFooter>
							</form>
						</Card>
					</div>
				</motion.div>
			</div>
		</div>
	);
}
