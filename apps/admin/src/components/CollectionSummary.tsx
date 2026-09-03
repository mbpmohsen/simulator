"use client";

import { buildEquilibrium } from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import {
	Coins,
	Gauge,
	Layers,
	Link2,
	ListOrdered,
	Scale,
	ShieldHalf,
	Sparkles,
	Swords,
	Target,
	TriangleAlert,
	Trophy,
	Zap,
} from "lucide-react";
import type { ReactNode } from "react";

/**
 * Turns one raw plan entity into the handful of facts worth showing on a card.
 *
 * The builder screen edits eight different collections through a single generic
 * editor, so everything here is a lookup keyed by collection with a plain
 * fallback - an unrecognised collection still renders, just without chips.
 */

export type SummaryTone = "attack" | "defense" | "market" | "structure";

export type ChipTone =
	| "cost"
	| "chance"
	| "points"
	| "value"
	| "meta"
	| "warn";

export interface SummaryChip {
	icon: ReactNode;
	label: string;
	tone: ChipTone;
}

export interface EntitySummary {
	title: string;
	code: string;
	tone: SummaryTone;
	badges: string[];
	chips: SummaryChip[];
	description: string | null;
	warning: string | null;
}

type Rec = Record<string, unknown>;

const rec = (value: unknown): Rec | null =>
	value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Rec)
		: null;

const str = (value: unknown): string | null =>
	typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const num = (value: unknown): number | null =>
	typeof value === "number" && Number.isFinite(value) ? value : null;

const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const fa = (value: number, digits = 0): string =>
	value.toLocaleString("fa-IR", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
	});

const localized = (item: Rec, ...keys: string[]): string | null => {
	for (const key of keys) {
		const value = str(item[`${key}_fa`]) ?? str(item[key]);
		if (value) return value;
	}
	return null;
};

const riskLabel = (probability: number): string => {
	if (probability >= 70) return "شانس بالا";
	if (probability >= 45) return "شانس متوسط";
	return "ریسک بالا";
};

/* ------------------------------------------------------------------ lookups */

export interface SummaryLookups {
	actionName: (code: string | null) => string | null;
	actionKind: (code: string | null) => "attack" | "defense" | null;
	titleOf: (collection: string, id: string | null) => string | null;
	stepCount: (scenarioId: string | null) => number;
	/**
	 * The solved game, not a heuristic. Comparing raw expected values misses the
	 * counter structure entirely - two moves can have different expected points
	 * and still both be worth playing, because they counter different things.
	 */
	equilibrium: {
		solvable: boolean;
		weight: (code: string | null) => number | null;
		dominated: (code: string | null) => boolean;
	};
}

export const buildSummaryLookups = (plan: unknown): SummaryLookups => {
	const p = rec(plan) ?? {};
	const index = (key: string): Map<string, Rec> => {
		const map = new Map<string, Rec>();
		for (const raw of arr(p[key])) {
			const item = rec(raw);
			const id = item && (str(item.id) ?? str(item.code));
			if (item && id) map.set(id, item);
		}
		return map;
	};

	const actions = index("actions");
	const collections: Record<string, Map<string, Rec>> = {
		goals: index("goals"),
		subjects: index("subjects"),
		sub_subjects: index("sub_subjects"),
		scenarios: index("scenarios"),
		actions,
	};

	const stepsByScenario = new Map<string, number>();
	for (const raw of arr(p.scenario_steps)) {
		const step = rec(raw);
		const scenarioId = step && str(step.scenario_id);
		if (scenarioId) {
			stepsByScenario.set(scenarioId, (stepsByScenario.get(scenarioId) ?? 0) + 1);
		}
	}

	// A draft can be mid-edit and unsolvable; that is normal, not an error.
	const weights = new Map<string, { weight: number; dominated: boolean }>();
	let solvable = false;
	try {
		const eq = buildEquilibrium(p as never);
		solvable = eq.solvable;
		if (eq.solvable) {
			for (const strategy of [...eq.attacks, ...eq.defenses]) {
				weights.set(strategy.move.code, {
					weight: strategy.weight,
					dominated: strategy.dominated,
				});
			}
		}
	} catch {
		solvable = false;
	}

	return {
		actionName: (code) => {
			if (!code) return null;
			const action = actions.get(code);
			return action ? localized(action, "name") : null;
		},
		actionKind: (code) => {
			if (!code) return null;
			const type = str(actions.get(code)?.type);
			return type === "attack" || type === "defense" ? type : null;
		},
		titleOf: (collection, id) => {
			if (!id) return null;
			const item = collections[collection]?.get(id);
			return item ? localized(item, "title", "name", "display_name") : null;
		},
		stepCount: (scenarioId) =>
			scenarioId ? (stepsByScenario.get(scenarioId) ?? 0) : 0,
		equilibrium: {
			solvable,
			weight: (code) => (code ? (weights.get(code)?.weight ?? null) : null),
			dominated: (code) => (code ? (weights.get(code)?.dominated ?? false) : false),
		},
	};
};

