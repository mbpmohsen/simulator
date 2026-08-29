"use client";

import type { GameEvent, StepView } from "@workspace/trpc";
import { getLocalized } from "@workspace/trpc";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { motion } from "framer-motion";
import { Activity, Repeat, Swords, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface ResolvedStep {
	seq: number;
	actionCode: string;
	result: "success" | "failed";
	teamId: number | null;
}

interface PlayerMoveInsightProps {
	events: GameEvent[];
	steps: StepView[];
	myTeamId: number | null;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
	value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;

const readResolved = (event: GameEvent): ResolvedStep | null => {
	if (event.type !== "SCENARIO_STEP_RESOLVED") return null;
	const payload = asRecord(event.payload);
	if (!payload) return null;
	const actionCode = payload.action_code;
	if (typeof actionCode !== "string" || actionCode.length === 0) return null;
	const teamId = payload.team_id;
	return {
		seq: event.seq,
		actionCode,
		result: payload.result === "success" ? "success" : "failed",
		teamId: typeof teamId === "number" ? teamId : null,
	};
};

/** Turns ATK_BLACKOUT_SERVICE into "Blackout Service" as a last resort. */
const prettify = (code: string): string =>
	code
		.replace(/^(ATK|DEF|GOV)_/, "")
		.split("_")
		.map((part) => part.charAt(0) + part.slice(1).toLowerCase())
		.join(" ");

export default function PlayerMoveInsight({
	events,
	steps,
	myTeamId,
}: PlayerMoveInsightProps) {
	// Event payloads carry only the action code, so remember the names as the
	// steps that mention them pass through. This has to be state, not a ref:
	// mutating a ref would never re-render, leaving every label as a raw code.
	const [nameByCode, setNameByCode] = useState<Record<string, string>>({});
	useEffect(() => {
		setNameByCode((previous) => {
			let changed = false;
			const next = { ...previous };
			for (const step of steps) {
				const text = getLocalized(step.action_name, step.action_name_fa);
				if (text && text !== "—" && next[step.action_code] !== text) {
					next[step.action_code] = text;
					changed = true;
				}
			}
			return changed ? next : previous;
		});
	}, [steps]);

	const resolved = useMemo(
		() =>
			events
				.map(readResolved)
				.filter((item): item is ResolvedStep => item !== null)
				.sort((a, b) => a.seq - b.seq),
		[events],
	);

	const mine = useMemo(
		() =>
			myTeamId === null
				? []
				: resolved.filter((item) => item.teamId === myTeamId),
		[resolved, myTeamId],
	);
	const theirs = useMemo(
		() =>
			myTeamId === null
				? []
				: resolved.filter(
						(item) => item.teamId !== null && item.teamId !== myTeamId,
					),
		[resolved, myTeamId],
	);

	const label = (code: string): string => nameByCode[code] ?? prettify(code);

	const tally = useMemo(() => {
		const counts = new Map<string, number>();
		for (const item of mine) {
			counts.set(item.actionCode, (counts.get(item.actionCode) ?? 0) + 1);
		}
		return [...counts.entries()]
			.map(([code, count]) => ({ code, count }))
			.sort((a, b) => b.count - a.count);
	}, [mine]);

	const lastMine = mine[mine.length - 1] ?? null;
	const lastTheirs = theirs[theirs.length - 1] ?? null;
	const top = tally[0] ?? null;
	const share = top && mine.length > 0 ? top.count / mine.length : 0;
	const isPredictable = mine.length >= 3 && share >= 0.5;

	if (mine.length === 0 && theirs.length === 0) return null;

	return (
		<Card className="border-white/10 bg-slate-950/55 text-slate-100">
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-base font-black">
					<Activity className="size-4 text-cyan-300" /> الگوی حرکت‌های شما
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-5">
				{(lastMine || lastTheirs) && (
					<div className="space-y-2">
						<div className="text-[11px] text-slate-500">آخرین نوبت حل‌شده</div>
						<div className="grid gap-2 sm:grid-cols-2">
							<div className="rounded-xl border border-cyan-400/20 bg-cyan-500/[0.07] p-3">
								<div className="text-[11px] text-slate-500">تیم شما</div>
								<div className="mt-1 truncate text-sm font-bold">
									{lastMine ? label(lastMine.actionCode) : "—"}
								</div>
								{lastMine && (
									<div
										className={`mt-1 text-xs ${
											lastMine.result === "success"
												? "text-emerald-300"
												: "text-rose-300"
										}`}
									>
										{lastMine.result === "success" ? "موفق" : "ناموفق"}
									</div>
								)}
							</div>
							<div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
								<div className="flex items-center gap-1.5 text-[11px] text-slate-500">
									<Swords className="size-3" /> تیم مقابل
								</div>
								<div className="mt-1 truncate text-sm font-bold">
									{lastTheirs ? label(lastTheirs.actionCode) : "—"}
								</div>
								{lastTheirs && (
									<div
										className={`mt-1 text-xs ${
											lastTheirs.result === "success"
												? "text-emerald-300"
												: "text-rose-300"
										}`}
									>
										{lastTheirs.result === "success" ? "موفق" : "ناموفق"}
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{tally.length > 0 && (
					<div className="space-y-3">
						<div className="flex items-center justify-between text-[11px] text-slate-500">
							<span>تا اینجا چه چیزی بازی کرده‌اید</span>
							<span className="tabular-nums">
								{mine.length.toLocaleString("fa-IR")} حرکت
							</span>
						</div>
						<div className="space-y-2.5">
							{tally.map((entry) => {
								const ratio = mine.length > 0 ? entry.count / mine.length : 0;
								return (
									<div key={entry.code} className="space-y-1">
										<div className="flex items-baseline justify-between gap-3">
											<span className="truncate text-sm">
												{label(entry.code)}
											</span>
											<span className="shrink-0 font-mono text-xs tabular-nums text-slate-400">
												{entry.count.toLocaleString("fa-IR")} بار ·{" "}
												{(ratio * 100).toLocaleString("fa-IR", {
													maximumFractionDigits: 0,
												})}
												٪
											</span>
										</div>
										<div className="h-1.5 overflow-hidden rounded-full bg-white/5">
											<motion.div
												className={`h-full ${
													isPredictable && entry.code === top?.code
														? "bg-amber-400"
														: "bg-cyan-400"
												}`}
												initial={false}
												animate={{ width: `${ratio * 100}%` }}
												transition={{ duration: 0.35, ease: "easeOut" }}
											/>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{isPredictable && top && (
					<div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-500/[0.08] p-3 text-sm leading-6 text-amber-100">
						<TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />
						<span>
							<span className="font-bold">دارید قابل‌پیش‌بینی می‌شوید.</span>{" "}
							«{label(top.code)}» را در{" "}
							{(share * 100).toLocaleString("fa-IR", {
								maximumFractionDigits: 0,
							})}
							٪ حرکت‌هایتان انتخاب کرده‌اید. تیم مقابل می‌تواند روی همین حساب
							کند.
						</span>
					</div>
				)}

				{!isPredictable && mine.length >= 3 && (
					<div className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] p-3 text-sm leading-6 text-emerald-100">
						<Repeat className="mt-0.5 size-4 shrink-0 text-emerald-300" />
						<span>
							حرکت‌هایتان پخش شده است؛ حدس‌زدن انتخاب بعدی شما برای حریف
							سخت‌تر است.
						</span>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
