"use client";

import { Button } from "@workspace/ui/components/button";
import { useState } from "react";
import AttackStatusPanel from "@/components/AttackStatusPanel";
import GameFooter from "@/components/GameFooter";
import GameNavbar from "@/components/GameNavbar";
import TeamStatusPanel from "@/components/TeamStatusPanel";
import { playClickSound } from "@/lib/playClickSound";
import { GameTabs } from "@/types/game";
import VulnerabilitiesPage from "@/components/VulnerabilitiesPage";
import HistoryOfGamePage from "@/components/HistoryOfGamePage";
import PlayersList from "@/components/PlayersList";
import WaitingPopup from "@/components/WaitingPopup";

export default function Page() {
	const [activeTab, setActiveTab] = useState<GameTabs>(GameTabs.GAME);
	const [visible, setVisible] = useState(false);

	const handleChangeTab = (tab: GameTabs) => {
		setActiveTab(tab);
		playClickSound();
	};

	const handleStartTheGame = () => {
		playClickSound();
		setVisible(!visible);
	};

	const renderTabContent = () => {
		switch (activeTab) {
			case GameTabs.GAME:
				return (
					<>
						<div className="absolute top-16 left-4 bottom-20 w-80 flex flex-col gap-4">
							<div className="flex-1">
								<AttackStatusPanel />
							</div>
							<Button
								onClick={handleStartTheGame}
								className="w-full h-[150px] flex flex-col items-center justify-center"
								variant="blue"
							>
								<p className="text-lg font-bold">شروع بازی</p>
								<p className="bg-gray-500 bg-opacity-50 px-3 py-1 rounded-md mt-2">
									تیم شماره ۱
								</p>
							</Button>
						</div>
						<div className="absolute top-16 right-4 bottom-4 w-100">
							<TeamStatusPanel />
						</div>
						<WaitingPopup visible={visible} />
					</>
				);
			case GameTabs.ATTACK:
				return <div>محتوای بخش حمله</div>;
			case GameTabs.PLAYERS:
				return <PlayersList />;
			case GameTabs.BLACK_MARKET:
				return <VulnerabilitiesPage />;
			case GameTabs.EVENTS:
				return <div>محتوای بخش رویدادها</div>;
			case GameTabs.HISTORY:
				return <HistoryOfGamePage />;
			default:
				return <div>محتوای پیش‌فرض</div>;
		}
	};

	return (
		<div className="w-screen h-screen bg-black text-white relative overflow-hidden">
			<div className="absolute top-0 left-0 right-0 h-16 z-10">
				<GameNavbar activeTab={activeTab} onTabChange={handleChangeTab} />
			</div>
			{renderTabContent()}
			<div className="absolute bottom-0 left-0 right-0 h-16 z-10">
				<GameFooter />
			</div>
		</div>
	);
}