/* ------------------------------------------------------------- the describer */

const chip = (icon: ReactNode, label: string, tone: ChipTone): SummaryChip => ({
	icon,
	label,
	tone,
});

const ICON = "size-3 shrink-0";

export const describeEntity = (
	collectionKey: string,
	item: Rec,
	index: number,
	lookups: SummaryLookups,
): EntitySummary => {
	const title =
		localized(item, "title", "name", "display_name") ??
		str(item.id) ??
		str(item.code) ??
		`مورد ${fa(index + 1)}`;
	const code = str(item.id) ?? str(item.code) ?? String(index);
	const description = localized(item, "description");

	const chips: SummaryChip[] = [];
	const badges: string[] = [];
	let tone: SummaryTone = "structure";
	let warning: string | null = null;

	switch (collectionKey) {
		case "actions": {
			const kind = str(item.type);
			tone = kind === "defense" ? "defense" : kind === "attack" ? "attack" : "structure";
			const typeLabel = localized(item, "type");
			if (typeLabel) badges.push(typeLabel);

			const stats = rec(item.base_stats);
			const cost = num(stats?.cost);
			const probability = num(stats?.success_probability);
			const points = num(stats?.points_on_success);
			const cooldown = num(stats?.cooldown_turns);

			if (cost !== null)
				chips.push(chip(<Coins className={ICON} />, `هزینه ${fa(cost)}`, "cost"));
			if (probability !== null)
				chips.push(
					chip(
						<Gauge className={ICON} />,
						`${riskLabel(probability)} · ${fa(probability)}٪`,
						"chance",
					),
				);
			if (points !== null)
				chips.push(
					chip(<Trophy className={ICON} />, `${fa(points)} امتیاز`, "points"),
				);

			if (probability !== null && points !== null) {
				const expected = (probability / 100) * points;
				chips.push(
					chip(
						<Scale className={ICON} />,
						`ارزش مورد انتظار ${fa(expected, 2)}`,
						"value",
					),
				);
			}

			// What the solver actually says about this move, rather than a guess
			// from its numbers alone.
			if (lookups.equilibrium.solvable) {
				const weight = lookups.equilibrium.weight(code);
				if (weight !== null) {
					chips.push(
						chip(
							<Sparkles className={ICON} />,
							`سهم در تعادل ${fa(weight * 100)}٪`,
							lookups.equilibrium.dominated(code) ? "warn" : "value",
						),
					);
				}
				if (lookups.equilibrium.dominated(code)) {
					warning =
						"این حرکت در تعادل بازی وزن صفر می‌گیرد؛ یک تیم منطقی هرگز آن را انتخاب نمی‌کند. امتیاز، شانس موفقیت یا ضدکنش‌هایش را بازنگری کنید.";
				}
			}
			if (cooldown !== null && cooldown > 0)
				chips.push(
					chip(<Layers className={ICON} />, `${fa(cooldown)} نوبت انتظار`, "meta"),
				);
			break;
		}

		case "black_market": {
			tone = "market";
			const typeLabel = localized(item, "item_type");
			if (typeLabel) badges.push(typeLabel);

			const cost = num(item.cost);
			if (cost !== null)
				chips.push(chip(<Coins className={ICON} />, `هزینه ${fa(cost)}`, "cost"));

			const effect = rec(item.effect);
			const effectValue = num(effect?.value);
			const effectType = str(item.effect_type);
			if (effectType)
				chips.push(
					chip(
						<Zap className={ICON} />,
						effectValue !== null
							? `${effectType} ${fa(effectValue)}`
							: effectType,
						"points",
					),
				);

			const targetCode = str(rec(item.target)?.action_code);
			const targetName = lookups.actionName(targetCode);
			if (targetName ?? targetCode)
				chips.push(
					chip(
						<Target className={ICON} />,
						`هدف: ${targetName ?? targetCode}`,
						"meta",
					),
				);

			const duration = num(item.duration_turns);
			if (duration !== null)
				chips.push(
					chip(<Layers className={ICON} />, `${fa(duration)} نوبت`, "meta"),
				);

			const availability = rec(item.availability);
			const from = num(availability?.start_turn ?? availability?.available_from_turn);
			if (from !== null)
				chips.push(
					chip(<ListOrdered className={ICON} />, `از نوبت ${fa(from)}`, "meta"),
				);
			break;
		}

		case "scenario_steps": {
			const actionCode = str(item.action_code);
			const kind = lookups.actionKind(actionCode);
			tone = kind === "defense" ? "defense" : kind === "attack" ? "attack" : "structure";

			const order = num(item.order);
			if (order !== null)
				chips.push(
					chip(<ListOrdered className={ICON} />, `ترتیب ${fa(order)}`, "meta"),
				);

			const actionName = lookups.actionName(actionCode);
			if (actionName ?? actionCode)
				chips.push(
					chip(
						kind === "defense" ? (
							<ShieldHalf className={ICON} />
						) : (
							<Swords className={ICON} />
						),
						actionName ?? (actionCode as string),
						"chance",
					),
				);

			if (item.required === true) badges.push("الزامی");

			const effects = arr(item.on_success).length;
			if (effects > 0)
				chips.push(
					chip(<Sparkles className={ICON} />, `${fa(effects)} اثر موفقیت`, "points"),
				);

			const deps = arr(item.depends_on).length;
			if (deps > 0)
				chips.push(
					chip(<Link2 className={ICON} />, `${fa(deps)} پیش‌نیاز`, "meta"),
				);
			break;
		}

		case "scenarios": {
			const typeLabel = localized(item, "scenario_type");
			if (typeLabel) badges.push(typeLabel);
			tone = str(item.scenario_type) === "defense_path" ? "defense" : "attack";

			const mode = localized(item, "execution_mode");
			if (mode) chips.push(chip(<Layers className={ICON} />, mode, "meta"));

			const steps = lookups.stepCount(str(item.id));
			if (steps > 0)
				chips.push(
					chip(<ListOrdered className={ICON} />, `${fa(steps)} گام`, "chance"),
				);

			const parent = lookups.titleOf("sub_subjects", str(item.sub_subject_id));
			if (parent)
				chips.push(chip(<Link2 className={ICON} />, parent, "meta"));

			const risk = localized(item, "risk_level");
			if (risk) chips.push(chip(<Gauge className={ICON} />, `ریسک ${risk}`, "warn"));
			break;
		}

		case "sub_subjects": {
			const share = num(item.progress_share);
			if (share !== null)
				chips.push(
					chip(<Scale className={ICON} />, `سهم ${fa(share)}٪`, "value"),
				);
			const parent = lookups.titleOf("subjects", str(item.subject_id));
			if (parent) chips.push(chip(<Link2 className={ICON} />, parent, "meta"));
			break;
		}

		case "subjects": {
			const typeLabel = localized(item, "subject_type");
			if (typeLabel) badges.push(typeLabel);
			const criticality = num(item.criticality);
			if (criticality !== null)
				chips.push(
					chip(<TriangleAlert className={ICON} />, `حساسیت ${fa(criticality)}`, "warn"),
				);
			const goal = lookups.titleOf("goals", str(item.goal_id));
			if (goal) chips.push(chip(<Target className={ICON} />, goal, "meta"));
			const target = num(item.target_team_id);
			if (target !== null)
				chips.push(chip(<Swords className={ICON} />, `تیم هدف ${target}`, "meta"));
			break;
		}

		case "goals": {
			const side = num(item.side_id);
			if (side !== null)
				chips.push(chip(<Target className={ICON} />, `سمت ${side}`, "meta"));
			break;
		}

		case "impact_rules": {
			const trigger = rec(item.trigger);
			const actionCode = str(trigger?.action_code);
			const actionName = lookups.actionName(actionCode);
			if (actionName ?? actionCode)
				chips.push(
					chip(
						<Zap className={ICON} />,
						`محرک: ${actionName ?? actionCode}`,
						"chance",
					),
				);
			const effects = arr(item.effects);
			for (const raw of effects.slice(0, 3)) {
				const effect = rec(raw);
				const type = str(effect?.type);
				if (type) chips.push(chip(<Sparkles className={ICON} />, type, "points"));
			}
			break;
		}

		default:
			break;
	}

	return { title, code, tone, badges, chips, description, warning };
};

