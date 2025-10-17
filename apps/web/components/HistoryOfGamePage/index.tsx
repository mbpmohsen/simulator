"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { Trophy, Flame, Shield } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";

interface Player {
    name: string;
    damagePercent: number;
    damageCount: number;
    rank: number;
}

export default function HistoryOfGamePage() {
    // mock data generation
    const redTeam = useMemo<Player[]>(
        () =>
            Array.from({ length: 5 }).map((_, i) => ({
                name: `بازیکن قرمز ${i + 1}`,
                damagePercent: Math.floor(Math.random() * 90) + 10,
                damageCount: Math.floor(Math.random() * 500) + 50,
                rank: i + 1,
            })),
        []
    );

    const blueTeam = useMemo<Player[]>(
        () =>
            Array.from({ length: 5 }).map((_, i) => ({
                name: `بازیکن آبی ${i + 1}`,
                damagePercent: Math.floor(Math.random() * 90) + 10,
                damageCount: Math.floor(Math.random() * 500) + 50,
                rank: i + 1,
            })),
        []
    );

    const redTotalRank = redTeam.reduce((acc, cur) => acc + cur.rank, 0);
    const blueTotalRank = blueTeam.reduce((acc, cur) => acc + cur.rank, 0);

    return (
        <div className="w-screen h-[calc(100svh-158px)] mt-20 bg-black text-white flex overflow-hidden p-6 gap-6">
            {/* Red Team */}
            <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="w-1/2 bg-gradient-to-br from-red-950 via-black to-red-900 rounded-2xl border border-red-700 p-6 shadow-lg"
            >
                <Card className="bg-transparent border-none text-white">
                    <CardHeader className="flex flex-col items-center gap-2">
                        <CardTitle className="text-red-400 flex items-center gap-2 text-xl">
                            <Flame className="h-5 w-5 text-red-500" />
                            تیم قرمز
                        </CardTitle>
                        <Badge variant="secondary" className="bg-red-600/30 text-red-300 flex items-center gap-1">
                            <Trophy className="h-4 w-4" /> مجموع رتبه: {redTotalRank}
                        </Badge>
                    </CardHeader>

                    <CardContent>
                        <table className="w-full border-collapse text-sm">
                            <thead className="text-red-300 border-b border-red-700">
                            <tr>
                                <th className="py-2 text-right">نام بازیکن</th>
                                <th className="py-2 text-center">درصد آسیب</th>
                                <th className="py-2 text-center">تعداد ضربه</th>
                                <th className="py-2 text-center">رتبه</th>
                            </tr>
                            </thead>
                            <tbody>
                            {redTeam.map((p) => (
                                <tr
                                    key={p.name}
                                    className="border-b border-red-900/50 hover:bg-red-900/20 transition"
                                >
                                    <td className="py-2 pr-2 text-right">{p.name}</td>
                                    <td className="py-2 text-center text-red-300">{p.damagePercent}%</td>
                                    <td className="py-2 text-center">{p.damageCount}</td>
                                    <td className="py-2 text-center font-bold text-yellow-300">{p.rank}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Blue Team */}
            <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="w-1/2 bg-gradient-to-br from-blue-950 via-black to-blue-900 rounded-2xl border border-blue-700 p-6 shadow-lg"
            >
                <Card className="bg-transparent border-none text-white">
                    <CardHeader className="flex flex-col items-center gap-2">
                        <CardTitle className="text-blue-400 flex items-center gap-2 text-xl">
                            <Shield className="h-5 w-5 text-blue-500" />
                            تیم آبی
                        </CardTitle>
                        <Badge variant="secondary" className="bg-blue-600/30 text-blue-300 flex items-center gap-1">
                            <Trophy className="h-4 w-4" /> مجموع رتبه: {blueTotalRank}
                        </Badge>
                    </CardHeader>

                    <CardContent>
                        <table className="w-full border-collapse text-sm">
                            <thead className="text-blue-300 border-b border-blue-700">
                            <tr>
                                <th className="py-2 text-right">نام بازیکن</th>
                                <th className="py-2 text-center">درصد آسیب</th>
                                <th className="py-2 text-center">تعداد ضربه</th>
                                <th className="py-2 text-center">رتبه</th>
                            </tr>
                            </thead>
                            <tbody>
                            {blueTeam.map((p) => (
                                <tr
                                    key={p.name}
                                    className="border-b border-blue-900/50 hover:bg-blue-900/20 transition"
                                >
                                    <td className="py-2 pr-2 text-right">{p.name}</td>
                                    <td className="py-2 text-center text-blue-300">{p.damagePercent}%</td>
                                    <td className="py-2 text-center">{p.damageCount}</td>
                                    <td className="py-2 text-center font-bold text-yellow-300">{p.rank}</td>
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
