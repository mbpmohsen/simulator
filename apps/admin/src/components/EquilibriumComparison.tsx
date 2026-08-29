"use client";

import type {
	ConfigureAllRequestV2,
	EquilibriumStrategy,
	GameServerApi,
} from "@workspace/trpc";
import { buildEquilibrium, getLocalized } from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { motion } from "framer-motion";
import {
	LoaderCircle,
	RefreshCw,
	ShieldHalf,
	Swords,
	Target,
	TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadStoredGamePlanDraft } from "@/lib/game-plan";

interface EquilibriumComparisonProps {
	api: GameServerApi | null;
	gameId: string;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
	value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;

/** The admin event envelope is loosely typed, so find the array wherever it sits. */
const extractEvents = (response: unknown): Record<string, unknown>[] => {
	const root = asRecord(response);
	const data = asRecord(root?.data);
	for (const candidate of [
		root?.events,
		root?.items,
		data?.events,
		data?.items,
		data?.results,
	]) {
		if (Array.isArray(candidate)) {
			return candidate.flatMap((entry) => {
				const record = asRecord(entry);
				return record ? [record] : [];
			});
		}
	}
	return [];
};

interface PlayedMove {
	teamId: number;
	actionCode: string;
}

const readPlayed = (event: Record<string, unknown>): PlayedMove | null => {
	if (event.type !== "SCENARIO_STEP_RESOLVED") return null;
	const payload = asRecord(event.payload);
	if (!payload) return null;
	const actionCode = payload.action_code;
	const teamId = payload.team_id;
	if (typeof actionCode !== "string" || typeof teamId !== "number") return null;
	return { teamId, actionCode };
};

const roleOf = (team: ConfigureAllRequestV2["teams"][number]): string =>
	typeof team.role === "string" ? team.role : team.role.type;

const fa = (value: number, digits = 1): string =>
	value.toLocaleString("fa-IR", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
	});

interface SideComparison {
	teamId: number;
	teamName: string;
	kind: "attack" | "defense";
	/** Plays whose action code exists in this plan. */
	matched: number;
	/** Plays from actions this plan does not contain - a plan/game mismatch. */
	unmatched: number;
	rows: Array<{
		code: string;
		label: string;
		actual: number;
		optimal: number;
	}>;
	divergence: number;
}

