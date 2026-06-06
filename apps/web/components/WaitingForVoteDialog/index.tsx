"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Clock, Users } from "lucide-react";
import { FC, useEffect, useState } from "react";

interface WaitingForVoteDialogProps {
    isOpen: boolean;
    waitTime?: number; // in seconds, default 30
}

const WaitingForVoteDialog: FC<WaitingForVoteDialogProps> = ({
                                                                 isOpen,
                                                                 waitTime = 30
                                                             }) => {
    const [timeLeft, setTimeLeft] = useState(waitTime);

    useEffect(() => {
        if (!isOpen) {
            setTimeLeft(waitTime);
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, waitTime]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={(e) => e.stopPropagation()}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        <Card className="w-full max-w-md border border-blue-500/30 bg-neutral-950 shadow-[0_0_25px_rgba(59,130,246,0.25)]">
                            <CardHeader className="text-center">
                                <div className="flex justify-center mb-4">
                                    <div className="relative">
                                        <Users size={64} className="text-blue-400" />
                                        <motion.div
                                            animate={{
                                                scale: [1, 1.1, 1],
                                                opacity: [0.4, 0.6, 0.4],
                                            }}
                                            transition={{
                                                duration: 3,
                                                repeat: Number.POSITIVE_INFINITY,
                                            }}
                                            className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl"
                                        />
                                    </div>
                                </div>
                                <CardTitle className="text-blue-400 text-2xl">
                                    منتظر رأی سایرین...
                                </CardTitle>
                                <CardDescription className="text-gray-300 text-base mt-2">
                                    لطفاً منتظر بمانید تا سایر بازیکنان رأی خود را ثبت کنند.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex flex-col items-center py-6 gap-4">
                                {/* Countdown Timer */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="relative">
                                        <motion.div
                                            key={timeLeft}
                                            initial={{ scale: 1.2, opacity: 0.8 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="text-4xl font-bold text-blue-300"
                                        >
                                            {formatTime(timeLeft)}
                                        </motion.div>
                                        <div className="absolute -inset-4 bg-blue-500/10 rounded-full blur-md" />
                                    </div>
                                    <p className="text-gray-400 text-sm">
                                        زمان باقی‌مانده
                                    </p>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full max-w-xs">
                                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: "100%" }}
                                            animate={{ width: `${(timeLeft / waitTime) * 100}%` }}
                                            transition={{ duration: 1 }}
                                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                                        />
                                    </div>
                                </div>

                                {/* Status Indicator */}
                                <div className="flex items-center gap-2 mt-2 px-4 py-2 bg-blue-900/20 rounded-lg border border-blue-700/30">
                                    <Clock size={16} className="text-blue-400" />
                                    <span className="text-blue-300 text-sm">
                    زمان انتظار: {waitTime} ثانیه
                  </span>
                                </div>
                            </CardContent>

                            {/* Animated Dots */}
                            <div className="flex justify-center pb-6">
                                <div className="flex gap-2">
                                    {[0, 1, 2].map((i) => (
                                        <motion.div
                                            key={i}
                                            animate={{
                                                scale: [1, 1.2, 1],
                                                opacity: [0.5, 1, 0.5],
                                            }}
                                            transition={{
                                                duration: 1.5,
                                                repeat: Number.POSITIVE_INFINITY,
                                                delay: i * 0.2,
                                            }}
                                            className="w-2 h-2 rounded-full bg-blue-400"
                                        />
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default WaitingForVoteDialog;
