"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Clock, Trophy } from "lucide-react";
import type { FC } from "react";

interface TimeOverDialogProps {
    isOpen: boolean;
}

const TimeOverDialog: FC<TimeOverDialogProps> = ({ isOpen }) => {
    const router = useRouter();

    const handleSeeResults = () => {
        // Navigate to results page or show results
        router.push("/results");
    };

    const handleExit = () => {
        // Navigate to login page
        router.push("/login");
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
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                        <Card className="w-full max-w-md border border-red-500/30 bg-neutral-950 shadow-[0_0_25px_rgba(239,68,68,0.3)]">
                            <CardHeader className="text-center">
                                <div className="flex justify-center mb-4">
                                    <div className="relative">
                                        <Clock
                                            size={64}
                                            className="text-red-500"
                                        />
                                        <motion.div
                                            animate={{
                                                scale: [1, 1.2, 1],
                                                opacity: [0.5, 0.8, 0.5],
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: Number.POSITIVE_INFINITY,
                                            }}
                                            className="absolute inset-0 rounded-full bg-red-500/20 blur-xl"
                                        />
                                    </div>
                                </div>
                                <CardTitle className="text-red-500 text-2xl">
                                    زمان به پایان رسید!
                                </CardTitle>
                                <CardDescription className="text-gray-400 text-base mt-2">
                                    مرحله فعلی بازی تمام شده است.
                                    <br />
                                    می‌توانید نتایج را مشاهده کنید یا از بازی خارج
                                    شوید.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex justify-center py-6">
                                <div className="flex items-center gap-3 text-gray-300">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-red-500/50" />
                                    <Trophy size={20} className="text-red-400" />
                                    <span className="text-sm">پایان مرحله</span>
                                    <Trophy size={20} className="text-red-400" />
                                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-red-500/50" />
                                </div>
                            </CardContent>

                            <CardFooter className="flex gap-3">
                                <Button
                                    onClick={handleSeeResults}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                >
                                    مشاهده نتایج
                                </Button>
                                <Button
                                    onClick={handleExit}
                                    variant="outline"
                                    className="flex-1 border-red-700/50 text-gray-300 hover:bg-red-900/20"
                                >
                                    خروج از بازی
                                </Button>
                            </CardFooter>
                        </Card>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TimeOverDialog;