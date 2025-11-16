"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { Trophy, Flame, Shield } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";

interface Player {
	name: string;
	damagePercent: number;
	damageCount: number;
	rank: number;
}

export default function HistoryOfGamePage() {
	const redTeam = useMemo<Player[]>(
		() =>
			Array.from({ length: 5 }).map((_, i) => ({
				name: `بازیکن قرمز ${i + 1}`,
				damagePercent: Math.floor(Math.random() * 90) + 10,
				damageCount: Math.floor(Math.random() * 500) + 50,
				rank: i + 1,
			})),
		[],
	);

	const blueTeam = useMemo<Player[]>(
		() =>
			Array.from({ length: 5 }).map((_, i) => ({
				name: `بازیکن آبی ${i + 1}`,
				damagePercent: Math.floor(Math.random() * 90) + 10,
				damageCount: Math.floor(Math.random() * 500) + 50,
				rank: i + 1,
			})),
		[],
	);

	const redTotalRank = redTeam.reduce((acc, cur) => acc + cur.rank, 0);
	const blueTotalRank = blueTeam.reduce((acc, cur) => acc + cur.rank, 0);

	return (
		<div
			className="
				w-full h-[calc(100vh-166px)]
				mt-16 px-6
				text-white
				flex gap-6
				overflow-hidden
			"
		>
			{/* Red Team Card */}
			<motion.div
				initial={{ opacity: 0, x: -40 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.4 }}
				className="
					w-1/2
					bg-black/40 backdrop-blur-md
					border border-red-800/50
					rounded-xl shadow-[0_0_25px_-5px_#ff2a2a]
					overflow-hidden
					flex flex-col
				"
			>
				<Card className="bg-transparent border-none h-full flex flex-col">
					<CardHeader
						className="
							border-b border-red-900/50
							bg-gradient-to-l from-red-900/10 to-transparent
							text-center pt-6 pb-4
						"
					>
						<CardTitle className="text-red-400 text-xl flex justify-center items-center gap-2">
							<Flame className="h-5 w-5 text-red-500" />
							تیم قرمز
						</CardTitle>

						<Badge
							variant="secondary"
							className="bg-red-700/30 text-red-200 border border-red-800/40 flex items-center gap-1 mt-2"
						>
							<Trophy className="h-4 w-4" />
							مجموع رتبه: {redTotalRank}
						</Badge>
					</CardHeader>

					{/* Table body scrolls */}
					<CardContent className="p-0 overflow-auto flex-1">
						<table className="w-full text-sm">
							<thead className="bg-red-900/20 text-red-200 border-b border-red-800/40 sticky top-0 backdrop-blur-md">
							<tr>
								<th className="py-2 px-2 text-right">نام بازیکن</th>
								<th className="py-2 px-2 text-center">درصد آسیب</th>
								<th className="py-2 px-2 text-center">تعداد ضربه</th>
								<th className="py-2 px-2 text-center">رتبه</th>
							</tr>
							</thead>

							<tbody>
							{redTeam.map((p) => (
								<tr
									key={p.name}
									className="
											border-b border-red-900/30
											hover:bg-red-900/20 transition
										"
								>
									<td className="py-2 px-2 text-right">{p.name}</td>
									<td className="py-2 px-2 text-center text-red-300">
										{p.damagePercent}%
									</td>
									<td className="py-2 px-2 text-center">{p.damageCount}</td>
									<td className="py-2 px-2 text-center text-yellow-300 font-bold">
										{p.rank}
									</td>
								</tr>
							))}
							</tbody>
						</table>
					</CardContent>
				</Card>
			</motion.div>

			{/* Blue Team Card */}
			<motion.div
				initial={{ opacity: 0, x: 40 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.4 }}
				className="
					w-1/2
					bg-black/40 backdrop-blur-md
					border border-blue-800/50
					rounded-xl shadow-[0_0_25px_-5px_#2a87ff]
					overflow-hidden
					flex flex-col
				"
			>
				<Card className="bg-transparent border-none h-full flex flex-col">
					<CardHeader
						className="
							border-b border-blue-900/50
							bg-gradient-to-l from-blue-900/10 to-transparent
							text-center pt-6 pb-4
						"
					>
						<CardTitle className="text-blue-400 text-xl flex justify-center items-center gap-2">
							<Shield className="h-5 w-5 text-blue-500" />
							تیم آبی
						</CardTitle>

						<Badge
							variant="secondary"
							className="bg-blue-700/30 text-blue-200 border border-blue-800/40 flex items-center gap-1 mt-2"
						>
							<Trophy className="h-4 w-4" />
							مجموع رتبه: {blueTotalRank}
						</Badge>
					</CardHeader>

					<CardContent className="p-0 overflow-auto flex-1">
						<table className="w-full text-sm">
							<thead className="bg-blue-900/20 text-blue-200 border-b border-blue-800/40 sticky top-0 backdrop-blur-md">
							<tr>
								<th className="py-2 px-2 text-right">نام بازیکن</th>
								<th className="py-2 px-2 text-center">درصد آسیب</th>
								<th className="py-2 px-2 text-center">تعداد ضربه</th>
								<th className="py-2 px-2 text-center">رتبه</th>
							</tr>
							</thead>

							<tbody>
							{blueTeam.map((p) => (
								<tr
									key={p.name}
									className="
											border-b border-blue-900/30
											hover:bg-blue-900/20 transition
										"
								>
									<td className="py-2 px-2 text-right">{p.name}</td>
									<td className="py-2 px-2 text-center text-blue-300">
										{p.damagePercent}%
									</td>
									<td className="py-2 px-2 text-center">{p.damageCount}</td>
									<td className="py-2 px-2 text-center text-yellow-300 font-bold">
										{p.rank}
									</td>
								</tr>
							))}
							</tbody>
						</table>
					</CardContent>
				</Card>
			</motion.div>
		</div>
	);
}
