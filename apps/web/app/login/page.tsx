"use client";

import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { AnimatePresence, motion } from "framer-motion";
import { Howl } from "howler";
import { useEffect, useState, useRef } from "react";

export default function LoginPage() {
	const [step, setStep] = useState<"intro" | "playing" | "login">("intro");
	const [playerCode, setPlayerCode] = useState("");
	const soundRef = useRef<Howl | null>(null);

	// prepare sound once
	useEffect(() => {
		soundRef.current = new Howl({
			src: ["/sounds/640149main_Computers20are20in20Control.mp3"],
			onend: () => {
				setStep("login");
			},
		});
	}, []);

	const handleStart = () => {
		const sound = soundRef.current;
		if (!sound) return;

		try {
			sound.play();
			setStep("playing");
			// fallback in case browser blocks sound or it takes too long
			setTimeout(() => setStep("login"), 10000); // force move after 10s
		} catch (err) {
			console.warn("Autoplay blocked, skipping sound:", err);
			setStep("login");
		}
	};

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		console.log("connectClient response:");
	}

	return (
		<AnimatePresence mode="wait">
			{/* === Section 1: Intro === */}
			{step === "intro" && (
				<motion.div
					key="intro"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="w-svw h-svh flex flex-col items-center justify-center"
				>
					<h1 className="text-6xl font-extrabold mb-8">بازی جنگ</h1>
					<Button
						variant="green"
						onClick={handleStart}
						className="text-lg px-8 py-4"
					>
						شروع بازی 🎮
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
						transition={{ duration: 0.6, ease: 'easeOut' }}
					>
						{/* Outer ring */}
						<motion.div
							className="absolute inset-0 rounded-full border-4 border-green-500/30"
							animate={{ rotate: 360 }}
							transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
						/>
						{/* Inner pulsing circle */}
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
					className="w-svw h-svh flex items-center justify-center"
				>
					<Card className="w-full max-w-sm">
						<CardHeader>
							<CardTitle className="text-green-600 text-center">
								ورود به نبرد!
							</CardTitle>
							<CardDescription className="text-center">
								برای ورود به بازی کد یکتای خود را وارد کنید.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleSubmit}>
								<div className="flex flex-col gap-6">
									<div className="grid gap-2">
										<Label htmlFor="email">کد یکتا</Label>
										<Input
											type="text"
											placeholder="123456"
											required
											value={playerCode}
											onChange={(e) => setPlayerCode(e.target.value)}
										/>
									</div>
								</div>
							</form>
						</CardContent>
						<CardFooter className="flex gap-2">
							<Button type="submit" variant="green" className="flex-1">
								ورود
							</Button>
							<Button variant="outline" className="flex-1">
								بیخیال
							</Button>
						</CardFooter>
					</Card>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
