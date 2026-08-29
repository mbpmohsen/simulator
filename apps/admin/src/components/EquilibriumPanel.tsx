"use client";

import type {
	ConfigureAllRequestV2,
	EquilibriumResult,
	EquilibriumStrategy,
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
	Ban,
	CircleAlert,
	Dices,
	RotateCcw,
	Scale,
	ShieldHalf,
	Swords,
	TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";

interface EquilibriumPanelProps {
	plan: ConfigureAllRequestV2;
}

const fa = (value: number, digits = 1): string =>
	value.toLocaleString("fa-IR", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
	});

const percent = (weight: number): string => `${fa(weight * 100, 1)}٪`;

const moveLabel = (strategy: EquilibriumStrategy): string =>
	getLocalized(strategy.move.name, strategy.move.nameFa);

const SIGNED = (value: number): string =>
	`${value >= 0 ? "+" : "−"}${fa(Math.abs(value), 2)}`;

interface MixCardProps {
	title: string;
	tone: "rose" | "sky";
	strategies: EquilibriumStrategy[];
	baseline?: EquilibriumStrategy[];
}

const MixCard = ({ title, tone, strategies, baseline }: MixCardProps) => {
	const accent =
		tone === "rose"
			? { bar: "bg-rose-400", ring: "border-rose-400/25", text: "text-rose-200" }
			: { bar: "bg-sky-400", ring: "border-sky-400/25", text: "text-sky-200" };
	return (
		<Card className={`h-full bg-slate-950/55 text-slate-100 ${accent.ring}`}>
			<CardHeader className="pb-3">
				<CardTitle className={`text-base font-black ${accent.text}`}>
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{strategies.map((strategy) => {
					const previous = baseline?.find(
						(item) => item.move.code === strategy.move.code,
					);
					const delta = previous ? strategy.weight - previous.weight : 0;
					return (
						<div key={strategy.move.code} className="space-y-1.5">
							<div className="flex items-baseline justify-between gap-3">
								<span className="truncate text-sm font-bold">
									{moveLabel(strategy)}
								</span>
								<span
									dir="ltr"
									className="shrink-0 font-mono text-xs tabular-nums text-slate-300"
								>
									{previous && Math.abs(delta) > 1e-6 ? (
										<>
											<span className="text-slate-600">
												{percent(previous.weight)}
											</span>
											<span className="mx-1 text-slate-600">←</span>
										</>
									) : null}
									{percent(strategy.weight)}
								</span>
							</div>
							<div className="h-2 overflow-hidden rounded-full bg-white/5">
								<motion.div
									className={`h-full ${accent.bar}`}
									initial={false}
									animate={{ width: `${Math.max(strategy.weight * 100, 0)}%` }}
									transition={{ duration: 0.4, ease: "easeOut" }}
								/>
							</div>
							<div className="flex items-center justify-between text-[11px] text-slate-500">
								<span dir="ltr" className="font-mono tabular-nums">
									{fa(strategy.move.cost, 0)} اعتبار ·{" "}
									{fa(strategy.move.successProbability, 0)}٪ ·{" "}
									{fa(strategy.move.points, 0)} امتیاز
								</span>
								{strategy.dominated && (
									<span className="text-amber-300">مغلوب</span>
								)}
							</div>
						</div>
					);
				})}
			</CardContent>
		</Card>
	);
};

