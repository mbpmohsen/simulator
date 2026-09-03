"use client";

import { buildGameConclusion, type GameStateData } from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { motion } from "framer-motion";
import {
	CheckCircle2,
	Coins,
	Handshake,
	LoaderCircle,
	LogOut,
	Medal,
	RefreshCw,
	Shield,
	Target,
	Trophy,
	Users,
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { playGameFinishedSound } from "@/lib/playNotificationSound";

export interface GameFinishedResultProps {
	state: GameStateData;
	terminalEventReceived: boolean;
	finalizing?: boolean;
	refreshing?: boolean;
	onRefresh: () => void;
	onExit?: () => void;
}

const numberFa = (value: number): string => value.toLocaleString("fa-IR");

export function GameFinishedResult({
	state,
	terminalEventReceived,
	finalizing = false,
	refreshing = false,
	onRefresh,
	onExit,
}: GameFinishedResultProps) {
	const conclusion = useMemo(() => buildGameConclusion(state), [state]);
	const announced = useRef(false);
	const currentSideId = state.clientContext?.currentSideId ?? null;
	const currentSide = state.sides.find((side) => side.id === currentSideId);
	const winnerName =
		conclusion.winnerSide?.name ??
		(conclusion.winnerSideId === null
			? null
			: `سمت ${conclusion.winnerSideId}`);
	const headline = conclusion.isDraw
		? "بازی بدون برنده نهایی پایان یافت"
		: conclusion.currentSideOutcome === "win"
			? "سمت شما پیروز شد"
			: `پیروزی ${winnerName ?? "سمت برنده"}`;

	useEffect(() => {
		if (announced.current) return;
		announced.current = true;
		playGameFinishedSound();
		if (conclusion.currentSideOutcome === "win") {
			toast.success("بازی پایان یافت؛ سمت شما پیروز شد.", { duration: 9000 });
		} else if (conclusion.isDraw) {
			toast.info("بازی پایان یافت؛ نتیجه نهایی بدون برنده ثبت شد.", {
				duration: 9000,
			});
		} else {
			toast.info(`بازی پایان یافت؛ ${winnerName ?? "برنده"} پیروز شد.`, {
				duration: 9000,
			});
		}
	}, [conclusion.currentSideOutcome, conclusion.isDraw, winnerName]);

	return (
		<main
			role="alert"
			aria-live="assertive"
			dir="rtl"
			className="min-h-screen bg-[#080b12] px-4 py-6 text-slate-100 lg:px-8"
		>
			<div className="mx-auto max-w-6xl">
				<header className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
					<div className="flex items-start gap-4">
						<div className="grid size-14 shrink-0 place-items-center rounded-lg border border-amber-300/30 bg-amber-400/10 text-amber-200">
							{conclusion.isDraw ? (
								<Handshake className="size-7" />
							) : (
								<Trophy className="size-7" />
							)}
						</div>
						<div>
							<div className="flex flex-wrap items-center gap-2 text-xs text-amber-200">
								<CheckCircle2 className="size-4" /> بازی پایان یافت
								<Badge className="bg-white/5 text-slate-300">
									{state.game.gameId}
								</Badge>
							</div>
							<h1 className="mt-2 text-2xl font-black sm:text-3xl">
								{headline}
							</h1>
							<p className="mt-2 text-sm text-slate-400">
								{currentSide
									? `نتیجه نهایی برای ${currentSide.name}`
									: "نتیجه نهایی بازی"}
							</p>
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={onRefresh}
							disabled={refreshing}
							className="border-white/15 bg-white/5"
						>
							{refreshing ? (
								<LoaderCircle className="size-4 animate-spin" />
							) : (
								<RefreshCw className="size-4" />
							)}
							دریافت دوباره نتیجه
						</Button>
						{onExit ? (
							<Button
								type="button"
								variant="outline"
								onClick={onExit}
								className="border-white/15 bg-white/5 text-slate-300 hover:border-rose-400/25 hover:bg-rose-500/10 hover:text-rose-200"
							>
								<LogOut className="size-4" />
								خروج
							</Button>
						) : null}
					</div>
				</header>

				{finalizing && (
					<div className="mt-5 flex items-center gap-3 rounded-lg border border-amber-300/25 bg-amber-400/[0.07] p-4 text-sm text-amber-100">
						<LoaderCircle className="size-5 animate-spin" /> پایان بازی اعلام
						شد؛ نتیجه نهایی در حال همگام‌سازی است.
					</div>
				)}

				<section className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4 mt-6">
					{[
						{
							label: "نوبت پایانی",
							value: `${numberFa(state.game.currentTurn)} از ${numberFa(state.game.totalTurns)}`,
							icon: Target,
						},
						{
							label: "حد نصاب پیروزی",
							value: numberFa(state.game.pointThreshold),
							icon: Medal,
						},
						{
							label: "تعداد سمت‌ها",
							value: numberFa(conclusion.sides.length),
							icon: Shield,
						},
						{
							label: "تعداد تیم‌ها",
							value: numberFa(state.teams.length),
							icon: Users,
						},
					].map((item) => (
						<div key={item.label} className="bg-[#0d121c] p-4">
							<div className="flex items-center gap-2 text-xs text-slate-500">
								<item.icon className="size-4 text-cyan-300" /> {item.label}
							</div>
							<div className="mt-2 text-xl font-black">{item.value}</div>
						</div>
					))}
				</section>

				<section className="mt-6 grid gap-4 lg:grid-cols-2">
					{conclusion.sides.map((result, index) => {
						const isCurrentSide = result.side.id === currentSideId;
						return (
							<motion.article
								key={result.side.id}
								initial={{ opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: index * 0.08 }}
								className={`rounded-lg border p-5 ${result.isWinner ? "border-emerald-300/35 bg-emerald-400/[0.07]" : isCurrentSide ? "border-cyan-300/30 bg-cyan-400/[0.06]" : "border-white/10 bg-[#0d121c]"}`}
							>
								<div className="flex items-start justify-between gap-4">
									<div>
										<div className="flex flex-wrap items-center gap-2">
											<h2 className="text-lg font-black">{result.side.name}</h2>
											{result.isWinner && (
												<Badge className="bg-emerald-400/15 text-emerald-100">
													<Trophy className="size-3" /> برنده
												</Badge>
											)}
											{isCurrentSide && (
												<Badge className="bg-cyan-400/15 text-cyan-100">
													سمت شما
												</Badge>
											)}
										</div>
										<div className="mt-1 font-mono text-[10px] text-slate-600">
											{result.side.id}
										</div>
									</div>
									<div className="text-left">
										<div className="text-3xl font-black tabular-nums">
											{numberFa(result.points)}
										</div>
										<div className="text-xs text-slate-500">امتیاز نهایی</div>
									</div>
								</div>
								<div className="mt-4 flex items-center gap-2 border-y border-white/8 py-3 text-sm text-amber-200">
									<Coins className="size-4" /> اعتبار باقی‌مانده:{" "}
									{numberFa(result.credits)}
								</div>
								<div className="mt-3 space-y-2">
									{result.teams.map((team) => (
										<div
											key={team.id}
											className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-2 text-sm"
										>
											<div className="min-w-0">
												<div className="truncate font-bold">{team.name}</div>
												<div className="text-[10px] text-slate-600">
													{team.role ?? "TEAM"}
												</div>
											</div>
											{team.role !== "GOVERNMENT" && (
												<span className="text-slate-300">
													{numberFa(team.points ?? 0)} امتیاز
												</span>
											)}
											<span className="text-amber-200">
												{numberFa(team.credits ?? 0)} اعتبار
											</span>
										</div>
									))}
								</div>
							</motion.article>
						);
					})}
				</section>

				<footer className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4 text-xs text-slate-500">
					<CheckCircle2 className="size-4 text-emerald-300" /> نتیجه نهایی ثبت
					شد.
					{terminalEventReceived && (
						<span>اعلان پایان بازی برای حساب شما دریافت شد.</span>
					)}
				</footer>
			</div>
		</main>
	);
}
