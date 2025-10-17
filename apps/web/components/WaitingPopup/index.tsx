"use client";

import { motion } from "framer-motion";
import { Loader2, Zap, Shield, Cpu } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

interface WaitingPopupProps {
    message?: string;
    visible: boolean;
}

export default function WaitingPopup({ message = "در حال آماده‌سازی بازی...", visible }: WaitingPopupProps) {
    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="relative"
            >
                {/* Outer Glow Circle */}
                <motion.div
                    className="absolute inset-0 bg-green-600/30 rounded-full blur-3xl"
                    animate={{
                        opacity: [0.2, 0.4, 0.2],
                        scale: [1, 1.05, 1],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                    }}
                />

                {/* Card */}
                <Card
                    className={cn(
                        "relative border-2 border-green-600 bg-gradient-to-b from-zinc-900 via-black to-zinc-950 rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.2)] p-8 w-[360px]"
                    )}
                >
                    <CardContent className="flex flex-col items-center text-center gap-5 text-white">
                        {/* Animated Icon */}
                        <motion.div
                            className="flex items-center justify-center relative"
                            animate={{
                                rotate: [0, 360],
                            }}
                            transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                        >
                            <div className="absolute inset-0 rounded-full border border-green-700/50 animate-ping" />
                            <Loader2 className="w-14 h-14 text-green-500 animate-spin drop-shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
                        </motion.div>

                        {/* Title */}
                        <motion.h2
                            className="text-lg font-bold tracking-wide text-green-400"
                            animate={{ opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            {message}
                        </motion.h2>

                        {/* Cool animated status lights */}
                        <div className="flex items-center justify-center gap-3">
                            <motion.div
                                className="h-2 w-2 rounded-full bg-green-500"
                                animate={{ opacity: [0.2, 1, 0.2] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                            />
                            <motion.div
                                className="h-2 w-2 rounded-full bg-green-500"
                                animate={{ opacity: [0.2, 1, 0.2] }}
                                transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
                            />
                            <motion.div
                                className="h-2 w-2 rounded-full bg-green-500"
                                animate={{ opacity: [0.2, 1, 0.2] }}
                                transition={{ duration: 1.2, repeat: Infinity, delay: 0.6 }}
                            />
                        </div>

                        {/* Futuristic Status Text */}
                        <div className="flex items-center justify-center gap-2 text-xs text-green-300/80 font-mono">
                            <Zap className="w-4 h-4 text-green-500" />
                            <span>Loading core modules...</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-xs text-green-300/80 font-mono">
                            <Shield className="w-4 h-4 text-green-500" />
                            <span>Establishing secure connection...</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-xs text-green-300/80 font-mono">
                            <Cpu className="w-4 h-4 text-green-500" />
                            <span>Calibrating attack engine...</span>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
