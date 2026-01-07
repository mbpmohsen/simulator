"use client";

import { Button } from "@workspace/ui/components/button";
import { useEffect, useState } from "react";
import AttackStatusPanel from "@/components/AttackStatusPanel";
import GameFooter from "@/components/GameFooter";
import GameNavbar from "@/components/GameNavbar";
// import GameResultsDisplay from "@/components/GameResultsDisplay";
import AnimatedBattleBackground from "@/components/MainBackground";
import PlayerAttackCard from "@/components/PlayerAttackCard";
import PlayersList from "@/components/PlayersList";
import TeamStatusPanel from "@/components/TeamStatusPanel";
import VulnerabilitiesPage from "@/components/VulnerabilitiesPage";
import WaitingPopup from "@/components/WaitingPopup";
import { playClickSound } from "@/lib/playClickSound";
import {getGameState, proxyClientGameState} from "@/server/api.ts";
import { useGameStore } from "@/store/gameState.store.ts";
import { GameTabs } from "@/types/game";
import type { GameStateResponse } from "@/types/gameState.types.ts";
import {useRouter} from "next/navigation";
import {useGameResultsStore} from "@/store/useGameResults.store.ts";
import dynamic from "next/dynamic";

const GameResultsDisplay = dynamic(() => import("@/components/GameResultsDisplay"))
export default function Page() {
	const [activeTab, setActiveTab] = useState<GameTabs>(GameTabs.GAME);
	const [visible, setVisible] = useState(false);
    const router = useRouter();
	const { playerCode, setGameState, clearGameState } = useGameStore();
	const { setGameResults } = useGameResultsStore();

	const handleChangeTab = (tab: GameTabs) => {
		setActiveTab(tab);
		playClickSound();
	};

	const handleStartTheGame = () => {
		playClickSound();
		setVisible(!visible);
	};

    useEffect(() => {
        if (!playerCode) return;

        // Initial fetch
        const fetchGameState = async () => {
            try {
                const data = await proxyClientGameState(playerCode) as GameStateResponse;
                // @ts-expect-error
                setGameState(data);
                if (data.current_phase === "finished") {
                    try {
                        // Fetch the final game results
                        const gameResults = await getGameState();
                        console.log("Game finished, fetching results:", gameResults);

                        // Store results in Zustand
                        setGameResults(gameResults);

                        // Switch to history tab to show results
                        setActiveTab(GameTabs.HISTORY);

                        // Clear the live game state since game is over
                        clearGameState();

                    } catch (resultsErr: any) {
                        console.error("Error fetching game results:", resultsErr);
                        // If we can't get results either, then redirect to login
                        clearGameState();
                        router.push('/login');
                    }
                }
            } catch (err: any) {
                console.error("Error fetching game state:", err);

                // Check if game is finished (instead of redirecting to login)
                try {
                    // Fetch the final game results
                    const gameResults = await getGameState();
                    console.log("Game finished, fetching results:", gameResults);

                    // Store results in Zustand
                    setGameResults(gameResults);

                    // Switch to history tab to show results
                    setActiveTab(GameTabs.HISTORY);

                    // Clear the live game state since game is over
                    clearGameState();

                } catch (resultsErr: any) {
                    console.error("Error fetching game results:", resultsErr);
                    // If we can't get results either, then redirect to login
                    clearGameState();
                    router.push('/login');
                }
            }
        };

        fetchGameState();

        // Poll every 3 seconds
        const interval = setInterval(fetchGameState, 3000);

        return () => clearInterval(interval);
    }, [playerCode]);

    const renderTabContent = () => {
		switch (activeTab) {
			case GameTabs.GAME:
				return (
					<>
						<div className="absolute top-16 left-4 bottom-20 w-80 flex flex-col gap-4">
							<div className="flex-1">
								<AttackStatusPanel />
							</div>
							{/*<Button*/}
							{/*	onClick={handleStartTheGame}*/}
							{/*	className="w-full h-[150px] flex flex-col items-center justify-center"*/}
							{/*	variant="blue"*/}
							{/*>*/}
							{/*	<p className="text-lg font-bold">شروع بازی</p>*/}
							{/*	<p className="bg-gray-500 bg-opacity-50 px-3 py-1 rounded-md mt-2">*/}
							{/*		تیم شماره ۱*/}
							{/*	</p>*/}
							{/*</Button>*/}
						</div>
						<div className="absolute top-16 right-4 bottom-4 w-100">
							<TeamStatusPanel />
						</div>
						<WaitingPopup visible={visible} />
					</>
				);
			case GameTabs.ATTACK:
				return <PlayerAttackCard />;
			// case GameTabs.PLAYERS:
			// 	return <PlayersList />;
			case GameTabs.BLACK_MARKET:
				return <VulnerabilitiesPage />;
			// case GameTabs.EVENTS:
			// 	return <div>محتوای بخش رویدادها</div>;
			case GameTabs.HISTORY:
				return <GameResultsDisplay />;
			default:
				return <div>محتوای پیش‌فرض</div>;
		}
	};

	return (
		<div className="w-screen h-screen bg-black text-white relative overflow-hidden">
			<AnimatedBattleBackground />
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
