"use client";

import {
	Activity,
	CalendarCheck,
	Repeat,
	ShieldCheck,
	ShieldOff,
	Target,
	TrendingUp,
	Trophy,
} from "lucide-react";
import type { Scorecard } from "@/lib/gameSummary";

/**
 * What this team achieved, in the currency that fits what it was doing.
 *
 * A defender who never scores is not a team with "0". Blocking an attack,
 * repairing a breach and surviving a turn untouched are the defensive side of
 * the same game, and the end screen has to say so — a scoreboard that reads
 * zero for a good defensive game teaches the wrong lesson about defending.
 *
 * Every number here is counted from resolutions that actually happened. A stat
 * with nothing behind it is not rendered at all rather than shown as zero.
 */

const faNumber = (value: number): string => value.toLocaleString("fa-IR");

interface Stat {
	key: string;
	label: string;
	value: number;
	icon: typeof Trophy;
	tone: string;
	hint: string;
}

export interface GameReportScorecardProps {
	scorecard: Scorecard;
	resolveActionName: (code: string) => string;
	resolveSiteName: (siteId: string) => string | null;
	/** Attack codes this team is still open to, from the server's own state. */
	openVulnerabilities: Array<{ actionCode: string; attackers: string[] }>;
}

export function GameReportScorecard({
	scorecard,
	resolveActionName,
	resolveSiteName,
	openVulnerabilities,
}: GameReportScorecardProps) {
	const stats: Stat[] = [
		{
			key: "blocked",
			label: "حمله‌ای که سد کردید",
			value: scorecard.attacksBlocked,
			icon: ShieldCheck,
			tone: "text-sky-200",
			hint: "پادکنش شما جلوی حمله را گرفت و حریف اصلاً تاس نریخت.",
		},
		{
			key: "repairs",
			label: "آسیبی که ترمیم کردید",
			value: scorecard.repairsMade,
			icon: Repeat,
			tone: "text-emerald-200",
			hint: "هر ترمیم یعنی یک ضربهٔ مجانی را از دست حریف درآوردید.",
		},
		{
			key: "clean",
			label: "نوبت بدون آسیب",
			value: scorecard.cleanTurns,
			icon: CalendarCheck,
			tone: "text-cyan-200",
			hint: "نوبت‌هایی که هیچ حمله‌ای روی تیم شما ننشست.",
		},
		{
			key: "guard",
			label: "نوبتی که سد برقرار بود",
			value: scorecard.guardTurns,
			icon: ShieldCheck,
			tone: "text-cyan-200",
			hint: "دفاع خریده‌شده تمام نوبت سد است، حتی وقتی چیزی برای ترمیم نباشد.",
		},
		{
			key: "absorbed",
			label: "حمله‌ای که نشست",
			value: scorecard.attacksAbsorbed,
			icon: ShieldOff,
			tone: "text-orange-200",
			hint: "حمله‌هایی که از سد رد شدند و به تیم شما رسیدند.",
		},
		{
			key: "missed",
			label: "ترمیم ناموفق",
			value: scorecard.repairsMissed,
			icon: Activity,
			tone: "text-orange-200",
			hint: "تاس ترمیم ریخته شد و نگرفت؛ آسیب سر جایش ماند.",
		},
	].filter((stat) => stat.value > 0);

	const totalPlayed = scorecard.movesPlayed.reduce(
		(sum, move) => sum + move.played,
		0,
	);

	return (
		<div className="space-y-4">
			{scorecard.scoringMoves.length > 0 && (
				<section className="rounded-lg border border-violet-400/20 bg-violet-500/[0.06] p-4">
					<h3 className="flex items-center gap-2 text-sm font-black text-violet-100">
						<Trophy className="size-4" /> هر امتیازی که گرفتید
					</h3>
					<div className="mt-3 space-y-1.5">
						{scorecard.scoringMoves.map((move, index) => {
							const site = move.siteId ? resolveSiteName(move.siteId) : null;
							return (
								<div
									key={`${move.turn}-${move.actionCode}-${index}`}
									className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/8 bg-black/20 px-3 py-2 text-sm"
								>
									<div className="flex min-w-0 items-center gap-2">
										<span className="shrink-0 rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-400">
											نوبت {move.turn === null ? "؟" : faNumber(move.turn)}
										</span>
										<span className="min-w-0 truncate font-bold text-slate-100">
											{resolveActionName(move.actionCode)}
										</span>
										{site && (
											<span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-slate-500">
												<Target className="size-3" /> {site}
											</span>
										)}
									</div>
									<span className="shrink-0 tabular-nums font-black text-violet-200">
										+{faNumber(move.points)}
									</span>
								</div>
							);
						})}
					</div>
					<div className="mt-3 border-t border-white/8 pt-2 text-xs text-slate-400">
						مجموع{" "}
						<b className="tabular-nums text-violet-100">
							{faNumber(scorecard.points)}
						</b>{" "}
						امتیاز از {faNumber(scorecard.scoringMoves.length)} حرکت امتیازآور
					</div>
				</section>
			)}

			{stats.length > 0 && (
				<section className="rounded-lg border border-white/10 bg-[#0d121c] p-4">
					<h3 className="flex items-center gap-2 text-sm font-black text-slate-200">
						<ShieldCheck className="size-4 text-sky-300" /> کارنامهٔ دفاعی
					</h3>
					{scorecard.points === 0 && (
						<p className="mt-1.5 text-[11px] leading-6 text-slate-400">
							امتیاز تنها واحد ارزش این بازی نیست. آنچه سد کردید و ترمیم کردید،
							همان چیزی است که نگذاشت حریف زودتر به حد نصاب برسد.
						</p>
					)}
					<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{stats.map((stat) => (
							<div
								key={stat.key}
								className="rounded-xl border border-white/8 bg-black/20 p-3"
							>
								<div className="flex items-center gap-2 text-[11px] text-slate-400">
									<stat.icon className={`size-3.5 ${stat.tone}`} /> {stat.label}
								</div>
								<div
									className={`mt-1 text-2xl font-black tabular-nums ${stat.tone}`}
								>
									{faNumber(stat.value)}
								</div>
								<div className="mt-1 text-[10px] leading-5 text-slate-500">
									{stat.hint}
								</div>
							</div>
						))}
					</div>
				</section>
			)}

			{openVulnerabilities.length > 0 && (
				<section className="rounded-lg border border-amber-400/25 bg-amber-500/[0.07] p-4">
					<h3 className="flex items-center gap-2 text-sm font-black text-amber-100">
						<ShieldOff className="size-4" /> آسیبی که تا پایان باز ماند
					</h3>
					<p className="mt-1.5 text-[11px] leading-6 text-amber-100/75">
						این حمله‌ها تا لحظهٔ پایان ترمیم نشده بودند؛ اگر بازی ادامه داشت، هر
						بار بدون تاس می‌نشستند.
					</p>
					<div className="mt-2 flex flex-wrap gap-1.5">
						{openVulnerabilities.map((item) => (
							<span
								key={item.actionCode}
								className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/25 bg-black/20 px-2 py-1 text-[11px] text-amber-50"
							>
								{resolveActionName(item.actionCode)}
								{item.attackers.length > 0 && (
									<span className="text-amber-200/60">
										· از {item.attackers.join("، ")}
									</span>
								)}
							</span>
						))}
					</div>
				</section>
			)}

			{scorecard.movesPlayed.length > 0 && (
				<section className="rounded-lg border border-white/10 bg-[#0d121c] p-4">
					<h3 className="flex items-center gap-2 text-sm font-black text-slate-200">
						<TrendingUp className="size-4 text-cyan-300" /> چه چیزی بازی کردید
					</h3>
					<div className="mt-3 space-y-2">
						{scorecard.movesPlayed.map((move) => {
							const share = totalPlayed > 0 ? move.played / totalPlayed : 0;
							return (
								<div key={move.actionCode}>
									<div className="flex flex-wrap items-center justify-between gap-2 text-xs">
										<span className="min-w-0 truncate font-bold text-slate-200">
											{resolveActionName(move.actionCode)}
										</span>
										<span className="shrink-0 tabular-nums text-slate-400">
											{faNumber(move.played)} بار · {faNumber(move.succeeded)}{" "}
											موفق
											{move.points > 0 && (
												<span className="text-violet-200">
													{" "}
													· {faNumber(move.points)} امتیاز
												</span>
											)}
										</span>
									</div>
									<div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/40">
										<div
											className="h-full rounded-full bg-cyan-400/70"
											style={{ width: `${Math.round(share * 100)}%` }}
										/>
									</div>
								</div>
							);
						})}
					</div>

					{scorecard.favourite && (
						<div
							className={`mt-3 rounded-xl border px-3 py-2 text-[11px] leading-6 ${
								scorecard.favourite.share >= 0.6
									? "border-orange-400/25 bg-orange-500/[0.08] text-orange-100"
									: "border-emerald-400/20 bg-emerald-500/[0.06] text-emerald-100"
							}`}
						>
							{scorecard.favourite.share >= 0.6 ? (
								<>
									<b>قابل پیش‌بینی بودید.</b> «
									{resolveActionName(scorecard.favourite.actionCode)}» را در{" "}
									{faNumber(Math.round(scorecard.favourite.share * 100))}٪
									نوبت‌ها بازی کردید. وقتی هیچ حرکتی به‌تنهایی بهترین نیست، تنها
									اشتباهی که حریف می‌تواند تنبیهش کند همین است.
								</>
							) : (
								<>
									<b>انتخاب‌هایتان پخش بود.</b> پرتکرارترین حرکتتان فقط{" "}
									{faNumber(Math.round(scorecard.favourite.share * 100))}٪
									نوبت‌ها بود، پس حریف نمی‌توانست روی یک حرکت حساب کند.
								</>
							)}
						</div>
					)}
				</section>
			)}

			{scorecard.points === 0 &&
				stats.length === 0 &&
				scorecard.movesPlayed.length === 0 && (
					<div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-slate-500">
						از این بازی رویدادی برای تیم شما ثبت نشده است.
					</div>
				)}
		</div>
	);
}
