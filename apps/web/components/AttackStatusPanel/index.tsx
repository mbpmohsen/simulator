"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { Progress } from "@workspace/ui/components/progress";
import { Shield, Bug, Database } from "lucide-react";
import {useGameStore} from "@/store/gameState.store.ts";

type Attack = {
    category: string;
    name: string;
    short: string;
    current: number;
    target: number;
    xp: number;
    icon: React.ReactNode;
};

const icons = [
    <Database className="w-4 h-4 text-yellow-400" />,
    <Bug className="w-4 h-4 text-green-400" />,
    <Shield className="w-4 h-4 text-cyan-400" />,
    <Bug className="w-4 h-4 text-purple-400" />,
    <Shield className="w-4 h-4 text-orange-400" />,
];

export default function AttackStatusPanel() {
    const [attacks, setAttacks] = useState<Attack[]>([]);
    const [defenses, setDefenses] = useState<Attack[]>([]);
    const { gameState } = useGameStore();

    // simulate XP progression
    useEffect(() => {
        const interval = setInterval(() => {
            setAttacks((prev) =>
                prev.map((a) => ({
                    ...a,
                    current: Math.min(
                        a.target,
                        a.current + Math.floor(Math.random() * 2),
                    ),
                })),
            );
            setDefenses((prev) =>
                prev.map((a) => ({
                    ...a,
                    current: Math.min(
                        a.target,
                        a.current + Math.floor(Math.random() * 10),
                    ),
                })),
            );
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (gameState) {
            const attackEntries = Object.entries(gameState.available_actions.attack);
            const newAttacks = attackEntries.map(([name, data], index) => ({
                category: "ATTACKS",
                name,
                short: "",
                current: data.probability,
                target: 100,
                xp: data.cost * 1250,
                icon: icons[index % icons.length],
            }));
            setAttacks(newAttacks);

            const defenseEntries = Object.entries(gameState.available_actions.defense);
            const newDefenses = defenseEntries.map(([name, data], index) => ({
                category: "DEFENSES",
                name,
                short: "",
                current: data.probability,
                target: 100,
                xp: data.cost * 1250,
                icon: icons[(index + attackEntries.length) % icons.length],
            }));
            setDefenses(newDefenses);
        }
    }, [gameState]);
    const renderSection = (title: string, items: Attack[]) => (
        <div>
            <h3 className="text-xs text-gray-400 mb-2">{title}</h3>
            <div className="space-y-2">
                <AnimatePresence>
                    {items.map((a, i) => {
                        const progress = (a.current / a.target) * 100;
                        return (
                            <motion.div
                                key={a.name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-lg p-2"
                            >
                                <div className="flex items-center gap-2">
                                    {a.icon}
                                    <div>
                                        <p className="text-sm text-gray-200">
                                            {a.name}{" "}
                                            {a.short && (
                                                <span className="text-xs text-green-500">
                                        ({a.short})
                                     </span>
                                            )}
                                        </p>
                                        <p className="text-[11px] text-gray-500">
                                            {a.current} / {a.target}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-yellow-500 font-mono">
                                        ⚡ {a.xp.toLocaleString()}
                                    </p>
                                    <Progress
                                        value={progress}
                                        className={cn(
                                            "h-1 mt-1",
                                            progress >= 100 && "bg-green-500",
                                        )}
                                    />
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md mx-auto"
        >
            <Card className="bg-black text-white border border-neutral-800 shadow-xl">
                <CardHeader>
                    <CardTitle className="text-green-400 text-lg text-center">
                        Attack Progress Monitor
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {renderSection("ATTACKS", attacks)}
                    {renderSection("DEFENCES", defenses)}
                </CardContent>
            </Card>
        </motion.div>
    );
}