"use client";

import type {
	ActionHistoryEntry,
	ActionsHistoryResponse,
	GameServerApi,
} from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { Hourglass, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * `GET /api/games/{gameId}/actions-history` — one row per (team, action) with
 * how long that action took, measured in the game's imaginary time unit.
 *
 * Reads from storage, so a finished game answers just as well as the running
 * one; this is the after-action view, not a live monitor.
 */

const ALL_TEAMS = "__all__";

const faNum = (value: number): string => value.toLocaleString("fa-IR");

/**
 * The server sends a number and a unit and never a phrase, so the label is
 * built here. `duration` is null exactly when the action has not succeeded
 * yet — that is "in progress", never zero.
 */
const durationLabel = (entry: ActionHistoryEntry): string =>
	entry.duration
		? `${faNum(entry.duration.value)} ${entry.duration.unit.name}`
		: "در جریان";

/** `actionName_fa` → `actionName` → `actionCode`, per the server contract. */
const actionLabel = (entry: ActionHistoryEntry): string =>
	entry.actionName_fa || entry.actionName || entry.actionCode;

const categoryLabel = (category: string | null | undefined): string | null => {
	if (category === "attack") return "تهاجمی";
	if (category === "defense") return "دفاعی";
	return null;
};

export default function ActionDurations({
	api,
	gameId,
}: {
	api: GameServerApi | null;
	gameId: string;
}) {
	const [history, setHistory] = useState<ActionsHistoryResponse | null>(null);
	const [team, setTeam] = useState<string>(ALL_TEAMS);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (!api || !gameId) return;
		setLoading(true);
		setError(null);
		try {
			setHistory(await api.getActionsHistory(gameId));
		} catch {
			setError("تاریخچهٔ کنش‌های این بازی در دسترس نیست.");
			setHistory(null);
		} finally {
			setLoading(false);
		}
	}, [api, gameId]);

	useEffect(() => {
		setTeam(ALL_TEAMS);
		void load();
	}, [load]);

	const rows = history?.actions ?? [];

	// Teams are grouped by name, not by id: `teamId` can be null when a team is
	// no longer resolvable in the stored game, while `teamName` is always there.
	const teamNames = useMemo(
		() => [...new Set(rows.map((row) => row.teamName))],
		[rows],
	);
	const visible =
		team === ALL_TEAMS ? rows : rows.filter((row) => row.teamName === team);

	if (!gameId) return null;

	return (
		<Card className="border-slate-800 bg-slate-950/72 text-slate-100">
			<CardHeader>
				<CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base text-slate-100">
					<span className="flex items-center gap-2">
						<Hourglass className="h-4 w-4 text-amber-300" />
						مدت کنش‌ها
						{history ? (
							<Badge
								variant="outline"
								className="border-slate-600 text-slate-300"
							>
								واحد: {history.timeUnit.name}
							</Badge>
						) : null}
					</span>
					<Button
						size="sm"
						variant="outline"
						onClick={() => void load()}
						disabled={!api || loading}
						className="border-slate-600 bg-slate-950/30 text-slate-100"
					>
						<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
						بارگذاری دوباره
					</Button>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-xs leading-6 text-slate-400">
					از نخستین تلاش هر تیم روی یک کنش تا آخرین موفقیتش، به‌صورت شمارشی (نوبت
					اول و آخر هر دو حساب می‌شوند). تلاش‌های ردشده پیش از اجرا — اعتبار
					ناکافی، هدف انتخاب‌نشده، کنش ممنوع‌شده — هم یک تلاش شمرده می‌شوند و داخل
					«ناموفق» می‌آیند؛ پس «ناموفق» فقط شکست شانسی نیست. مداخله‌های دولت در
					این فهرست نمی‌آیند.
				</p>

				{teamNames.length > 1 ? (
					<div className="flex flex-wrap gap-2">
						{[ALL_TEAMS, ...teamNames].map((name) => (
							<Button
								key={name}
								size="sm"
								variant="outline"
								onClick={() => setTeam(name)}
								className={`h-7 border-slate-700 text-xs ${
									team === name
										? "bg-emerald-500/15 text-emerald-100"
										: "bg-slate-950/30 text-slate-300"
								}`}
							>
								{name === ALL_TEAMS ? "همهٔ تیم‌ها" : name}
							</Button>
						))}
					</div>
				) : null}

				{loading && !history ? (
					<div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
						<LoaderCircle className="h-4 w-4 animate-spin" /> در حال دریافت…
					</div>
				) : error ? (
					<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
						{error}
					</div>
				) : visible.length === 0 ? (
					<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
						هنوز کنشی در این بازی انجام نشده است.
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-right text-sm">
							<thead className="text-xs text-slate-500">
								<tr className="border-b border-slate-800">
									<th className="py-2 font-medium">تیم</th>
									<th className="py-2 font-medium">کنش</th>
									<th className="py-2 font-medium">از نوبت</th>
									<th className="py-2 font-medium">تا نوبت</th>
									<th className="py-2 font-medium">تلاش</th>
									<th className="py-2 font-medium">موفق</th>
									<th className="py-2 font-medium">ناموفق</th>
									<th className="py-2 font-medium">مدت</th>
								</tr>
							</thead>
							<tbody className="tabular-nums">
								{visible.map((entry) => {
									const category = categoryLabel(entry.actionCategory);
									return (
										<tr
											key={`${entry.teamName}-${entry.actionCode}`}
											className="border-b border-slate-900/70 last:border-0"
										>
											<td className="py-2.5 align-top">
												<div className="text-slate-100">{entry.teamName}</div>
												{entry.sideName ? (
													<div className="text-[11px] text-slate-500">
														{entry.sideName}
													</div>
												) : null}
											</td>
											<td className="py-2.5 align-top">
												<div className="flex items-center gap-2">
													<span className="text-slate-100">
														{actionLabel(entry)}
													</span>
													{category ? (
														<Badge
															variant="outline"
															className="border-slate-700 text-[10px] text-slate-400"
														>
															{category}
														</Badge>
													) : null}
												</div>
												<div
													className="font-mono text-[11px] text-slate-600"
													dir="ltr"
												>
													{entry.actionCode}
												</div>
											</td>
											<td className="py-2.5 align-top text-slate-300">
												{faNum(entry.firstAttemptTurn)}
											</td>
											<td className="py-2.5 align-top text-slate-300">
												{entry.lastSuccessTurn === null
													? "—"
													: faNum(entry.lastSuccessTurn)}
											</td>
											<td className="py-2.5 align-top text-slate-300">
												{faNum(entry.attempts)}
											</td>
											<td className="py-2.5 align-top text-emerald-200">
												{faNum(entry.successes)}
											</td>
											<td className="py-2.5 align-top text-orange-200">
												{faNum(entry.failures)}
											</td>
											<td className="py-2.5 align-top">
												{entry.duration ? (
													<span className="font-bold text-slate-100">
														{durationLabel(entry)}
													</span>
												) : (
													<Badge
														variant="outline"
														className="border-amber-500/40 text-amber-100"
													>
														در جریان
													</Badge>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
