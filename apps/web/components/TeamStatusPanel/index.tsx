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
import { useGameStore } from "@/store/gameState.store.ts";

type Player = {
    id: number;
    name: string;
    role: string;
    xp: number;
    icon: React.ReactNode;
    color: string;
};

const teamIcons = [
    <Mouse key="mouse" className="w-4 h-4" />,
    <Crown key="crown" className="w-4 h-4" />,
    <Network key="network" className="w-4 h-4" />,
    <User key="user" className="w-4 h-4" />,
    <Cpu key="cpu" className="w-4 h-4" />,
];

const enemyIcons = [
    <Gamepad2 key="gamepad" className="w-4 h-4" />,
    <Shield key="shield" className="w-4 h-4" />,
    <Skull key="skull" className="w-4 h-4" />,
];

const teamColors = [
    "text-cyan-400",
    "text-emerald-400",
    "text-blue-400",
    "text-gray-400",
    "text-teal-400",
];

const enemyColors = [
    "text-red-400",
    "text-rose-400",
    "text-orange-400",
];

export default function TeamStatusPanel() {
    const [team, setTeam] = useState<Player[]>([]);
    const [enemy, setEnemy] = useState<Player[]>([]);
    const { gameState } = useGameStore();

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

    useEffect(() => {
        if (!gameState) return;

        // Fixed: Safely check if required properties exist
        if (!gameState.side_credits || !gameState.teams) {
            console.warn("Missing side_credits or teams data in gameState");
            return;
        }

        try {
            // Fixed: Get team names safely with proper type checking
            const teamSides = Object.keys(gameState.teams);

            const newTeam = Object.entries(gameState.side_credits)
                .filter(([side]) => teamSides.includes(side))
                .map(([side, credits], index) => {
                    // Fixed: Safely get team name with fallback
                    const teamName = typeof gameState.teams[side] === 'string'
                        ? gameState.teams[side]
                        : side;

                    return {
                        id: index + 1,
                        name: teamName,
                        role: "Team Side",
                        xp: typeof credits === 'number' ? credits : 0,
                        icon: teamIcons[index % teamIcons.length],
                        color: teamColors[index % teamColors.length],
                    };
                });
            setTeam(newTeam);

            const newEnemy = Object.entries(gameState.side_credits)
                .filter(([side]) => !teamSides.includes(side))
                .map(([side, credits], index) => ({
                    id: index + 100, // Fixed: Use a different ID range to avoid conflicts
                    name: side,
                    role: "Enemy Side",
                    xp: typeof credits === 'number' ? credits : 0,
                    icon: enemyIcons[index % enemyIcons.length],
                    color: enemyColors[index % enemyColors.length],
                }));
            setEnemy(newEnemy);
        } catch (error) {
            console.error("Error processing gameState:", error);
        }
    }, [gameState]);

    const renderPlayers = (players: Player[], accent: string) => (
        <div className="space-y-1">
            <AnimatePresence>
                {players.map((p) => (
                    <motion.div
                        key={p.id} // Fixed: Use stable ID instead of crypto.randomUUID()
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: 0.05 }}
                        className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-md px-2 py-1"
                    >
                        <div className="flex items-center gap-2">
                            <span className={p.color}>{p.icon}</span>
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