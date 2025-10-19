"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
} from "@workspace/ui/components/card";
import {
	Shield,
	Mouse,
	Gamepad2,
	Crown,
	Cpu,
	Network,
	User,
	Skull,
} from "lucide-react";

type Player = {
	id: number;
	name: string;
	role: string;
	xp: number;
	icon: React.ReactNode;
	color: string;
};

const initialTeam: Player[] = [
	{
		id: 1,
		name: "نقی معمولی",
		role: "برنامه نویس",
		xp: 156,
		icon: <Mouse className="w-4 h-4" />,
		color: "text-cyan-400",
	},
	{
		id: 2,
		name: "محسن بابایی",
		role: "تیم لید",
		xp: 55,
		icon: <Crown className="w-4 h-4" />,
		color: "text-emerald-400",
	},
	{
		id: 3,
		name: "حسن احمدی",
		role: "شبکه",
		xp: 70,
		icon: <Network className="w-4 h-4" />,
		color: "text-blue-400",
	},
	{
		id: 4,
		name: "اصغر فرهادی",
		role: "کارمند",
		xp: 42,
		icon: <User className="w-4 h-4" />,
		color: "text-gray-400",
	},
	{
		id: 5,
		name: "محمد مهاجر",
		role: "کارشناس IT",
		xp: 110,
		icon: <Cpu className="w-4 h-4" />,
		color: "text-teal-400",
	},
];

const initialEnemy: Player[] = [
	{
		id: 6,
		name: "احمد احمدی",
		role: "لید گروه",
		xp: 150,
		icon: <Gamepad2 className="w-4 h-4" />,
		color: "text-red-400",
	},
	{
		id: 7,
		name: "فاطمه حسینی",
		role: "تحلیل‌گر",
		xp: 80,
		icon: <Shield className="w-4 h-4" />,
		color: "text-rose-400",
	},
	{
		id: 8,
		name: "محسن محسنی",
		role: "هکر",
		xp: 95,
		icon: <Skull className="w-4 h-4" />,
		color: "text-orange-400",
	},
];

export default function TeamStatusPanel() {
	const [team, setTeam] = useState(initialTeam);
	const [enemy, setEnemy] = useState(initialEnemy);

	// Simulate XP updates and player changes
	useEffect(() => {
		const interval = setInterval(() => {
			setTeam((prev) =>
				prev.map((p) => ({
					...p,
					xp: p.xp + Math.floor(Math.random() * 5),
				})),
			);

			setEnemy((prev) =>
				prev.map((p) => ({
					...p,
					xp: p.xp + Math.floor(Math.random() * 5),
				})),
			);
		}, 3000);

		return () => clearInterval(interval);
	}, []);

	const renderPlayers = (players: Player[], accent: string) => (
		<div className="space-y-1">
			<AnimatePresence>
				{players.map((p, i) => (
					<motion.div
						key={p.id}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0 }}
						transition={{ delay: i * 0.05 }}
						className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-md px-2 py-1"
					>
						<div className="flex items-center gap-2">
							{p.icon}
							<div className="flex flex-col leading-tight">
								<span className="text-sm text-gray-200">{p.name}</span>
								<span className={`text-[11px] ${p.color}`}>{p.role}</span>
							</div>
						</div>
						<span className={`text-xs font-mono ${accent}`}>{p.xp}</span>
					</motion.div>
				))}
			</AnimatePresence>
		</div>
	);

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.5 }}
			className="w-full max-w-sm mx-auto"
		>
			<Card className="bg-black text-white border border-neutral-800 shadow-xl">
				<CardHeader className="pb-1">
					<CardTitle className="text-teal-400 text-center text-lg">
						👥 نفرات تیم ({team.length} از 6)
					</CardTitle>
				</CardHeader>
				<CardContent>{renderPlayers(team, "text-cyan-400")}</CardContent>

				<div className="my-3 border-t border-neutral-800" />

				<CardHeader className="pb-1">
					<CardTitle className="text-red-400 text-center text-lg">
						☠️ نفرات دشمن ({enemy.length} از 6)
					</CardTitle>
				</CardHeader>
				<CardContent>{renderPlayers(enemy, "text-red-400")}</CardContent>
			</Card>
		</motion.div>
	);
}
