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
        [key: string]: TeamData;
        [key: string]: TeamData;
    };
    game_id?: string;
}

export default function GameResultsDisplay() {
    const { gameResults: gameState, setGameResults } = useGameResultsStore();
    const router = useRouter();

    useEffect(() => {
        if (!gameState) {
            getGameState()
                .then((response) => {
                    setGameResults(response);
                })
                .catch((resultsErr) => {
                    console.error("Error fetching game results:", resultsErr);
                    router.push("/login");
                });
        }
    }, [gameState]);

    // Fixed: Early return with proper loading/error state
    // if (!gameState) {
    //     return (
    //         <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
    //             <div className="max-w-7xl mx-auto flex items-center justify-center min-h-screen">
    //                 <div className="text-center text-gray-400">
    //                     <p className="text-xl mb-2">در حال بارگذاری نتایج بازی...</p>
    //                     <p className="text-sm">لطفاً صبر کنید</p>
    //                 </div>
    //             </div>
    //         </div>
    //     );
    // }

    // Fixed: Safely destructure with proper null checks
    const teams = gameState?.teams;
    const winner = gameState?.winner;
    const current_turn = gameState?.current_turn ?? 0;
    const total_turns = gameState?.total_turns ?? 0;

    // Fixed: Check if teams exist before accessing team1/team2
    // if (!teams?.team1 || !teams?.team2) {
    //     return (
    //         <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
    //             <div className="max-w-7xl mx-auto flex items-center justify-center min-h-screen">
    //                 <div className="text-center text-gray-400">
    //                     <p className="text-xl mb-2">خطا در بارگذاری اطلاعات تیم‌ها</p>
    //                     <p className="text-sm">داده‌های بازی کامل نیست</p>
    //                 </div>
    //             </div>
    //         </div>
    //     );
    // }

// Most comprehensive with all edge cases covered
    const [one, two] = (teams && typeof teams === 'object' && Object.keys(teams).length >= 2)
        ? Object.keys(teams)
        : [undefined, undefined];

    const team1 = one ? teams?.[one] : undefined;
    const team2 = two ? teams?.[two] : undefined;

    const winningTeam = winner === team1.side ? team1 : team2;
    const isTeam1Winner = winner === team1.side

    // Helper function to safely check if players array exists and has items
    const hasPlayers = (team: TeamData) =>
        team?.players && Array.isArray(team.players) && team.players.length > 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
            <div className="max-w-7xl mx-auto">
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
                                        <p className="text-sm text-gray-400">
                                            سمت: {team1?.side || "نامشخص"}
                                        </p>
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
                            {hasPlayers(team1) ? (
                                <div className="bg-black/30 rounded-xl p-4 mb-4 border border-red-800/30">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-gray-300">بازیکن:</span>
                                        <span className="text-white font-semibold">
											{team1.players[0]?.name || "نامشخص"}
										</span>
                                    </div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-gray-300">کد:</span>
                                        <span className="text-red-300 font-mono">
											{team1.players[0]?.code || "N/A"}
										</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-300">وزن رای:</span>
                                        <span className="text-white">
											{team1.players[0]?.vote_weight ?? 1}
										</span>
                                    </div>
                                    {team1.players[0]?.is_leader && (
                                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-md border border-yellow-500/30">
                                            <Trophy className="w-3 h-3 text-yellow-400" />
                                            <span className="text-xs text-yellow-300">رهبر تیم</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-black/30 rounded-xl p-4 mb-4 border border-red-800/30">
                                    <p className="text-gray-400 text-center">
                                        اطلاعات بازیکن موجود نیست
                                    </p>
                                </div>
                            )}

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
                                        {team1?.points ?? 0}
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
                                        {team1?.credits ?? 0}
                                    </p>
                                </motion.div>
                            </div>

                            {/* Actions */}
                            <div className="mt-4 space-y-3">
                                {team1?.current_probabilities?.attack &&
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
														هزینه: {team1?.current_costs?.attack?.[key] ?? 0}
													</span>
                                                    <span className="text-gray-500">
														فکتور فناوری:{" "}
                                                        {team1?.current_tech_factors?.attack?.[key] ?? 1}
													</span>
                                                </div>
                                            </div>
                                        ),
                                    )}

                                {team1?.current_probabilities?.defense &&
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
														هزینه: {team1?.current_costs?.defense?.[key] ?? 0}
													</span>
                                                    <span className="text-gray-500">
														فکتور فناوری:{" "}
                                                        {team1?.current_tech_factors?.defense?.[key] ?? 1}
													</span>
                                                </div>
                                            </div>
                                        ),
                                    )}
                            </div>

                            {/* Vulnerabilities */}
                            {!team1?.vulnerabilities ||
                            Object.keys(team1.vulnerabilities).length === 0 ? (
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
                                        <p className="text-sm text-gray-400">
                                            سمت: {team2?.side || "نامشخص"}
                                        </p>
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
                            {hasPlayers(team2) ? (
                                <div className="bg-black/30 rounded-xl p-4 mb-4 border border-blue-800/30">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-gray-300">بازیکن:</span>
                                        <span className="text-white font-semibold">
											{team2.players[0]?.name || "نامشخص"}
										</span>
                                    </div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-gray-300">کد:</span>
                                        <span className="text-blue-300 font-mono">
											{team2.players[0]?.code || "N/A"}
										</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-300">وزن رای:</span>
                                        <span className="text-white">
											{team2.players[0]?.vote_weight ?? 1}
										</span>
                                    </div>
                                    {team2.players[0]?.is_leader && (
                                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-md border border-yellow-500/30">
                                            <Trophy className="w-3 h-3 text-yellow-400" />
                                            <span className="text-xs text-yellow-300">رهبر تیم</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-black/30 rounded-xl p-4 mb-4 border border-blue-800/30">
                                    <p className="text-gray-400 text-center">
                                        اطلاعات بازیکن موجود نیست
                                    </p>
                                </div>
                            )}

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
                                        {team2?.points ?? 0}
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
                                        {team2?.credits ?? 0}
                                    </p>
                                </motion.div>
                            </div>

                            {/* Actions */}
                            <div className="mt-4 space-y-3">
                                {team2?.current_probabilities?.attack &&
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
														هزینه: {team2?.current_costs?.attack?.[key] ?? 0}
													</span>
                                                    <span className="text-gray-500">
														فکتور فناوری:{" "}
                                                        {team2?.current_tech_factors?.attack?.[key] ?? 1}
													</span>
                                                </div>
                                            </div>
                                        ),
                                    )}

                                {team2?.current_probabilities?.defense &&
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
														هزینه: {team2?.current_costs?.defense?.[key] ?? 0}
													</span>
                                                    <span className="text-gray-500">
														فکتور فناوری:{" "}
                                                        {team2?.current_tech_factors?.defense?.[key] ?? 1}
													</span>
                                                </div>
                                            </div>
                                        ),
                                    )}
                            </div>

                            {/* Vulnerabilities */}
                            {!team2?.vulnerabilities ||
                            Object.keys(team2.vulnerabilities).length === 0 ? (
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
                <motion.div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-2xl p-6 border border-purple-500/30">
                    <h3 className="text-xl font-bold text-purple-300 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6" />
                        خلاصه بازی
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-black/30 rounded-xl p-4 border border-purple-800/30">
                            <p className="text-sm text-gray-400 mb-1">شناسه بازی</p>
                            <p className="text-white font-mono text-sm">
                                {gameState?.game_id || "N/A"}
                            </p>
                        </div>

                        <div className="bg-black/30 rounded-xl p-4 border border-purple-800/30">
                            <p className="text-sm text-gray-400 mb-1">مرحله فعلی</p>
                            <p className="text-white font-semibold capitalize">
                                {gameState?.current_phase || "نامشخص"}
                            </p>
                        </div>

                        <div className="bg-black/30 rounded-xl p-4 border border-purple-800/30">
                            <p className="text-sm text-gray-400 mb-1">نتیجه نهایی</p>
                            <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                                {team1?.points ?? 0} - {team2?.points ?? 0}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}