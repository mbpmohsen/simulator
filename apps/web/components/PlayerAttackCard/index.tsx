"use client";

import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { useState } from "react";
import { toast } from "sonner";
import { proxyClientVoteAction } from "@/server/api.ts";
import { useGameStore } from "@/store/gameState.store";

export default function PlayerAttackCard() {
    const { gameState, playerCode, teamCode } = useGameStore();

    const [selectedCode, setSelectedCode] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isVotingPhase = gameState?.current_phase === "voting";

    // Fixed: Handle null/undefined gameState.points safely
    const enemyTeam = gameState?.points
        ? Object.keys(gameState.points).find((team) => team !== teamCode)
        : undefined;

    const handleSubmit = async () => {
        if (!playerCode) {
            toast.error("کد بازیکن موجود نیست");
            return;
        }
        if (!selectedCode) {
            toast.warning("هیچ عملیاتی انتخاب نشده است");
            return;
        }
        // Fixed: Check if enemyTeam exists before submitting
        if (!enemyTeam) {
            toast.error("تیم حریف شناسایی نشد");
            return;
        }

        setIsSubmitting(true);
        try {
            const body = {
                code: selectedCode,
                target: enemyTeam,
                // black_market_item_code: null,
            };

            await proxyClientVoteAction(playerCode, body);

            toast.success("رأی ثبت شد", {
                description: "رأی شما با موفقیت ارسال شد",
            });

            setSelectedCode(null);
        } catch (err) {
            toast.error("خطا در ثبت عملیات", {
                description: err instanceof Error ? err.message : "خطای ناشناخته",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Fixed: Early return should check gameState properly
    if (!gameState) {
        return (
            <div
                dir="rtl"
                className="flex justify-center items-center min-h-[60vh] px-4"
            >
                <div className="text-center text-gray-400">
                    <p className="text-xl mb-2">در حال بارگذاری اطلاعات بازی...</p>
                    <p>لطفاً صبر کنید</p>
                </div>
            </div>
        );
    }

    // Fixed: Safely access nested properties with optional chaining and fallback
    const attacks = gameState.available_actions?.attack
        ? Object.entries(gameState.available_actions.attack)
        : [];

    const defenses = gameState.available_actions?.defense
        ? Object.entries(gameState.available_actions.defense)
        : [];

    // Fixed: Safe accessor function with null checks
    const getNameByCode = (code: string) => gameState.action_codes?.[code]?.[1] || "نامشخص";

    return (
        <div
            dir="rtl"
            className="w-full flex justify-center px-4 bg-black/40 backdrop-blur-sm pt-[83px] pb-[83px]"
        >
            <Card className="max-w-7xl w-full md:w-[1200px] bg-gray-900 border border-gray-700 shadow-xl rounded-xl overflow-hidden h-[calc(100vh-166px)] flex flex-col">
                <CardHeader className="pb-2 border-b border-gray-700 bg-gray-800/50 shrink-0">
                    <div className="flex justify-center items-center mt-3 mb-1">
                        <CardTitle className="text-green-400 text-xl font-bold tracking-wide">
                            انتخاب عملیات
                        </CardTitle>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-gray-900 to-gray-950">
                    <div className="space-y-10">
                        {/* Attack Section */}
                        {attacks.length > 0 && (
                            <section>
                                <h3 className="text-red-400 text-lg font-semibold mb-4 border-b border-red-900/50 pb-2">
                                    عملیات تهاجمی
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {attacks.map(([name, config]) => {
                                        // Fixed: Added null check for action_codes
                                        const code = gameState.action_codes
                                            ? Object.entries(gameState.action_codes).find(
                                                ([, [type, n]]) => type === "attack" && n === name,
                                            )?.[0]
                                            : undefined;

                                        if (!code) return null;

                                        const isSelected = selectedCode === code;

                                        return (
                                            <button
                                                type="button"
                                                key={code}
                                                onClick={() => setSelectedCode(code)}
                                                className={`
                          p-4 rounded-lg text-right transition-all border-2
                          ${
                                                    isSelected
                                                        ? "border-red-500 bg-red-950/70"
                                                        : "border-red-900/40 hover:border-red-700 bg-red-950/30 hover:bg-red-950/50"
                                                }
                        `}
                                            >
                                                <div className="font-bold text-red-300 mb-1">
                                                    {name}
                                                </div>
                                                <div className="text-sm text-gray-400">
                                                    احتمال: {config.probability ?? 0}% • هزینه: {config.cost ?? 0}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Defense Section */}
                        {defenses.length > 0 && (
                            <section>
                                <h3 className="text-blue-400 text-lg font-semibold mb-4 border-b border-blue-900/50 pb-2">
                                    عملیات دفاعی
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {defenses.map(([name, config]) => {
                                        // Fixed: Added null check for action_codes
                                        const code = gameState.action_codes
                                            ? Object.entries(gameState.action_codes).find(
                                                ([, [type, n]]) => type === "defense" && n === name,
                                            )?.[0]
                                            : undefined;

                                        if (!code) return null;

                                        const isSelected = selectedCode === code;

                                        return (
                                            <button
                                                type="button"
                                                key={code}
                                                onClick={() => setSelectedCode(code)}
                                                className={`
                          p-4 rounded-lg text-right transition-all border-2
                          ${
                                                    isSelected
                                                        ? "border-blue-500 bg-blue-950/70"
                                                        : "border-blue-900/40 hover:border-blue-700 bg-blue-950/30 hover:bg-blue-950/50"
                                                }
                        `}
                                            >
                                                <div className="font-bold text-blue-300 mb-1">
                                                    {name}
                                                </div>
                                                <div className="text-sm text-gray-400">
                                                    احتمال: {config.probability ?? 0}% • هزینه: {config.cost ?? 0}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {!attacks.length && !defenses.length && (
                            <div className="text-center py-12 text-gray-500">
                                هیچ عملیاتی برای انتخاب در دسترس نیست
                            </div>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="border-t border-gray-700 bg-gray-800/60 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                    <div className="text-sm text-gray-400">
                        نوبت {gameState.current_turn ?? 0} از {gameState.total_turns ?? 0} •{" "}
                        {Math.floor((gameState.remaining_time ?? 0) / 60)}:
                        {((gameState.remaining_time ?? 0) % 60).toString().padStart(2, "0")}{" "}
                        باقی‌مانده
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            disabled={isSubmitting}
                            onClick={() => setSelectedCode(null)}
                            className="border-gray-600 hover:bg-gray-700"
                        >
                            لغو انتخاب
                        </Button>

                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !selectedCode || !playerCode || !enemyTeam}
                            className="bg-green-600 hover:bg-green-700 min-w-[140px]"
                        >
                            {isSubmitting ? "در حال ارسال..." : "ثبت رأی"}
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
