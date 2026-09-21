"use client";

import type {
	ActionConfigRequest,
	BlackMarketItemRequest,
	ConfigureAllRequestV2,
} from "@workspace/trpc";
import {
	createPlanAction,
	planActionUsage,
	planCounterValue,
	planIdsInUse,
	removePlanAction,
	renamePlanActionCode,
	setPlanCounter,
	uniquePlanId,
} from "@workspace/trpc";
import { Button } from "@workspace/ui/components/button";
import { Plus, ShieldHalf, Store, Swords, Waypoints } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	buildSummaryLookups,
	describeEntity,
	EntitySummaryCard,
	EntitySummaryHeader,
} from "@/components/CollectionSummary";
import { ConfirmRemove } from "./ConfirmRemove";
import {
	faNum,
	NumberField,
	NumberInput,
	Section,
	SelectField,
	TextField,
} from "./fields";
import { JsonToggle } from "./JsonToggle";
import { ACTION_TYPE_FA, actionNameFa, optionsOf } from "./labels";

/**
 * کنش‌ها - everything a team can play or buy, in one place.
 *
 * Actions are the verbs of the game and are designed first; the campaign tree
 * only decides where they are played. Counters and the black market are
 * both defined in terms of actions, so they sit beside them.
 */

type ArsenalSection = "actions" | "counters" | "market";

export interface ArsenalFocus {
	code: string;
	nonce: number;
}

export function Arsenal({
	plan,
	onChange,
	focus,
}: {
	plan: ConfigureAllRequestV2;
	onChange: (plan: ConfigureAllRequestV2) => void;
	focus?: ArsenalFocus | null;
}) {
	const [section, setSection] = useState<ArsenalSection>("actions");
	const [selectedAction, setSelectedAction] = useState<string | null>(
		plan.actions[0]?.code ?? null,
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: react to a new focus request only
	useEffect(() => {
		if (!focus) return;
		setSection("actions");
		setSelectedAction(focus.code);
	}, [focus?.nonce]);

	const tabs: Array<{ key: ArsenalSection; label: string; count: number }> = [
		{ key: "actions", label: "حمله و دفاع", count: plan.actions.length },
		{
			key: "counters",
			label: "مقابله‌ها",
			count: (plan.action_counters ?? []).reduce(
				(sum, counter) => sum + (counter.countered_by?.length ?? 0),
				0,
			),
		},
		{
			key: "market",
			label: "بازار سیاه",
			count: plan.black_market?.length ?? 0,
		},
	];

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-2">
				{tabs.map((tab) => (
					<button
						key={tab.key}
						type="button"
						onClick={() => setSection(tab.key)}
						className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition ${section === tab.key ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-50" : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-100"}`}
					>
						{tab.label}
						<span className="rounded-md bg-white/10 px-1.5 text-[11px] tabular-nums">
							{faNum(tab.count)}
						</span>
					</button>
				))}
			</div>

			{section === "actions" && (
				<ActionsSection
					plan={plan}
					onChange={onChange}
					selected={selectedAction}
					onSelect={setSelectedAction}
				/>
			)}
			{section === "counters" && (
				<CountersSection plan={plan} onChange={onChange} />
			)}
			{section === "market" && (
				<MarketSection plan={plan} onChange={onChange} />
			)}
		</div>
	);
}

/* ----------------------------------------------------------------- actions */

function ActionsSection({
	plan,
	onChange,
	selected,
	onSelect,
}: {
	plan: ConfigureAllRequestV2;
	onChange: (plan: ConfigureAllRequestV2) => void;
	selected: string | null;
	onSelect: (code: string | null) => void;
}) {
	const lookups = useMemo(() => buildSummaryLookups(plan), [plan]);
	const action = plan.actions.find((item) => item.code === selected) ?? null;

	const column = (type: "attack" | "defense") => {
		const list = plan.actions.filter((item) => item.type === type);
		return (
			<div className="min-w-0 space-y-2">
				<div className="flex items-center justify-between">
					<div
						className={`flex items-center gap-2 text-sm font-black ${type === "attack" ? "text-rose-200" : "text-sky-200"}`}
					>
						{type === "attack" ? (
							<Swords className="size-4" />
						) : (
							<ShieldHalf className="size-4" />
						)}
						{type === "attack" ? "حمله" : "دفاع"} ({faNum(list.length)})
					</div>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => {
							const created = createPlanAction(plan, type);
							onChange(created.plan);
							onSelect(created.code);
						}}
						className="h-7 border-white/10 bg-white/[0.03] text-xs"
					>
						<Plus className="size-3.5" /> افزودن
					</Button>
				</div>
				{list.map((item, index) => (
					<button
						key={item.code}
						type="button"
						onClick={() => onSelect(item.code)}
						className={`block w-full rounded-xl border p-3 text-right transition ${selected === item.code ? "border-cyan-400/50 bg-cyan-400/10" : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"}`}
					>
						<EntitySummaryCard
							summary={describeEntity("actions", item, index, lookups)}
						/>
					</button>
				))}
			</div>
		);
	};

	return (
		<div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
			<div className="grid min-w-0 gap-4 rounded-3xl border border-white/10 bg-slate-950/55 p-4 md:grid-cols-2">
				{column("attack")}
				{column("defense")}
			</div>
			{action ? (
				<ActionInspector
					key={action.code}
					plan={plan}
					action={action}
					onChange={onChange}
					onSelect={onSelect}
				/>
			) : (
				<div className="grid min-h-60 place-items-center rounded-3xl border border-dashed border-white/10 p-8 text-slate-500">
					یک کنش را انتخاب کنید.
				</div>
			)}
		</div>
	);
}

