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
import { Howl } from "howler";
import { Gamepad2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { proxyClientConnect, proxyClientGameState } from "@/server/api.ts";
import { useGameStore } from "@/store/gameState.store.ts";
import type { GameStateResponse } from "@/types/gameState.types.ts";

export default function LoginPage() {
	const { setGameState, setPlayerCode, playerCode } = useGameStore();
	const [step, setStep] = useState<"intro" | "playing" | "login" | "waiting">(
		"intro",
	);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const soundRef = useRef<Howl | null>(null);
	const router = useRouter();

	// Prepare sound once
	useEffect(() => {
		soundRef.current = new Howl({
			src: ["/sounds/640149main_Computers20are20in20Control.mp3"],
			onend: () => setStep("login"),
		});
	}, []);

	const handleStart = () => {
		const sound = soundRef.current;
		if (!sound) return;

		try {
			sound.play();
			setStep("playing");
			setTimeout(() => setStep("login"), 10000); // fallback timeout
		} catch (err) {
			console.warn("Autoplay blocked, skipping sound:", err);
			setStep("login");
		}
	};

	/** Connect player to the game API */
	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			const res = await proxyClientConnect(playerCode as string);

			console.log("✅ Connected:", res);
			setStep("waiting");
		} catch (err: any) {
			console.error("❌ Connection error:", err);
			setError(err.message || "Connection failed");
		} finally {
			setLoading(false);
		}
	}

	// Polling for game state when in waiting step
	useEffect(() => {
		if (step !== "waiting" || !playerCode) return;

		const interval = setInterval(async () => {
			try {
				const data = (await proxyClientGameState(
					playerCode as string,
				)) as GameStateResponse;

                setGameState(data as GameStateResponse);
				console.log("waiting for others to connect", data);
				if (data.current_phase !== "waiting for others to connect") {
					router.push("/");
				}
			} catch (err) {
				console.error("Polling error:", err);
			}
		}, 2000);

		return () => clearInterval(interval);
	}, [step, playerCode, router, setGameState]);

	return (
		<AnimatePresence mode="wait">
			{/* === Section 1: Intro === */}
			{step === "intro" && (
				<motion.div
					key="intro"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="w-svw h-svh flex flex-col items-center justify-center bg-black text-green-400"
				>
					<h1 className="text-6xl font-extrabold mb-8">بازی جنگ</h1>
					<Button
						variant="green"
						size="lg"
						onClick={handleStart}
						className="text-lg px-12 py-4 shadow-[0_0_20px_#22c55e] hover:shadow-[0_0_40px_#22c55e]"
					>
						شروع بازی <Gamepad2 className="ml-2" />
					</Button>
				</motion.div>
			)}

			{/* === Section 2: Music Playing === */}
			{step === "playing" && (
				<motion.div
					key="playing"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="w-svw h-svh flex items-center justify-center bg-black"
				>
					{/* Glowing rotating loader */}
					<motion.div
						className="relative w-32 h-32 flex items-center justify-center"
						initial={{ scale: 0.8, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{ duration: 0.6, ease: "easeOut" }}
					>
						<motion.div
							className="absolute inset-0 rounded-full border-4 border-green-500/30"
							animate={{ rotate: 360 }}
							transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
						/>
						<motion.div
							className="w-10 h-10 rounded-full bg-green-500 shadow-[0_0_40px_#22c55e]"
							animate={{
								scale: [1, 1.3, 1],
								opacity: [0.7, 1, 0.7],
							}}
							transition={{
								duration: 0.8,
								repeat: Infinity,
								ease: "easeInOut",
							}}
						/>
					</motion.div>
				</motion.div>
			)}

			{/* === Section 3: Login === */}
			{step === "login" && (
				<motion.div
					key="login"
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.6, ease: "easeOut" }}
					className="w-svw h-svh flex items-center justify-center bg-black text-white"
				>
					<Card className="w-full max-w-sm border border-green-500/30 bg-neutral-950 shadow-[0_0_25px_rgba(34,197,94,0.3)]">
						<CardHeader>
							<CardTitle className="text-green-500 text-center text-xl">
								ورود به نبرد!
							</CardTitle>
							<CardDescription className="text-center text-gray-400">
								برای ورود به بازی کد یکتای خود را وارد کنید.
							</CardDescription>
						</CardHeader>

						<CardContent>
							<form onSubmit={handleSubmit}>
								<div className="flex flex-col gap-6">
									<div className="grid gap-2">
										<Label htmlFor="playerCode">کد یکتا</Label>
										<Input
											type="text"
											placeholder="مثلاً 123456"
											required
											value={playerCode as string}
											onChange={(e) => setPlayerCode(e.target.value)}
											className="bg-black/60 border-green-700/50 text-green-400 focus:border-green-400"
										/>
									</div>
								</div>
							</form>
							{error && (
								<p className="text-red-400 text-sm mt-3 text-center">{error}</p>
							)}
						</CardContent>

						<CardFooter className="flex gap-2 mt-4">
							<Button
								onClick={handleSubmit}
								variant="green"
								className="flex-1"
								disabled={loading}
							>
								{loading ? "در حال اتصال..." : "ورود"}
							</Button>
							<Button
								variant="outline"
								className="flex-1 border-green-700/50 text-gray-300 hover:bg-green-900/20"
								onClick={() => setPlayerCode("")}
							>
								بیخیال
							</Button>
						</CardFooter>
					</Card>
				</motion.div>
			)}

			{/* === Section 4: Waiting for others === */}
			{step === "waiting" && (
				<motion.div
					key="waiting"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="w-svw h-svh flex flex-col items-center justify-center bg-black text-green-400"
				>
					<h2 className="text-4xl font-bold mb-4">در حال انتظار...</h2>
					<p className="text-xl mb-8">منتظر اتصال سایر بازیکنان هستیم</p>
					{/* Glowing rotating loader */}
					<motion.div
						className="relative w-32 h-32 flex items-center justify-center"
						initial={{ scale: 0.8, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{ duration: 0.6, ease: "easeOut" }}
					>
						<motion.div
							className="absolute inset-0 rounded-full border-4 border-green-500/30"
							animate={{ rotate: 360 }}
							transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
						/>
						<motion.div
							className="w-10 h-10 rounded-full bg-green-500 shadow-[0_0_40px_#22c55e]"
							animate={{
								scale: [1, 1.3, 1],
								opacity: [0.7, 1, 0.7],
							}}
							transition={{
								duration: 0.8,
								repeat: Infinity,
								ease: "easeInOut",
							}}
						/>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
