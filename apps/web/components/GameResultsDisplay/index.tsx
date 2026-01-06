// @ts-nocheck
"use client";

import { motion } from "framer-motion";
import {
	Award,
	Coins,
	Shield,
	Swords,
	Target,
	TrendingUp,
	Trophy,
	Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getGameState } from "@/server/api.ts";
import { useGameResultsStore } from "@/store/useGameResults.store.ts";

interface Player {
	name: string;
	code: string;
	is_leader: boolean;
	vote_weight: number;
}

interface TeamData {
	side: string;
	players: Player[];
	vulnerabilities: Record<string, any>;
	points: number;
	credits: number;
	current_probabilities: Record<string, any>;
	current_costs: Record<string, any>;
	current_tech_factors: Record<string, any>;
}

interface GameResults {
	current_phase: string;
	current_turn: number;
	total_turns: number;
	winner: string;
	teams: {
		team1: TeamData;
		team2: TeamData;
	};
	game_id?: string;
}

interface GameResultsDisplayProps {
	gameState: GameResults;
}

export default function GameResultsDisplay() {
	const { gameResults: gameState } = useGameResultsStore();
	const router = useRouter();
	const { setGameResults } = useGameResultsStore();

	useEffect( () => {
		if (!gameState) {
            getGameState().then((response) => {
                setGameResults(response);
            }).catch((resultsErr) => {
                console.error("Error fetching game results:", resultsErr);
                router.push("/login");
            })
		}
	}, []);

    if (!gameState) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
                <div className="max-w-7xl mx-auto">Empty</div>
            </div>
        );
    }
    const { teams, winner, current_turn, total_turns } = gameState as GameResults;
    const team1 = teams.team1;
    const team2 = teams.team2;
    const winningTeam = winner === "one" ? team1 : team2;
    const isTeam1Winner = winner === "one";

	// @ts-ignore
    return (
		<div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
			<div className="max-w-7xl mx-auto">
				{/* Winner Announcement */}
				{/*    <motion.div*/}
				{/*        initial={{ scale: 0, rotate: -180 }}*/}
				{/*        animate={{ scale: 1, rotate: 0 }}*/}
				{/*        transition={{ type: "spring", duration: 1, delay: 0.2 }}*/}
				{/*        className="text-center mb-12"*/}
				{/*    >*/}
				{/*        <motion.div*/}
				{/*            animate={{*/}
				{/*                scale: [1, 1.05, 1],*/}
				{/*                rotate: [0, 5, -5, 0]*/}
				{/*            }}*/}
				{/*            transition={{*/}
				{/*                duration: 2,*/}
				{/*                repeat: Infinity,*/}
				{/*                repeatType: "reverse"*/}
				{/*            }}*/}
				{/*            className="inline-block"*/}
				{/*        >*/}
				{/*            <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />*/}
				{/*        </motion.div>*/}
				{/*        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">*/}
				{/*            پایان بازی!*/}
				{/*        </h1>*/}
				{/*        <p className="text-2xl text-white mb-1">*/}
				{/*            🎊 تیم <span className={`font-bold ${isTeam1Winner ? 'text-red-400' : 'text-blue-400'}`}>*/}
				{/*  {winningTeam.players[0].name}*/}
				{/*</span> برنده شد! 🎊*/}
				{/*        </p>*/}
				{/*        <p className="text-gray-300">*/}
				{/*            دور {current_turn} از {total_turns}*/}
				{/*        </p>*/}
				{/*    </motion.div>*/}

				{/* Teams Comparison */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 mt-12">
					{/* Team 1 Card */}
					<motion.div
						initial={{ opacity: 0, x: -100 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.6, delay: 0.4 }}
						className={`relative overflow-hidden rounded-2xl ${
							isTeam1Winner
								? "bg-gradient-to-br from-red-900/40 to-red-950/40 border-2 border-red-500/50 shadow-[0_0_40px_-5px_rgba(239,68,68,0.5)]"
								: "bg-gradient-to-br from-red-900/20 to-red-950/20 border border-red-800/30"
						}`}
					>
						{isTeam1Winner && (
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
								className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-400/10 to-transparent rounded-full blur-3xl"
							/>
						)}

						<div className="relative p-6">
							<div className="flex items-center justify-between mb-6">
								<div className="flex items-center gap-3">
									<div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500">
										<Swords className="w-6 h-6 text-red-400" />
									</div>
									<div>
										<h2 className="text-2xl font-bold text-red-400">تیم اول</h2>
										<p className="text-sm text-gray-400">سمت: {team1.side}</p>
									</div>
								</div>
								{isTeam1Winner && (
									<motion.div
										animate={{ scale: [1, 1.2, 1] }}
										transition={{ duration: 1, repeat: Infinity }}
									>
										<Award className="w-10 h-10 text-yellow-400" />
									</motion.div>
								)}
							</div>

							{/* Player Info */}
							<div className="bg-black/30 rounded-xl p-4 mb-4 border border-red-800/30">
								<div className="flex items-center justify-between mb-2">
									<span className="text-gray-300">بازیکن:</span>
									<span className="text-white font-semibold">
                                        {/* @ts-ignore */}
										{team1.players[0].name}
									</span>
								</div>
								<div className="flex items-center justify-between mb-2">
									<span className="text-gray-300">کد:</span>
									<span className="text-red-300 font-mono">
                                        {/* @ts-ignore */}
										{team1.players[0].code}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-gray-300">وزن رای:</span>
									<span className="text-white">
                                        {/* @ts-ignore */}
										{team1.players[0].vote_weight}
									</span>
								</div>
                                {/* @ts-ignore */}
								{team1.players[0].is_leader && (
									<div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-md border border-yellow-500/30">
										<Trophy className="w-3 h-3 text-yellow-400" />
										<span className="text-xs text-yellow-300">رهبر تیم</span>
									</div>
								)}
							</div>

							{/* Stats Grid */}
							<div className="grid grid-cols-2 gap-3">
								<motion.div
									whileHover={{ scale: 1.05 }}
									className="bg-black/30 rounded-xl p-4 border border-red-800/30"
								>
									<div className="flex items-center gap-2 mb-2">
										<Target className="w-5 h-5 text-red-400" />
										<span className="text-sm text-gray-400">امتیاز</span>
									</div>
									<p className="text-3xl font-bold text-white">
										{team1.points}
									</p>
								</motion.div>

								<motion.div
									whileHover={{ scale: 1.05 }}
									className="bg-black/30 rounded-xl p-4 border border-red-800/30"
								>
									<div className="flex items-center gap-2 mb-2">
										<Coins className="w-5 h-5 text-yellow-400" />
										<span className="text-sm text-gray-400">اعتبار</span>
									</div>
									<p className="text-3xl font-bold text-yellow-300">
										{team1.credits}
									</p>
								</motion.div>
							</div>

							{/* Actions */}
							<div className="mt-4 space-y-3">
								{team1.current_probabilities.attack &&
									Object.entries(team1.current_probabilities.attack).map(
										([key, prob]) => (
											<div
												key={`attack-${key}`}
												className="bg-black/30 rounded-xl p-3 border border-red-800/30"
											>
												<div className="flex items-center justify-between mb-2">
													<span className="text-sm text-gray-400 flex items-center gap-1">
														<Zap className="w-4 h-4 text-orange-400" />
														حمله: {key}
													</span>
													<span className="text-xs text-gray-500">
														احتمال: {prob}%
													</span>
												</div>
												<div className="flex items-center justify-between text-xs">
													<span className="text-gray-500">
														هزینه: {team1.current_costs.attack[key]}
													</span>
													<span className="text-gray-500">
														فکتور فناوری:{" "}
														{team1.current_tech_factors.attack[key]}
													</span>
												</div>
											</div>
										),
									)}

								{team1.current_probabilities.defense &&
									Object.entries(team1.current_probabilities.defense).map(
										([key, prob]) => (
											<div
												key={`defense-${key}`}
												className="bg-black/30 rounded-xl p-3 border border-red-800/30"
											>
												<div className="flex items-center justify-between mb-2">
													<span className="text-sm text-gray-400 flex items-center gap-1">
														<Shield className="w-4 h-4 text-blue-400" />
														دفاع: {key}
													</span>
													<span className="text-xs text-gray-500">
														احتمال: {prob}%
													</span>
												</div>
												<div className="flex items-center justify-between text-xs">
													<span className="text-gray-500">
														هزینه: {team1.current_costs.defense[key]}
													</span>
													<span className="text-gray-500">
														فکتور فناوری:{" "}
														{team1.current_tech_factors.defense[key]}
													</span>
												</div>
											</div>
										),
									)}
							</div>

							{/* Vulnerabilities */}
							{Object.keys(team1.vulnerabilities).length === 0 ? (
								<div className="mt-4 bg-green-500/10 rounded-xl p-3 border border-green-500/30">
									<p className="text-sm text-green-400 text-center">
										✓ بدون آسیب‌پذیری
									</p>
								</div>
							) : (
								<div className="mt-4 bg-red-500/10 rounded-xl p-3 border border-red-500/30">
									<p className="text-sm text-red-400">آسیب‌پذیری‌ها:</p>
									{Object.entries(team1.vulnerabilities).map(([key, val]) => (
										<p key={key} className="text-xs text-gray-400 mt-1">
											{key}: {Array.isArray(val) ? val.join(", ") : val}
										</p>
									))}
								</div>
							)}
						</div>
					</motion.div>

					{/* Team 2 Card */}
					<motion.div
						initial={{ opacity: 0, x: 100 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.6, delay: 0.4 }}
						className={`relative overflow-hidden rounded-2xl ${
							!isTeam1Winner
								? "bg-gradient-to-br from-blue-900/40 to-blue-950/40 border-2 border-blue-500/50 shadow-[0_0_40px_-5px_rgba(59,130,246,0.5)]"
								: "bg-gradient-to-br from-blue-900/20 to-blue-950/20 border border-blue-800/30"
						}`}
					>
						{!isTeam1Winner && (
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
								className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-400/10 to-transparent rounded-full blur-3xl"
							/>
						)}

						<div className="relative p-6">
							<div className="flex items-center justify-between mb-6">
								<div className="flex items-center gap-3">
									<div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border-2 border-blue-500">
										<Shield className="w-6 h-6 text-blue-400" />
									</div>
									<div>
										<h2 className="text-2xl font-bold text-blue-400">
											تیم دوم
										</h2>
										<p className="text-sm text-gray-400">سمت: {team2.side}</p>
									</div>
								</div>
								{!isTeam1Winner && (
									<motion.div
										animate={{ scale: [1, 1.2, 1] }}
										transition={{ duration: 1, repeat: Infinity }}
									>
										<Award className="w-10 h-10 text-yellow-400" />
									</motion.div>
								)}
							</div>

							{/* Player Info */}
							<div className="bg-black/30 rounded-xl p-4 mb-4 border border-blue-800/30">
								<div className="flex items-center justify-between mb-2">
									<span className="text-gray-300">بازیکن:</span>
									<span className="text-white font-semibold">
										{team2.players[0].name}
									</span>
								</div>
								<div className="flex items-center justify-between mb-2">
									<span className="text-gray-300">کد:</span>
									<span className="text-blue-300 font-mono">
										{team2.players[0].code}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-gray-300">وزن رای:</span>
									<span className="text-white">
										{team2.players[0].vote_weight}
									</span>
								</div>
								{team2.players[0].is_leader && (
									<div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-md border border-yellow-500/30">
										<Trophy className="w-3 h-3 text-yellow-400" />
										<span className="text-xs text-yellow-300">رهبر تیم</span>
									</div>
								)}
							</div>

							{/* Stats Grid */}
							<div className="grid grid-cols-2 gap-3">
								<motion.div
									whileHover={{ scale: 1.05 }}
									className="bg-black/30 rounded-xl p-4 border border-blue-800/30"
								>
									<div className="flex items-center gap-2 mb-2">
										<Target className="w-5 h-5 text-blue-400" />
										<span className="text-sm text-gray-400">امتیاز</span>
									</div>
									<p className="text-3xl font-bold text-white">
										{team2.points}
									</p>
								</motion.div>

								<motion.div
									whileHover={{ scale: 1.05 }}
									className="bg-black/30 rounded-xl p-4 border border-blue-800/30"
								>
									<div className="flex items-center gap-2 mb-2">
										<Coins className="w-5 h-5 text-yellow-400" />
										<span className="text-sm text-gray-400">اعتبار</span>
									</div>
									<p className="text-3xl font-bold text-yellow-300">
										{team2.credits}
									</p>
								</motion.div>
							</div>

							{/* Actions */}
							<div className="mt-4 space-y-3">
								{team2.current_probabilities.attack &&
									Object.entries(team2.current_probabilities.attack).map(
										([key, prob]) => (
											<div
												key={`attack-${key}`}
												className="bg-black/30 rounded-xl p-3 border border-blue-800/30"
											>
												<div className="flex items-center justify-between mb-2">
													<span className="text-sm text-gray-400 flex items-center gap-1">
														<Zap className="w-4 h-4 text-orange-400" />
														حمله: {key}
													</span>
													<span className="text-xs text-gray-500">
														احتمال: {prob}%
													</span>
												</div>
												<div className="flex items-center justify-between text-xs">
													<span className="text-gray-500">
														هزینه: {team2.current_costs.attack[key]}
													</span>
													<span className="text-gray-500">
														فکتور فناوری:{" "}
														{team2.current_tech_factors.attack[key]}
													</span>
												</div>
											</div>
										),
									)}

								{team2.current_probabilities.defense &&
									Object.entries(team2.current_probabilities.defense).map(
										([key, prob]) => (
											<div
												key={`defense-${key}`}
												className="bg-black/30 rounded-xl p-3 border border-blue-800/30"
											>
												<div className="flex items-center justify-between mb-2">
													<span className="text-sm text-gray-400 flex items-center gap-1">
														<Shield className="w-4 h-4 text-blue-400" />
														دفاع: {key}
													</span>
													<span className="text-xs text-gray-500">
														احتمال: {prob}%
													</span>
												</div>
												<div className="flex items-center justify-between text-xs">
													<span className="text-gray-500">
														هزینه: {team2.current_costs.defense[key]}
													</span>
													<span className="text-gray-500">
														فکتور فناوری:{" "}
														{team2.current_tech_factors.defense[key]}
													</span>
												</div>
											</div>
										),
									)}
							</div>

							{/* Vulnerabilities */}
							{Object.keys(team2.vulnerabilities).length === 0 ? (
								<div className="mt-4 bg-green-500/10 rounded-xl p-3 border border-green-500/30">
									<p className="text-sm text-green-400 text-center">
										✓ بدون آسیب‌پذیری
									</p>
								</div>
							) : (
								<div className="mt-4 bg-red-500/10 rounded-xl p-3 border border-red-500/30">
									<p className="text-sm text-red-400 mb-1">آسیب‌پذیری‌ها:</p>
									{Object.entries(team2.vulnerabilities).map(([key, val]) => (
										<p key={key} className="text-xs text-gray-400 mt-1">
											• {key}: {Array.isArray(val) ? val.join(", ") : val}
										</p>
									))}
								</div>
							)}
						</div>
					</motion.div>
				</div>

				{/* Game Summary */}
				<motion.div
					// initial={{ opacity: 0, y: 50 }}
					// animate={{ opacity: 1, y: 0 }}
					// transition={{ duration: 0.6, delay: 0.8 }}
					className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-2xl p-6 border border-purple-500/30"
				>
					<h3 className="text-xl font-bold text-purple-300 mb-4 flex items-center gap-2">
						<TrendingUp className="w-6 h-6" />
						خلاصه بازی
					</h3>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="bg-black/30 rounded-xl p-4 border border-purple-800/30">
							<p className="text-sm text-gray-400 mb-1">شناسه بازی</p>
							<p className="text-white font-mono text-sm">
								{gameState.game_id || "N/A"}
							</p>
						</div>

						<div className="bg-black/30 rounded-xl p-4 border border-purple-800/30">
							<p className="text-sm text-gray-400 mb-1">مرحله فعلی</p>
							<p className="text-white font-semibold capitalize">
								{gameState.current_phase}
							</p>
						</div>

						<div className="bg-black/30 rounded-xl p-4 border border-purple-800/30">
							<p className="text-sm text-gray-400 mb-1">نتیجه نهایی</p>
							<p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
								{team1.points} - {team2.points}
							</p>
						</div>
					</div>
				</motion.div>
			</div>
		</div>
	);
}
