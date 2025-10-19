"use client";

import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import { Badge, ChevronLeft } from "lucide-react";
import type { FC } from "react";
import { GameTabs } from "@/types/game";

interface GameNavbarProps {
	activeTab?: GameTabs;
	onTabChange?: (tab: GameTabs) => void;
}

const tabs = Object.values(GameTabs);

const GameNavbar: FC<GameNavbarProps> = ({
	activeTab = GameTabs.GAME,
	onTabChange,
}) => {
	return (
		<div className="w-full bg-black text-white flex items-center justify-between px-4 py-2 border-b border-zinc-800">
			{/* Left Section */}
			<div className="flex items-center gap-3">
				<div className="flex items-center gap-1 text-sm text-gray-300">
					<span>8500</span>
					<Badge
						className="bg-zinc-800 border-zinc-700 text-xs"
					>
						🪙
					</Badge>
				</div>
				<Separator orientation="vertical" className="bg-zinc-700 h-4" />
				<div className="flex items-center gap-1 text-xs text-gray-300">
					<span className="bg-zinc-800 px-2 py-0.5 rounded text-gray-400">
						Y
					</span>
					<span>BATTLE PASS</span>
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
	);
};

export default GameNavbar;
