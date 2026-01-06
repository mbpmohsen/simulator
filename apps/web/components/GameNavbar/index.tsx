"use client";

import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import { Badge, ChevronLeft, Clock } from "lucide-react";
import type { FC } from "react";
import { useEffect, useState } from "react";
import TimeOverDialog from "@/components/TimeOverDialog";
import { useGameStore } from "@/store/gameState.store.ts";
import { GameTabs } from "@/types/game";
import WaitingForVoteDialog from "@/components/WaitingForVoteDialog";

interface GameNavbarProps {
	activeTab?: GameTabs;
	onTabChange?: (tab: GameTabs) => void;
}

const tabs = Object.values(GameTabs);

const GameNavbar: FC<GameNavbarProps> = ({
	activeTab = GameTabs.GAME,
	onTabChange,
}) => {
	const { gameState, clearGameState } = useGameStore();
	const [displayTime, setDisplayTime] = useState(
		gameState?.remaining_time || 0,
	);
	const [isTimeOver, setIsTimeOver] = useState(false);
	const [isVotingTime, setVotingTime] = useState(false);

	useEffect(() => {
		if (!gameState?.remaining_time) return;

		// Initialize with server time
		setDisplayTime(gameState.remaining_time);

		// Countdown locally every second
		const interval = setInterval(() => {
			setDisplayTime((prev) => {
				const newTime = Math.max(0, prev - 1);

				// Show dialog when time reaches 0
				if (newTime === 0 && prev > 0) {
                    // clearGameState();
					// setIsTimeOver(true);
				}

				return newTime;
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [gameState?.remaining_time]);

    useEffect(() => {
        if (!gameState?.current_turn) return;

        if (gameState?.current_phase === "waiting for others to vote") {
            setVotingTime(true);
        }

    }, [gameState?.current_phase]);

    useEffect(() => {
        if (!gameState?.current_turn) return;

        if (gameState?.current_phase === "voting") {
            setVotingTime(false);
        }

    }, [gameState?.current_phase]);

	// Format time as MM:SS
	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	// Determine color based on remaining time
	const getTimeColor = (seconds: number) => {
		if (seconds <= 10) return "text-red-500";
		if (seconds <= 30) return "text-yellow-500";
		return "text-gray-300";
	};

	return (
		<>
			<div className="w-full bg-black text-white flex items-center justify-between px-4 py-2 border-b border-zinc-800">
				{/* Left Section */}
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-1 text-sm text-gray-300">
						<span>{gameState?.team_credits}</span>
						<Badge className="bg-zinc-800 border-zinc-700 text-xs">🪙</Badge>
					</div>
					<Separator orientation="vertical" className="bg-zinc-700 h-4" />
					<div className="flex items-center gap-1 text-xs text-gray-300">
						<span className="bg-zinc-800 px-2 py-0.5 rounded text-gray-400">
							P
						</span>
						<span className="uppercase">{gameState?.current_phase}</span>
					</div>
					<Separator orientation="vertical" className="bg-zinc-700 h-4" />
					<div className="flex items-center gap-1.5 text-sm">
						<Clock size={14} className="text-gray-400" />
						<span
							className={cn(
								"font-mono font-semibold",
								getTimeColor(displayTime),
							)}
						>
							{formatTime(displayTime)}
						</span>
					</div>
					<div className="relative">
						<div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur opacity-30"></div>
						<div
							className="relative bg-gray-900 px-2 py-1 rounded-lg border border-gray-800"
							dir="rtl"
						>
							<div className="flex items-center gap-3">
								<div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
									راند
								</div>
								<div className="flex items-baseline">
									<span className="text-sm font-bold text-white">
										{gameState?.current_turn}
									</span>
									<span className="text-sm text-gray-500 mr-1">
										از {gameState?.total_turns}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Center Tabs */}
				<div className="flex items-center gap-2">
					<span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-gray-400">
						LB
					</span>
					<div className="flex items-center bg-zinc-900/70 rounded-lg overflow-hidden border border-zinc-700">
						{tabs.map((tab, index) => (
							<button
                                type="button"
								key={index}
								onClick={() => onTabChange?.(tab)}
								className={cn(
									"text-sm px-3 py-1.5 transition-colors",
									tab === activeTab
										? "bg-zinc-200 text-black font-medium"
										: "text-gray-400 hover:text-white",
								)}
							>
								{tab}
							</button>
						))}
					</div>
					<span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-gray-400">
						RB
					</span>
				</div>

				{/* Right Section */}
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						className="text-gray-400 hover:text-white"
					>
						<ChevronLeft size={18} />
					</Button>
					<div className="flex flex-col text-sm">
						<span className="text-green-500 font-semibold">بازی</span>
						<span className="text-gray-400 text-xs">بازی تیمی</span>
					</div>
				</div>
			</div>

			{/* Time Over Dialog */}
			<TimeOverDialog isOpen={isTimeOver} />
			<WaitingForVoteDialog isOpen={isVotingTime} />
		</>
	);
};

export default GameNavbar;
