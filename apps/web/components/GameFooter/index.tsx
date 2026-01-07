"use client";

import { Button } from "@workspace/ui/components/button";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BookA, Music, Music2, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import CompactPlayerCard from "../PlayerCard";
import SettingsMenu from "@/components/SettingsMenu";
import AnnouncementsMenu from "@/components/AnnouncementsMenu";
import {useRouter} from "next/navigation";
import {useGameStore} from "@/store/gameState.store.ts";
import {useGameResultsStore} from "@/store/useGameResults.store.ts";

const GameFooter = () => {
	const [isPlayerVisible, setIsPlayerVisible] = useState(false);
	const [isMusicPlaying, setIsMusicPlaying] = useState(true); // Always start as playing
    const router = useRouter();
    const { clearGameState } = useGameStore();
    const { clearGameResults } = useGameResultsStore();
	// This useEffect ensures music starts playing when component mounts
	useEffect(() => {
		// Music should always be playing by default
		setIsMusicPlaying(true);
	}, []);

	const togglePlayer = () => {
		setIsPlayerVisible(!isPlayerVisible);
	};

	// This function will be passed to the player card to sync playback state
	const handlePlaybackStateChange = (playing: boolean) => {
		setIsMusicPlaying(playing);
	};

	return (
		<div className="w-full bg-black text-white flex items-center justify-between px-4 py-2 border-t border-zinc-800 relative">
			<div className="flex gap-4 items-center justofy-between">
				<div className="flex items-center gap-4 relative">
					{/* Music Box */}
					<motion.div
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						className="relative"
					>
						<Button
							variant="ghost"
							size="icon"
							onClick={togglePlayer}
							className={`relative ${
								isMusicPlaying
									? "text-green-500 hover:text-green-400"
									: "text-gray-400 hover:text-white"
							} transition-colors`}
						>
							{isMusicPlaying ? (
								<Music2 size={20} className="animate-pulse" />
							) : (
								<Music size={20} />
							)}

							{/* Animated sound waves when playing */}
							{isMusicPlaying && (
								<div className="absolute -top-1 -right-1 flex space-x-[1px]">
									{[1, 2, 3].map((i) => (
										<motion.div
											key={i}
											className="w-[2px] bg-green-500 rounded-full"
											animate={{
												height: ["2px", "8px", "2px"],
											}}
											transition={{
												duration: 1,
												repeat: Infinity,
												delay: i * 0.2,
												ease: "easeInOut",
											}}
										/>
									))}
								</div>
							)}
						</Button>

						{/* Tooltip */}
						<div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
							{isMusicPlaying ? "پخش موسیقی" : "موسیقی"}
						</div>
					</motion.div>

					{/* Player Card - Appears above the music box */}
					<AnimatePresence>
						{isPlayerVisible && (
							<motion.div
								initial={{ opacity: 0, y: 20, scale: 0.9 }}
								animate={{ opacity: 1, y: 0, scale: 1 }}
								exit={{ opacity: 0, y: 20, scale: 0.9 }}
								transition={{ duration: 0.3, ease: "easeOut" }}
								className="absolute mb-2 right-0 bottom-12 z-50"
							>
								<CompactPlayerCard
									onPlaybackStateChange={handlePlaybackStateChange}
									autoPlay={true}
								/>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* Chat section */}
				<div className="flex-1 flex justify-center">
					<AnnouncementsMenu />
				</div>
			</div>

			{/* Right Side - Action Buttons */}
			<div className="flex items-center gap-2 justify-between w-50 ml-4">
				<SettingsMenu />
				<Button
					variant="ghost"
					size="icon"
					className="text-gray-400 hover:text-white flex flex-col items-center gap-1"
				>
					<BookA size={18} />
					<span className="text-gray-400 text-xs">انتخاب</span>
				</Button>
				<Button
                    onClick={() => {
                        router.push("/login");
                        clearGameState();
                        clearGameResults();
                    }}
					variant="ghost"
					size="icon"
					className="text-gray-400 hover:text-white flex flex-col items-center gap-1"
				>
					<ArrowLeft size={18} />
					<span className="text-gray-400 text-xs">خروج</span>
				</Button>
			</div>
		</div>
	);
};

export default GameFooter;