function ActionInspector({
	plan,
	action,
	onChange,
	onSelect,
}: {
	plan: ConfigureAllRequestV2;
	action: ActionConfigRequest;
	onChange: (plan: ConfigureAllRequestV2) => void;
	onSelect: (code: string | null) => void;
}) {
	const [codeError, setCodeError] = useState<string | null>(null);
	const lookups = useMemo(() => buildSummaryLookups(plan), [plan]);
	const usage = planActionUsage(plan, action.code);

	const replace = (next: ActionConfigRequest) =>
		onChange({
			...plan,
			actions: plan.actions.map((item) =>
				item.code === action.code ? next : item,
			),
		});
	const patch = (changes: Partial<ActionConfigRequest>) =>
		replace({ ...action, ...changes });
	const patchStats = (changes: Partial<ActionConfigRequest["base_stats"]>) =>
		patch({ base_stats: { ...action.base_stats, ...changes } });

	const blockers = [
		usage.blackMarket.length > 0
			? `${faNum(usage.blackMarket.length)} آیتم بازار سیاه`
			: null,
		usage.impactRules > 0 ? `${faNum(usage.impactRules)} قانون اثرگذاری` : null,
	].filter((line): line is string => line !== null);

	return (
		<div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/55 p-5">
			<EntitySummaryHeader
				summary={describeEntity("actions", action, 0, lookups)}
			/>

			<div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-xs leading-6 text-slate-400">
				{usage.steps > 0
					? `در ${faNum(usage.steps)} گام از ${faNum(usage.scenarios)} سناریو استفاده شده`
					: "هنوز در هیچ سناریویی استفاده نشده — از «اهداف و سناریوها» به یک سناریو اضافه‌اش کنید"}
				{usage.counters > 0 && ` · ${faNum(usage.counters)} مقابله`}
				{usage.blackMarket.length > 0 &&
					` · هدف ${faNum(usage.blackMarket.length)} آیتم بازار سیاه`}
			</div>

			<Section title="مشخصات">
				<div className="grid gap-3 md:grid-cols-2">
					<TextField
						label="نام"
						value={action.name_fa}
						onCommit={(value) => patch({ name_fa: value })}
					/>
					<TextField
						label="نام انگلیسی"
						dir="ltr"
						value={action.name}
						onCommit={(value) => patch({ name: value })}
					/>
					<TextField
						label="کد"
						dir="ltr"
						mono
						value={action.code}
						error={codeError}
						hint="کد در گام‌ها، مقابله‌ها و بازار سیاه هم عوض می‌شود."
						onCommit={(value) => {
							const result = renamePlanActionCode(plan, action.code, value);
							if (!result.ok) {
								setCodeError(
									result.reason === "taken"
										? "این کد قبلاً استفاده شده است."
										: "کد نمی‌تواند خالی باشد.",
								);
								return;
							}
							setCodeError(null);
							onChange(result.plan);
							onSelect(value.trim());
						}}
					/>
					<SelectField
						label="نوع"
						value={action.type}
						options={optionsOf(ACTION_TYPE_FA)}
						onChange={(value) =>
							value &&
							patch({
								type: value as ActionConfigRequest["type"],
								type_fa: ACTION_TYPE_FA[value],
							})
						}
					/>
				</div>
			</Section>

			<Section title="اعداد">
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<NumberField
						label="هزینه"
						value={action.base_stats.cost}
						min={0}
						suffix="اعتبار"
						onCommit={(value) => patchStats({ cost: value ?? 0 })}
					/>
					<NumberField
						label="شانس موفقیت"
						value={action.base_stats.success_probability}
						min={0}
						max={100}
						suffix="٪"
						onCommit={(value) =>
							patchStats({ success_probability: value ?? 0 })
						}
					/>
					<NumberField
						label="امتیاز در موفقیت"
						value={action.base_stats.points_on_success ?? null}
						min={0}
						onCommit={(value) => patchStats({ points_on_success: value ?? 0 })}
					/>
					<NumberField
						label="فاصلهٔ تکرار"
						value={action.base_stats.cooldown_turns ?? null}
						min={0}
						suffix="نوبت"
						onCommit={(value) => patchStats({ cooldown_turns: value ?? 0 })}
					/>
				</div>
				<div className="mt-3">
					<TextField
						label="توضیح برای بازیکن"
						multiline
						value={action.description_fa}
						onCommit={(value) => patch({ description_fa: value })}
					/>
				</div>
			</Section>

			<div className="flex flex-wrap items-start gap-2 border-t border-white/5 pt-4">
				<ConfirmRemove
					title={`حذف کنش «${actionNameFa(plan, action.code)}»`}
					consequences={[
						usage.steps > 0
							? `${faNum(usage.steps)} گام در ${faNum(usage.scenarios)} سناریو`
							: null,
						usage.counters > 0 ? `${faNum(usage.counters)} مقابله` : null,
					].filter((line): line is string => line !== null)}
					blockedReason={
						blockers.length > 0
							? `این کنش هدف ${blockers.join(" و ")} است. ابتدا آن‌ها را به کنش دیگری وصل یا حذف کنید.`
							: null
					}
					onConfirm={() => {
						onChange(removePlanAction(plan, action.code));
						onSelect(null);
					}}
				/>
				<div className="min-w-0 flex-1">
					<JsonToggle
						value={action}
						onApply={(next) => replace(next)}
						validate={(parsed) =>
							typeof (parsed as { code?: unknown })?.code !== "string"
								? "فیلد code الزامی است."
								: (parsed as { code: string }).code !== action.code
									? "برای تغییر کد از فیلد «کد» استفاده کنید تا ارجاع‌ها هم عوض شوند."
									: null
						}
					/>
				</div>
			</div>
		</div>
	);
}

