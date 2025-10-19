"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Howl } from "howler";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function fmt(seconds = 0) {
	if (!Number.isFinite(seconds)) return "0:00";
	const s = Math.floor(seconds % 60)
		.toString()
		.padStart(2, "0");
	const m = Math.floor(seconds / 60);
	return `${m}:${s}`;
}

type Track = { title: string; src: string };

interface CompactPlayerCardProps {
	onPlaybackStateChange?: (isPlaying: boolean) => void;
	autoPlay?: boolean;
}

export default function CompactPlayerCard({
	onPlaybackStateChange,
	autoPlay = true,
}: CompactPlayerCardProps) {
	const tracks: Track[] = useMemo(
		() => [
			{
				title: "Dark Ambient — Looppelganger",
				src: "/sounds/828082__looplicator__looppelganger-186-dark-ambient-sound.mp3",
			},
		],
		[],
	);

	const howlRef = useRef<Howl | null>(null);
	const rafRef = useRef<number | null>(null);

	const [currentIndex, setCurrentIndex] = useState(0);
	const [isPlaying, setIsPlaying] = useState(autoPlay);
	const [position, setPosition] = useState(0);
	const [duration, setDuration] = useState(0);
	const [isLoaded, setIsLoaded] = useState(false);

	const createHowl = useCallback(
		(trackSrc: string, loop = true) => {
			if (howlRef.current) {
				try {
					howlRef.current.stop();
					howlRef.current.unload();
				} catch {}
				howlRef.current = null;
			}

			const h = new Howl({
				src: [trackSrc],
				html5: true,
				loop,
				volume: 0.8,
				onload: () => {
					setDuration(h.duration() || 0);
					setIsLoaded(true);
				},
				onplay: () => {
					setIsPlaying(true);
					setDuration(h.duration() || 0);
					onPlaybackStateChange?.(true);
					if (rafRef.current == null) tick();
				},
				onpause: () => {
					setIsPlaying(false);
					onPlaybackStateChange?.(false);
				},
				onstop: () => {
					setIsPlaying(false);
					onPlaybackStateChange?.(false);
				},
				onloaderror: (id, err) => {
					console.error("Howl load error:", id, err);
				},
				onplayerror: (id, err) => {
					console.warn("Howl play error:", id, err);
				},
			});

			howlRef.current = h;
			setPosition(0);
			setIsLoaded(false);
			return h;
		},
		[onPlaybackStateChange],
	);

	const tick = useCallback(() => {
		const h = howlRef.current;
		if (!h) return;
		try {
			const pos = h.seek() as number;
			if (typeof pos === "number" && !Number.isNaN(pos)) {
				setPosition(pos);
			}
		} catch (e) {}
		rafRef.current = requestAnimationFrame(tick);
	}, []);

	useEffect(() => {
		const track = tracks[currentIndex]!;
		const h = createHowl(track.src, true);
		h.once("load", () => {
			setDuration(h.duration() || 0);
			setIsLoaded(true);
			if (autoPlay) {
				try {
					h.play();
				} catch (err) {
					console.warn("Autoplay prevented or play error:", err);
					setIsPlaying(false);
					onPlaybackStateChange?.(false);
				}
			}
		});

		return () => {
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
			// Don't stop the music when component unmounts - keep it playing
			// if (howlRef.current) {
			//   try {
			//     howlRef.current.stop();
			//     howlRef.current.unload();
			//   } catch {}
			//   howlRef.current = null;
			// }
		};
	}, [currentIndex, createHowl, tracks, autoPlay, onPlaybackStateChange]);

	const togglePlay = useCallback(() => {
		const h = howlRef.current;
		if (!h) {
			const track = tracks[currentIndex]!;
			const nt = createHowl(track.src, true);
			try {
				nt.play();
			} catch {}
			return;
		}
		if (isPlaying) {
			h.pause();
		} else {
			h.play();
			if (rafRef.current == null) tick();
		}
	}, [isPlaying, createHowl, currentIndex, tracks, tick]);

	const next = useCallback(() => {
		setCurrentIndex((i) => (i + 1) % tracks.length);
	}, [tracks.length]);

	const prev = useCallback(() => {
		setCurrentIndex((i) => (i - 1 + tracks.length) % tracks.length);
	}, [tracks.length]);

	const onSeek = useCallback((value: number) => {
		const h = howlRef.current;
		if (!h) return;
		h.seek(value);
		setPosition(value);
	}, []);

	useEffect(() => {
		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
	}, []);

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.9, y: 20 }}
			animate={{ opacity: 1, scale: 1, y: 0 }}
			transition={{ duration: 0.3, ease: "easeOut" }}
			className="w-full max-w-[400px] min-w-[300px] h-[80px] mx-auto"
		>
			<div className="relative w-full h-full rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-lg border border-slate-700 overflow-hidden">
				<AnimatePresence>
					{isPlaying && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="absolute inset-0 pointer-events-none"
						>
							{[0, 1, 2].map((i) => (
								<motion.div
									key={i}
									className="absolute bottom-0 w-full bg-blue-500/20"
									initial={{ height: 0 }}
									animate={{
										height: ["10%", "30%", "10%"],
									}}
									transition={{
										duration: 1.5,
										repeat: Infinity,
										delay: i * 0.3,
										ease: "easeInOut",
									}}
								/>
							))}
						</motion.div>
					)}
				</AnimatePresence>

				<div className="relative z-10 flex items-center h-full px-3 gap-3">
					{/* ... rest of your player card JSX remains the same ... */}
					<motion.div
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-md flex items-center justify-center"
					>
						<motion.div
							animate={{ rotate: isPlaying ? 360 : 0 }}
							transition={{
								rotate: {
									duration: 4,
									repeat: isPlaying ? Infinity : 0,
									ease: "linear",
								},
							}}
							className="w-6 h-6"
						>
							<svg
								viewBox="0 0 24 24"
								fill="none"
								className="w-full h-full text-white"
							>
								<circle
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="2"
								/>
								<circle cx="12" cy="12" r="3" fill="currentColor" />
								<path
									d="M12 2V6M12 18V22M2 12H6M18 12H22"
									stroke="currentColor"
									strokeWidth="2"
								/>
							</svg>
						</motion.div>
					</motion.div>

					<div className="flex-1 min-w-0">
						<motion.div
							key={currentIndex}
							initial={{ x: 20, opacity: 0 }}
							animate={{ x: 0, opacity: 1 }}
							className="text-sm font-medium text-white truncate"
						>
							{tracks[currentIndex]!.title}
						</motion.div>
						<div className="text-xs text-slate-400 mt-0.5">
							{fmt(position)} / {fmt(duration)}
						</div>

						<div className="mt-1.5">
							<input
								type="range"
								min={0}
								max={Math.max(0, duration)}
								step={0.01}
								value={position}
								onChange={(e) => onSeek(Number(e.target.value))}
								className="w-full h-1 bg-slate-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
							/>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<motion.button
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.9 }}
							onClick={prev}
							className="p-1.5 text-slate-300 hover:text-white transition-colors"
							title="Previous"
						>
							<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
							</svg>
						</motion.button>

						<motion.button
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.9 }}
							onClick={togglePlay}
							className="p-2 bg-white text-slate-900 rounded-full hover:bg-slate-100 transition-colors"
							title={isPlaying ? "Pause" : "Play"}
						>
							<AnimatePresence mode="wait">
								{isPlaying ? (
									<motion.svg
										key="pause"
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										exit={{ scale: 0 }}
										className="w-4 h-4"
										fill="currentColor"
										viewBox="0 0 24 24"
									>
										<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
									</motion.svg>
								) : (
									<motion.svg
										key="play"
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										exit={{ scale: 0 }}
										className="w-4 h-4"
										fill="currentColor"
										viewBox="0 0 24 24"
									>
										<path d="M8 5v14l11-7z" />
									</motion.svg>
								)}
							</AnimatePresence>
						</motion.button>

						<motion.button
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.9 }}
							onClick={next}
							className="p-1.5 text-slate-300 hover:text-white transition-colors"
							title="Next"
						>
							<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
							</svg>
						</motion.button>
					</div>
				</div>

				<AnimatePresence>
					{!isLoaded && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="absolute inset-0 bg-slate-900/80 flex items-center justify-center"
						>
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
								className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
							/>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</motion.div>
	);
}
