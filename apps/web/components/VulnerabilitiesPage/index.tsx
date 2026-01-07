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

export default function PlayerBlackMarketCard() {
    const { gameState, playerCode, teamCode } = useGameStore();

    const [selectedCode, setSelectedCode] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fixed: Handle null/undefined gameState.points safely
    const enemyTeam = gameState?.points
        ? Object.keys(gameState.points).find((team) => team !== teamCode)
        : undefined;

    console.log("gameState", gameState?.black_market_items)
    const isVotingPhase = gameState?.current_phase === "voting";

    const handleSubmit = async () => {
        if (!playerCode) {
            toast.error("کد بازیکن موجود نیست");
            return;
        }
        if (!selectedCode) {
            toast.warning("هیچ آیتمی انتخاب نشده است");
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
                black_market_item_code: selectedCode,
                target: enemyTeam,
            };

            await proxyClientVoteAction(playerCode, body);

            toast.success("خرید ثبت شد", {
                description: "رأی شما برای خرید با موفقیت ارسال شد",
            });

            setSelectedCode(null);
        } catch (err) {
            toast.error("خطا در ثبت خرید", {
                description: err instanceof Error ? err.message : "خطای ناشناخته",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!gameState) {
        return (
            <div
                dir="rtl"
                className="flex justify-center items-center min-h-[60vh] px-4"
            >
                <div className="text-center text-gray-400">
                    <p className="text-xl mb-2">
                        در حال حاضر زمان خرید از بازار سیاه نیست
                    </p>
                    {/* @ts-ignore */}
                    <p>فاز فعلی: {gameState?.current_phase || "نامشخص"}</p>
                </div>
            </div>
        );
    }

    // Fixed: Safely access black_market_items with fallback
    const items = gameState.black_market_items || [];

    // Fixed: Added null checks for black_market_item_codes
    const getCodeByName = (name: string) => {
        if (!gameState.black_market_item_codes) return undefined;

        return Object.entries(gameState.black_market_item_codes).find(
            ([, [type, n]]) => type === "black_market" && n === name,
        )?.[0];
    };

    return (
        <div
            dir="rtl"
            className="w-full flex justify-center px-4 bg-black/40 backdrop-blur-sm pt-[83px] pb-[83px]"
        >
            <Card className="max-w-7xl w-full md:w-[1200px] bg-gray-900 border border-gray-700 shadow-xl rounded-xl overflow-hidden h-[calc(100vh-166px)] flex flex-col">
                <CardHeader className="pb-2 border-b border-gray-700 bg-gray-800/50 shrink-0">
                    <div className="flex justify-center items-center mt-3 mb-1">
                        <CardTitle className="text-purple-400 text-xl font-bold tracking-wide">
                            بازار سیاه
                        </CardTitle>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-gray-900 to-gray-950">
                    <div className="space-y-10">
                        {/* Black Market Items Section */}
                        {items.length > 0 ? (
                            <section>
                                <h3 className="text-purple-400 text-lg font-semibold mb-4 border-b border-purple-900/50 pb-2">
                                    آیتم‌های موجود
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {items.map((item) => {
                                        const code = getCodeByName(item.name);

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
                                                        ? "border-purple-500 bg-purple-950/70"
                                                        : "border-purple-900/40 hover:border-purple-700 bg-purple-950/30 hover:bg-purple-950/50"
                                                }
                        `}
                                            >
                                                <div className="font-bold text-purple-300 mb-1">
                                                    {item.name}
                                                </div>
                                                <div className="text-sm text-gray-400 space-y-1">
                                                    <div>نوع: {item.item_type ?? "نامشخص"}</div>
                                                    <div>
                                                        اثر: {item.effect_type ?? "نامشخص"} ({item.value ?? 0}%)
                                                    </div>
                                                    <div>مدت: {item.duration ?? 0} نوبت</div>
                                                    <div>هزینه: {item.cost ?? 0}</div>
                                                    <div>
                                                        هدف: {item.target_action_type ?? "نامشخص"} (
                                                        {item.target_action || "هیچ"})
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                هیچ آیتمی در بازار سیاه موجود نیست
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
                            className="bg-purple-600 hover:bg-purple-700 min-w-[140px]"
                        >
                            {isSubmitting ? "در حال ارسال..." : "ثبت خرید"}
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}