/* ---------------------------------------------------------------- counters */

function CountersSection({
	plan,
	onChange,
}: {
	plan: ConfigureAllRequestV2;
	onChange: (plan: ConfigureAllRequestV2) => void;
}) {
	const attacks = plan.actions.filter((item) => item.type === "attack");
	const defenses = plan.actions.filter((item) => item.type === "defense");

	return (
		<div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/55 p-5">
			<div className="flex items-start gap-3">
				<Waypoints className="mt-1 size-5 shrink-0 text-violet-300" />
				<p className="text-sm leading-7 text-slate-400">
					هر خانه می‌گوید اگر مدافع آن دفاع را انتخاب کند، شانس موفقیت آن حمله
					چند درصد کم می‌شود. خانهٔ خالی یعنی این دفاع روی این حمله اثری ندارد.
				</p>
			</div>
			{attacks.length === 0 || defenses.length === 0 ? (
				<div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-500">
					برای تعریف مقابله، دست‌کم یک کنش تهاجمی و یک کنش دفاعی لازم است.
				</div>
			) : (
				<div className="overflow-x-auto rounded-xl border border-white/8">
					<table className="w-full border-collapse text-sm">
						<thead>
							<tr className="bg-white/[0.03]">
								<th className="sticky right-0 bg-slate-950 px-3 py-2 text-right text-[11px] text-slate-500">
									حمله ↓ / دفاع ←
								</th>
								{defenses.map((defense) => (
									<th
										key={defense.code}
										className="min-w-28 px-2 py-2 text-center text-[11px] font-bold text-sky-200"
									>
										{actionNameFa(plan, defense.code)}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{attacks.map((attack) => (
								<tr key={attack.code} className="border-t border-white/5">
									<th className="sticky right-0 bg-slate-950 px-3 py-2 text-right text-xs font-bold text-rose-200">
										{actionNameFa(plan, attack.code)}
									</th>
									{defenses.map((defense) => (
										<td key={defense.code} className="px-2 py-1.5">
											<NumberInput
												value={planCounterValue(
													plan,
													attack.code,
													defense.code,
												)}
												allowEmpty
												min={0}
												max={100}
												suffix="٪"
												placeholder="—"
												ariaLabel={`اثر ${actionNameFa(plan, defense.code)} روی ${actionNameFa(plan, attack.code)}`}
												onCommit={(value) =>
													onChange(
														setPlanCounter(
															plan,
															attack.code,
															defense.code,
															value,
														),
													)
												}
											/>
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			<JsonToggle
				label="ویرایش JSON مقابله‌ها"
				value={plan.action_counters ?? []}
				validate={(parsed) =>
					Array.isArray(parsed) ? null : "مقدار باید یک آرایهٔ JSON باشد."
				}
				onApply={(next) => onChange({ ...plan, action_counters: next })}
			/>
		</div>
	);
}

/* ------------------------------------------------------------ black market */

const EFFECT_TYPE_FA: Record<string, string> = {
	probability_increase: "افزایش شانس موفقیت",
	PROBABILITY_MODIFIER: "تغییر شانس موفقیت",
	cost_decrease: "کاهش هزینه",
	REDUCE_VISIBILITY: "کاهش ردپا",
	SKIP_STEP: "پرش از یک گام",
	REMOVE_ACTIVE_EFFECT: "حذف اثر فعال",
};

function MarketSection({
	plan,
	onChange,
}: {
	plan: ConfigureAllRequestV2;
	onChange: (plan: ConfigureAllRequestV2) => void;
}) {
	const items = plan.black_market ?? [];
	const [selected, setSelected] = useState<string | null>(
		items[0]?.code ?? null,
	);
	const lookups = useMemo(() => buildSummaryLookups(plan), [plan]);
	const item = items.find((entry) => entry.code === selected) ?? null;

	const add = () => {
		const code = uniquePlanId("BM_NEW", planIdsInUse(plan));
		const next: BlackMarketItemRequest = {
			code,
			name: "New item",
			name_fa: "آیتم جدید",
			item_type: "attack_modifier",
			item_type_fa: "تقویت حمله",
			effect_type: "probability_increase",
			effect: { value: 10 },
			duration_turns: 1,
			cost: 20,
			availability: { start_turn: 1, max_purchases: 1 },
			stackable: false,
		};
		onChange({ ...plan, black_market: [...items, next] });
		setSelected(code);
	};

	return (
		<div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
			<div className="min-w-0 space-y-2 rounded-3xl border border-white/10 bg-slate-950/55 p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 text-sm font-black text-amber-200">
						<Store className="size-4" /> آیتم‌ها ({faNum(items.length)})
					</div>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={add}
						className="h-7 border-white/10 bg-white/[0.03] text-xs"
					>
						<Plus className="size-3.5" /> افزودن
					</Button>
				</div>
				{items.map((entry, index) => (
					<button
						key={entry.code}
						type="button"
						onClick={() => setSelected(entry.code)}
						className={`block w-full rounded-xl border p-3 text-right transition ${selected === entry.code ? "border-cyan-400/50 bg-cyan-400/10" : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"}`}
					>
						<EntitySummaryCard
							summary={describeEntity("black_market", entry, index, lookups)}
						/>
					</button>
				))}
				{items.length === 0 && (
					<p className="p-4 text-center text-sm text-slate-500">
						در این برنامه آیتمی برای بازار سیاه تعریف نشده است.
					</p>
				)}
			</div>
			{item ? (
				<MarketInspector
					key={item.code}
					plan={plan}
					item={item}
					onChange={onChange}
					onSelect={setSelected}
				/>
			) : (
				<div className="grid min-h-60 place-items-center rounded-3xl border border-dashed border-white/10 p-8 text-slate-500">
					یک آیتم را انتخاب کنید.
				</div>
			)}
		</div>
	);
}

function MarketInspector({
	plan,
	item,
	onChange,
	onSelect,
}: {
	plan: ConfigureAllRequestV2;
	item: BlackMarketItemRequest;
	onChange: (plan: ConfigureAllRequestV2) => void;
	onSelect: (code: string | null) => void;
}) {
	const [codeError, setCodeError] = useState<string | null>(null);
	const lookups = useMemo(() => buildSummaryLookups(plan), [plan]);
	const items = plan.black_market ?? [];
	const replace = (next: BlackMarketItemRequest) =>
		onChange({
			...plan,
			black_market: items.map((entry) =>
				entry.code === item.code ? next : entry,
			),
		});
	const patch = (changes: Partial<BlackMarketItemRequest>) =>
		replace({ ...item, ...changes });
	const availability = (item.availability ?? {}) as Record<string, unknown>;
	const patchAvailability = (key: string, value: number | null) => {
		const next = { ...availability };
		if (value === null) delete next[key];
		else next[key] = value;
		patch({ availability: next });
	};
	const effectOptions = optionsOf(EFFECT_TYPE_FA);
	if (!EFFECT_TYPE_FA[item.effect_type])
		effectOptions.push({ value: item.effect_type, label: item.effect_type });

	return (
		<div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/55 p-5">
			<EntitySummaryHeader
				summary={describeEntity("black_market", item, 0, lookups)}
			/>

			<Section title="مشخصات">
				<div className="grid gap-3 md:grid-cols-2">
					<TextField
						label="نام"
						value={item.name_fa}
						onCommit={(value) => patch({ name_fa: value })}
					/>
					<TextField
						label="نام انگلیسی"
						dir="ltr"
						value={item.name}
						onCommit={(value) => patch({ name: value })}
					/>
					<TextField
						label="کد"
						dir="ltr"
						mono
						value={item.code}
						error={codeError}
						onCommit={(value) => {
							const next = value.trim();
							if (!next) return setCodeError("کد نمی‌تواند خالی باشد.");
							if (next !== item.code && planIdsInUse(plan).has(next))
								return setCodeError("این کد قبلاً استفاده شده است.");
							setCodeError(null);
							patch({ code: next });
							onSelect(next);
						}}
					/>
					<TextField
						label="دسته"
						value={item.item_type_fa}
						onCommit={(value) => patch({ item_type_fa: value })}
					/>
				</div>
				<div className="mt-3">
					<TextField
						label="توضیح برای بازیکن"
						multiline
						value={item.description_fa}
						onCommit={(value) => patch({ description_fa: value })}
					/>
				</div>
			</Section>

			<Section title="اثر و قیمت">
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<SelectField
						label="نوع اثر"
						value={item.effect_type}
						options={effectOptions}
						onChange={(value) => value && patch({ effect_type: value })}
					/>
					<NumberField
						label="مقدار اثر"
						value={item.effect?.value ?? null}
						onCommit={(value) =>
							patch({ effect: { ...item.effect, value: value ?? 0 } })
						}
					/>
					<SelectField
						label="کنش هدف"
						value={item.target?.action_code ?? null}
						allowNone
						noneLabel="بدون کنش هدف"
						options={plan.actions.map((action) => ({
							value: action.code,
							label: actionNameFa(plan, action.code),
							hint: ACTION_TYPE_FA[action.type],
						}))}
						onChange={(value) => {
							const action = plan.actions.find((entry) => entry.code === value);
							patch({
								target: action
									? {
											...item.target,
											action_code: action.code,
											action_type: action.type,
											action_type_fa: ACTION_TYPE_FA[action.type],
										}
									: {},
							});
						}}
					/>
					<NumberField
						label="قیمت"
						value={item.cost}
						min={0}
						suffix="اعتبار"
						onCommit={(value) => patch({ cost: value ?? 0 })}
					/>
					<NumberField
						label="مدت اثر"
						value={item.duration_turns ?? null}
						min={0}
						suffix="نوبت"
						allowEmpty
						onCommit={(value) => patch({ duration_turns: value })}
					/>
				</div>
			</Section>

			<Section title="دسترسی">
				<div className="grid gap-3 sm:grid-cols-3">
					<NumberField
						label="از نوبت"
						value={(availability.start_turn as number | undefined) ?? null}
						min={1}
						allowEmpty
						onCommit={(value) => patchAvailability("start_turn", value)}
					/>
					<NumberField
						label="تا نوبت"
						value={(availability.end_turn as number | undefined) ?? null}
						min={1}
						allowEmpty
						onCommit={(value) => patchAvailability("end_turn", value)}
					/>
					<NumberField
						label="حداکثر خرید"
						value={(availability.max_purchases as number | undefined) ?? null}
						min={1}
						allowEmpty
						onCommit={(value) => patchAvailability("max_purchases", value)}
					/>
				</div>
			</Section>

			<div className="flex flex-wrap items-start gap-2 border-t border-white/5 pt-4">
				<ConfirmRemove
					title={`حذف آیتم «${item.name_fa || item.name || item.code}»`}
					consequences={[]}
					onConfirm={() => {
						onChange({
							...plan,
							black_market: items.filter((entry) => entry.code !== item.code),
						});
						onSelect(null);
					}}
				/>
				<div className="min-w-0 flex-1">
					<JsonToggle
						value={item}
						onApply={(next) => replace(next)}
						validate={(parsed) =>
							typeof (parsed as { code?: unknown })?.code !== "string"
								? "فیلد code الزامی است."
								: null
						}
					/>
				</div>
			</div>
		</div>
	);
}