/* ------------------------------------------------------------------- styling */

const CHIP_CLASS: Record<ChipTone, string> = {
	cost: "border-amber-400/15 bg-amber-400/[0.07] text-amber-100",
	chance: "border-cyan-400/15 bg-cyan-400/[0.07] text-cyan-100",
	points: "border-violet-400/15 bg-violet-400/[0.07] text-violet-100",
	value: "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-100",
	meta: "border-white/8 bg-white/[0.03] text-slate-300",
	warn: "border-orange-400/15 bg-orange-400/[0.07] text-orange-100",
};

const RAIL_CLASS: Record<SummaryTone, string> = {
	attack: "bg-rose-400/70",
	defense: "bg-sky-400/70",
	market: "bg-amber-400/70",
	structure: "bg-slate-500/50",
};

function Chips({ chips, limit }: { chips: SummaryChip[]; limit?: number }) {
	if (chips.length === 0) return null;
	// The list column is narrow; more than a few chips there wraps into a block
	// of colour and stops being scannable. The header below shows the full set.
	const shown = limit ? chips.slice(0, limit) : chips;
	const hidden = chips.length - shown.length;
	return (
		<div className="mt-2 flex flex-wrap gap-1.5">
			{shown.map((entry) => (
				<span
					key={`${entry.tone}-${entry.label}`}
					className={`inline-flex max-w-full items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-[10px] tabular-nums ${CHIP_CLASS[entry.tone]}`}
				>
					{entry.icon}
					<span className="truncate">{entry.label}</span>
				</span>
			))}
			{hidden > 0 && (
				<span className="inline-flex items-center rounded-md border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[10px] tabular-nums text-slate-500">
					+{fa(hidden)}
				</span>
			)}
		</div>
	);
}