const MatrixTable = ({ result }: { result: EquilibriumResult }) => {
	const counterOf = useMemo(() => {
		const map = new Map<string, number>();
		for (const counter of result.counters) {
			map.set(`${counter.attackCode} ${counter.defenseCode}`, counter.effectiveness);
		}
		return map;
	}, [result.counters]);

	return (
		<div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/55">
			<table className="w-full min-w-[560px] text-sm">
				<thead>
					<tr className="border-b border-white/10 text-[11px] text-slate-500">
						<th className="p-3 text-right font-medium">
							مهاجم ↓ / مدافع ←
						</th>
						{result.defenses.map((defense) => (
							<th
								key={defense.move.code}
								className="p-3 text-center font-medium text-sky-300"
							>
								{moveLabel(defense)}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{result.attacks.map((attack, row) => (
						<tr
							key={attack.move.code}
							className="border-b border-white/5 last:border-b-0"
						>
							<th className="p-3 text-right text-sm font-bold text-rose-300">
								{moveLabel(attack)}
							</th>
							{result.defenses.map((defense, column) => {
								const effectiveness = counterOf.get(
									`${attack.move.code} ${defense.move.code}`,
								);
								const value = result.attackPayoff[row]?.[column] ?? 0;
								return (
									<td
										key={defense.move.code}
										dir="ltr"
										className={`p-3 text-center font-mono text-sm tabular-nums ${
											effectiveness === undefined
												? "text-slate-300"
												: "bg-amber-400/10 font-bold text-amber-200"
										}`}
									>
										{fa(value, 3)}
										{effectiveness !== undefined && (
											<span className="mt-0.5 block text-[10px] font-normal text-amber-300/70">
												خنثی‌سازی {fa(effectiveness, 0)}٪
											</span>
										)}
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};

export default function EquilibriumPanel({ plan }: EquilibriumPanelProps) {
	const [banned, setBanned] = useState<string[]>([]);

	const baseline = useMemo(() => buildEquilibrium(plan), [plan]);
	const current = useMemo(
		() => buildEquilibrium(plan, { excludedActionCodes: banned }),
		[plan, banned],
	);

	const toggle = (code: string): void => {
		setBanned((codes) =>
			codes.includes(code)
				? codes.filter((item) => item !== code)
				: [...codes, code],
		);
	};

	const dominated = current.warnings.filter(
		(warning) => warning.code === "DOMINATED_MOVE",
	);
	const otherWarnings = current.warnings.filter(
		(warning) => warning.code !== "DOMINATED_MOVE",
	);
	const totalMoves = current.attacks.length + current.defenses.length;
	const inPlay = totalMoves - dominated.length;
	const isModified = banned.length > 0;

	if (!current.solvable) {
		return (
			<Card className="border-amber-400/25 bg-amber-500/[0.06] text-slate-100">
				<CardContent className="space-y-3 p-6">
					<div className="flex items-center gap-2 text-lg font-black text-amber-200">
						<TriangleAlert className="size-5" /> تعادل قابل محاسبه نیست
					</div>
					<ul className="space-y-1.5 text-sm text-slate-300">
						{current.warnings.map((warning) => (
							<li key={`${warning.code}-${warning.subject ?? "-"}`}>
								{warning.messageFa}
							</li>
						))}
					</ul>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-5">
			<Card className="overflow-hidden border-cyan-400/15 bg-gradient-to-l from-cyan-500/10 via-slate-950/80 to-violet-500/10 text-slate-100">
				<CardContent className="flex flex-col justify-between gap-6 p-6 lg:flex-row lg:items-center">
					<div className="max-w-2xl">
						<div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
							<Dices className="size-3.5" /> نقطهٔ تعادل نش
						</div>
						<h2 className="text-2xl font-black">
							اگر هر دو طرف بهینه بازی کنند، چه اتفاقی می‌افتد؟
						</h2>
						<p className="mt-2 text-sm leading-7 text-slate-400">
							این جدول از روی همین پیکربندی محاسبه می‌شود: هزینه، شانس موفقیت،
							امتیاز و اثربخشی ضدکنش‌ها. هیچ تماسی با سرور انجام نمی‌شود، پس
							می‌توانید پیش‌نویس را پیش از انتشار بسنجید.
						</p>
					</div>
					<div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-1">
						<div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
							<div className="text-[11px] text-slate-500">
								حرکت‌های واقعاً در بازی
							</div>
							<div className="mt-1 text-2xl font-black tabular-nums">
								{fa(inPlay, 0)}
								<span className="text-base text-slate-500">
									{" "}
									از {fa(totalMoves, 0)}
								</span>
							</div>
						</div>
						<div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
							<div className="text-[11px] text-slate-500">
								برتری خالص مهاجم در هر نوبت
							</div>
							<div
								dir="ltr"
								className={`mt-1 text-2xl font-black tabular-nums ${
									current.value >= 0 ? "text-rose-300" : "text-sky-300"
								}`}
							>
								{SIGNED(current.value)}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{dominated.length > 0 && (
				<Card className="border-amber-400/25 bg-amber-500/[0.06] text-slate-100">
					<CardContent className="space-y-2 p-5">
						<div className="flex items-center gap-2 font-black text-amber-200">
							<CircleAlert className="size-4" />
							{fa(dominated.length, 0)} حرکت هرگز انتخاب نمی‌شود
						</div>
						<p className="text-sm leading-7 text-slate-400">
							یک تیم منطقی این حرکت‌ها را بازی نمی‌کند، چون همیشه گزینهٔ بهتری
							هست. اگر می‌خواهید هر حرکت واقعاً استفاده شود، هزینه، شانس یا
							امتیاز آن را متعادل کنید.
						</p>
						<div className="flex flex-wrap gap-2 pt-1">
							{dominated.map((warning) => (
								<Badge
									key={warning.subject ?? warning.code}
									className="border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-200"
								>
									{warning.messageFa}
								</Badge>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{otherWarnings.length > 0 && (
				<Card className="border-white/10 bg-slate-950/55 text-slate-100">
					<CardContent className="space-y-1.5 p-5 text-sm text-slate-400">
						{otherWarnings.map((warning) => (
							<div
								key={`${warning.code}-${warning.subject ?? "-"}`}
								className="flex items-start gap-2"
							>
								<TriangleAlert className="mt-1 size-3.5 shrink-0 text-slate-500" />
								<span>{warning.messageFa}</span>
							</div>
						))}
					</CardContent>
				</Card>
			)}

			<div className="grid gap-4 lg:grid-cols-2">
				<MixCard
					title="راهبرد بهینهٔ مهاجم"
					tone="rose"
					strategies={current.attacks}
					baseline={isModified ? baseline.attacks : undefined}
				/>
				<MixCard
					title="راهبرد بهینهٔ مدافع"
					tone="sky"
					strategies={current.defenses}
					baseline={isModified ? baseline.defenses : undefined}
				/>
			</div>

			<Card className="border-white/10 bg-slate-950/40 text-slate-100">
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-base font-black">
						<Scale className="size-4 text-cyan-300" /> امتیاز مورد انتظار مهاجم
						در هر ترکیب
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<MatrixTable result={current} />
					<div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-slate-500">
						<span>
							<span className="ml-1.5 inline-block size-2.5 rounded-sm border border-amber-400/40 bg-amber-400/20 align-middle" />
							مدافع درست حدس زده و ضدکنش فعال شده است
						</span>
						<span dir="ltr" className="font-mono tabular-nums">
							امتیاز/نوبت — مهاجم {fa(current.attackerExpectedPoints, 2)} ·
							مدافع {fa(current.defenderExpectedPoints, 2)}
						</span>
						<span dir="ltr" className="font-mono tabular-nums">
							هزینه/نوبت — مهاجم {fa(current.attackerExpectedCost, 1)} · مدافع{" "}
							{fa(current.defenderExpectedCost, 1)}
						</span>
					</div>
				</CardContent>
			</Card>

			<Card className="border-white/10 bg-slate-950/40 text-slate-100">
				<CardHeader className="pb-3">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<CardTitle className="flex items-center gap-2 text-base font-black">
							<Ban className="size-4 text-amber-300" /> اگر دولت یک حرکت را
							ممنوع کند
						</CardTitle>
						{isModified && (
							<Button
								variant="outline"
								onClick={() => setBanned([])}
								className="border-white/10 bg-white/5 text-slate-200"
							>
								<RotateCcw className="size-4" /> بازگشت به حالت پایه
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm leading-7 text-slate-400">
						روی هر حرکت بزنید تا از بازی خارج شود و تعادل دوباره حل شود. این
						همان کاری است که دستور «ممنوع‌سازی کنش» دولت انجام می‌دهد.
					</p>
					<div className="space-y-3">
						{(
							[
								{
									label: "کنش‌های تهاجمی",
									icon: <Swords className="size-3.5 text-rose-300" />,
									items: baseline.attacks,
								},
								{
									label: "کنش‌های دفاعی",
									icon: <ShieldHalf className="size-3.5 text-sky-300" />,
									items: baseline.defenses,
								},
							] as const
						).map((group) => (
							<div key={group.label} className="space-y-2">
								<div className="flex items-center gap-2 text-[11px] text-slate-500">
									{group.icon} {group.label}
								</div>
								<div className="flex flex-wrap gap-2">
									{group.items.map((strategy) => {
										const isBanned = banned.includes(strategy.move.code);
										return (
											<button
												key={strategy.move.code}
												type="button"
												onClick={() => toggle(strategy.move.code)}
												aria-pressed={isBanned}
												className={`rounded-xl border px-3 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
													isBanned
														? "border-amber-400/40 bg-amber-400/15 text-amber-100 line-through"
														: "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:bg-white/[0.07]"
												}`}
											>
												{moveLabel(strategy)}
											</button>
										);
									})}
								</div>
							</div>
						))}
					</div>
					{isModified && (
						<div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] p-4 text-sm leading-7 text-slate-300">
							برتری خالص مهاجم از{" "}
							<span dir="ltr" className="font-mono tabular-nums">
								{SIGNED(baseline.value)}
							</span>{" "}
							به{" "}
							<span dir="ltr" className="font-mono tabular-nums">
								{SIGNED(current.value)}
							</span>{" "}
							تغییر کرد. ستون‌های بالا حالت پایه را در کنار حالت جدید نشان
							می‌دهند.
						</div>
					)}
				</CardContent>
			</Card>

			<p className="px-1 text-xs leading-6 text-slate-600">
				این تعادل بر اساس «برنامهٔ منتشرشده» محاسبه می‌شود. اثرهای فعال، آیتم‌های
				بازار سیاه و دستورهای دولت در حین بازی می‌توانند اعداد واقعی را تغییر
				دهند.
			</p>
		</div>
	);
}
