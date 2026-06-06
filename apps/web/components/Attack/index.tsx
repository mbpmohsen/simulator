"use client";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { motion } from "framer-motion";
import { Crosshair, Flame, Shield, Zap } from "lucide-react";

type Attack = {
	name: string;
	damage: number;
	xp: number;
	cooldown: number;
	icon: React.ReactNode;
};

type PlayerCardProps = {
	playerName: string;
	rank: string;
	attacks: Attack[];
};

export default function PlayerAttackCard({
	playerName,
	rank,
	attacks,
}: PlayerCardProps) {
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			whileHover={{ scale: 1.02 }}
			transition={{ duration: 0.4 }}
			className="relative group"
		>
			{/* Glowing border effect */}
			<div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-green-400 via-emerald-500 to-lime-400 opacity-60 blur group-hover:opacity-100 transition duration-700"></div>

			<Card className="relative bg-black/90 border border-green-600/20 rounded-2xl text-white overflow-hidden shadow-[0_0_20px_rgba(0,255,100,0.15)]">
				<CardHeader className="pb-3">
					<div className="flex justify-between items-center">
						<CardTitle className="text-green-400 text-lg font-semibold tracking-wide">
							{playerName}
						</CardTitle>
						<span className="text-xs text-gray-400">{rank}</span>
					</div>
				</CardHeader>

				<CardContent className="space-y-3">
					{attacks.map((a, i) => (
						<motion.div
							key={a.name}
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: i * 0.1 }}
							className="flex justify-between items-center bg-neutral-900/70 border border-green-900/50 rounded-lg p-2"
						>
							<div className="flex items-center gap-2">
								{a.icon}
								<div>
									<p className="text-sm font-medium text-gray-200">{a.name}</p>
									<p className="text-[11px] text-gray-500">
										آسیب: {a.damage} | مکث: {a.cooldown} ثانیه
									</p>
								</div>
							</div>

							<div className="text-right w-20">
								<p className="text-xs text-green-400 font-mono">⚡ {a.xp}</p>
								<Progress
									value={Math.min(a.damage / 100, 1) * 100}
									className="h-1 mt-1 bg-green-500/20 [&>div]:bg-green-400"
								/>
							</div>
						</motion.div>
					))}
				</CardContent>
			</Card>
		</motion.div>
	);
}