/** Compact form, for the selectable list on the left. */
export function EntitySummaryCard({ summary }: { summary: EntitySummary }) {
	return (
		<div className="flex min-w-0 gap-2.5">
			<span
				aria-hidden="true"
				className={`w-1 shrink-0 rounded-full ${RAIL_CLASS[summary.tone]}`}
			/>
			<div className="min-w-0 flex-1">
				<div className="flex min-w-0 items-center gap-1.5">
					<span className="line-clamp-1 text-sm font-bold">{summary.title}</span>
					{summary.badges.slice(0, 1).map((badge) => (
						<span
							key={badge}
							className="shrink-0 rounded border border-white/10 bg-white/5 px-1 py-px text-[9px] text-slate-400"
						>
							{badge}
						</span>
					))}
				</div>
				<div
					dir="ltr"
					title={summary.code}
					className="mt-0.5 min-w-0 truncate text-left font-mono text-[10px] text-slate-500"
				>
					{summary.code}
				</div>
				<Chips chips={summary.chips} limit={3} />
			</div>
		</div>
	);
}

/** Expanded form, shown above the JSON editor so you see what you are editing. */
export function EntitySummaryHeader({ summary }: { summary: EntitySummary }) {
	return (
		<div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
			<div className="flex gap-3 p-4">
				<span
					aria-hidden="true"
					className={`w-1 shrink-0 rounded-full ${RAIL_CLASS[summary.tone]}`}
				/>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<h3 className="break-words text-base font-black text-slate-100">
							{summary.title}
						</h3>
						{summary.badges.map((badge) => (
							<Badge
								key={badge}
								variant="secondary"
								className="bg-white/5 text-[10px] text-slate-300"
							>
								{badge}
							</Badge>
						))}
					</div>
					<div
						dir="ltr"
						className="mt-1 truncate text-left font-mono text-[11px] text-slate-500"
					>
						{summary.code}
					</div>
					{summary.description && (
						<p className="mt-2 text-xs leading-6 text-slate-400">
							{summary.description}
						</p>
					)}
					<Chips chips={summary.chips} />
					{summary.warning && (
						<div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-500/[0.08] p-2.5 text-[11px] leading-5 text-amber-100">
							<TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
							<span>{summary.warning}</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
