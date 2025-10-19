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
import { useEffect, useState } from "react";

export default function LoginPage() {
	const [showSectionTwo, setShowSectionTwo] = useState(false);
	const [playerCode, setPlayerCode] = useState("");

	useEffect(() => {
		const sound = new Howl({
			src: ["./sounds/640149main_Computers20are20in20Control.mp3"],
		});
		sound.play();
		sound.once("end", () => {
			setShowSectionTwo(true);
		});
	}, []);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		try {
			// const res = await connectMutation.mutateAsync({ player_code: playerCode });
			console.log("connectClient response:");
			// proceed on success (navigate, show UI, etc.)
		} catch (err) {
			console.error("connect failed", err);
		}
	}

	return (
		<AnimatePresence mode="wait">
			{!showSectionTwo ? (
				<motion.div
					key="section1"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 1 }}
					className="w-svw h-svh flex items-center justify-center"
				>
					<h1 className="scroll-m-20 text-center text-6xl font-extrabold tracking-tight text-balance">
						بازی جنگ
					</h1>
				</motion.div>
			) : (
				<motion.div
					key="section2"
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.5, ease: "easeOut" }}
					className="w-svw h-svh flex items-center justify-center"
				>
					<Card className="w-full max-w-sm">
						<CardHeader>
							<CardTitle className="text-green-600 text-center">
								ورود به نبرد!
							</CardTitle>
							<CardDescription>
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