export default function EquilibriumComparison({
	api,
	gameId,
}: EquilibriumComparisonProps) {
	const [plan, setPlan] = useState<ConfigureAllRequestV2 | null>(null);
	const [played, setPlayed] = useState<PlayedMove[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (!api || !gameId) return;
		setLoading(true);
		setError(null);
		// The deployed server exposes no endpoint returning a published plan
		// (/admin/game_plan and /admin/game_plan/graph both 404), and no response
		// carries points_on_success or counter effectiveness. The only source of
		// payoff data is the plan the admin has open in the builder, shared
		// through session storage.
		setPlan(loadStoredGamePlanDraft());
		try {
			const response = await api.getEventsAdminAll(gameId, { limit: 1000 });
			setPlayed(
				extractEvents(response).flatMap((event) => {
					const move = readPlayed(event);
					return move ? [move] : [];
				}),
			);
		} catch {
			setError("دریافت تاریخچهٔ رویدادها ممکن نشد.");
		} finally {
			setLoading(false);
		}
	}, [api, gameId]);

	useEffect(() => {
		void load();
	}, [load]);

	const equilibrium = useMemo(
		() => (plan ? buildEquilibrium(plan) : null),
		[plan],
	);

	const comparisons = useMemo<SideComparison[]>(() => {
		if (!plan || !equilibrium?.solvable) return [];
		const byTeam = new Map<number, Map<string, number>>();
		for (const move of played) {
			const bucket = byTeam.get(move.teamId) ?? new Map<string, number>();
			bucket.set(move.actionCode, (bucket.get(move.actionCode) ?? 0) + 1);
			byTeam.set(move.teamId, bucket);
		}

		const result: SideComparison[] = [];
		for (const team of plan.teams) {
			const role = roleOf(team);
			if (role === "GOVERNMENT") continue;
			const teamId = team.id;
			if (teamId === undefined) continue;
			const counts = byTeam.get(teamId);
			if (!counts || counts.size === 0) continue;

			const kind: "attack" | "defense" =
				role === "DEFENCER" ? "defense" : "attack";
			const strategies: EquilibriumStrategy[] =
				kind === "attack" ? equilibrium.attacks : equilibrium.defenses;
			// Only plays that exist in this plan can be compared against it. Counting
			// the rest in the denominator would drag every share down and invent a
			// divergence that says nothing.
			const codes = new Set(strategies.map((item) => item.move.code));
			let matched = 0;
			let unmatched = 0;
			for (const [code, n] of counts) {
				if (codes.has(code)) matched += n;
				else unmatched += n;
			}

			const rows = strategies.map((strategy) => ({
				code: strategy.move.code,
				label: getLocalized(strategy.move.name, strategy.move.nameFa),
				actual:
					matched > 0 ? (counts.get(strategy.move.code) ?? 0) / matched : 0,
				optimal: strategy.weight,
			}));
			// Total-variation distance: half the summed absolute gap.
			const divergence =
				matched > 0
					? rows.reduce(
							(sum, row) => sum + Math.abs(row.actual - row.optimal),
							0,
						) / 2
					: 0;

			result.push({
				teamId,
				teamName: getLocalized(
					team.display_name ?? team.name,
					team.display_name_fa ?? team.name_fa,
				),
				kind,
				matched,
				unmatched,
				rows,
				divergence,
			});
		}
		return result;
	}, [plan, equilibrium, played]);

	if (!api) return null;

	return (
		<Card className="border-slate-800 bg-slate-950/72 text-slate-100">
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<CardTitle className="flex items-center gap-2 text-base text-slate-100">
						<Target className="size-4 text-cyan-300" /> بازی شما در برابر بازی
						بهینه
					</CardTitle>
					<Button
						variant="outline"
						disabled={loading}
						onClick={() => void load()}
						className="border-white/10 bg-white/5 text-slate-200"
					>
						{loading ? (
							<LoaderCircle className="size-4 animate-spin" />
						) : (
							<RefreshCw className="size-4" />
						)}
						به‌روزرسانی
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-5">
				<p className="text-sm leading-7 text-slate-400">
					نوار پررنگ نشان می‌دهد هر تیم واقعاً چه نسبتی از حرکت‌ها را بازی کرده
					است و نشانهٔ خط‌چین نشان می‌دهد نظریهٔ بازی چه نسبتی را بهینه
					می‌داند.
				</p>

				{error && (
					<div className="flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/[0.08] p-3 text-sm text-amber-100">
						<TriangleAlert className="size-4 shrink-0" /> {error}
					</div>
				)}

				{!loading && !plan && (
					<div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-400">
						برنامهٔ بازی در دسترس نیست. سرور نقطهٔ پایانی برای خواندن برنامهٔ
						منتشرشده ندارد، پس این مقایسه از برنامه‌ای استفاده می‌کند که در
						«پیکربندی بازی» باز کرده‌اید. ابتدا آن صفحه را در همین زبانه باز
						کنید و سپس به این‌جا برگردید.
					</div>
				)}

				{!loading && equilibrium && !equilibrium.solvable && (
					<div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
						تعادل برای این برنامه قابل محاسبه نیست، پس مقایسه‌ای در دسترس
						نیست.
					</div>
				)}

				{!loading && comparisons.length === 0 && !error && (
					<div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
						هنوز هیچ گامی در این بازی حل نشده است؛ پس از اولین نوبت، مقایسه
						این‌جا ظاهر می‌شود.
					</div>
				)}

				<div className="grid gap-4 xl:grid-cols-2">
					{comparisons.map((side) => {
						const accent =
							side.kind === "attack"
								? { bar: "bg-rose-400", text: "text-rose-200", ring: "border-rose-400/25" }
								: { bar: "bg-sky-400", text: "text-sky-200", ring: "border-sky-400/25" };
						return (
							<div
								key={side.teamId}
								className={`rounded-2xl border bg-slate-950/55 p-4 ${accent.ring}`}
							>
								<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
									<div className={`flex items-center gap-2 font-black ${accent.text}`}>
										{side.kind === "attack" ? (
											<Swords className="size-4" />
										) : (
											<ShieldHalf className="size-4" />
										)}
										{side.teamName}
									</div>
									<div className="flex items-center gap-2">
										<Badge className="border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
											{side.matched.toLocaleString("fa-IR")} حرکت
										</Badge>
										{side.matched > 0 && <Badge
											className={`border px-2.5 py-1 text-[11px] ${
												side.divergence <= 0.15
													? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
													: side.divergence <= 0.35
														? "border-amber-400/25 bg-amber-400/10 text-amber-200"
														: "border-rose-400/25 bg-rose-400/10 text-rose-200"
											}`}
										>
											فاصله تا بهینه {fa(side.divergence * 100, 0)}٪
										</Badge>}
									</div>
								</div>

								{side.matched === 0 ? (
									<div className="rounded-xl border border-amber-400/25 bg-amber-500/[0.08] p-3 text-sm leading-7 text-amber-100">
										هیچ‌کدام از {side.unmatched.toLocaleString("fa-IR")} حرکت این
										تیم در برنامهٔ بارگذاری‌شده وجود ندارد. این بازی با
										پیکربندی دیگری اجرا شده است، پس مقایسه‌ای معنا ندارد.
									</div>
								) : (
								<div className="space-y-3.5">
									{side.rows.map((row) => (
										<div key={row.code} className="space-y-1.5">
											<div className="flex items-baseline justify-between gap-3">
												<span className="truncate text-sm">{row.label}</span>
												<span
													dir="ltr"
													className="shrink-0 font-mono text-xs tabular-nums text-slate-400"
												>
													{fa(row.actual * 100, 0)}٪ / {fa(row.optimal * 100, 0)}٪
												</span>
											</div>
											<div className="relative h-2.5 overflow-hidden rounded-full bg-white/5">
												<motion.div
													className={`absolute inset-y-0 right-0 ${accent.bar}`}
													initial={false}
													animate={{ width: `${row.actual * 100}%` }}
													transition={{ duration: 0.4, ease: "easeOut" }}
												/>
												<span
													className="absolute inset-y-0 w-0 border-r-2 border-dashed border-slate-200/70"
													style={{ right: `${row.optimal * 100}%` }}
													aria-hidden="true"
												/>
											</div>
										</div>
									))}
									{side.unmatched > 0 && (
										<p className="pt-1 text-[11px] leading-5 text-amber-300/80">
											{side.unmatched.toLocaleString("fa-IR")} حرکت دیگر از
											کنش‌هایی بود که در این برنامه نیستند و در محاسبه نیامده‌اند.
										</p>
									)}
								</div>
								)}
							</div>
						);
					})}
				</div>

				<p className="text-xs leading-6 text-slate-600">
					نسبت‌های بهینه از برنامهٔ بارگذاری‌شده در «پیکربندی بازی» محاسبه
					می‌شوند، نه از سروری که این بازی روی آن اجرا شده است. اگر آن برنامه با
					چیزی که واقعاً منتشر شده فرق داشته باشد، مقایسه معتبر نیست.
				</p>
			</CardContent>
		</Card>
	);
}
