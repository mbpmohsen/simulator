"use client";

import type {
	ClientValidationIssue,
	ConfigureAllRequestV2,
	ExecutionMode,
	PlanNodeKind,
	ScenarioType,
	SubjectType,
} from "@workspace/trpc";
import {
	balancePlanShares,
	createPlanChild,
	createPlanGoal,
	PLAN_CHILD_KIND,
	PLAN_NODE_COLLECTION,
	PLAN_NODE_LABEL_FA,
	planActionsForSide,
	planAncestry,
	planIssuesById,
	planSideOfScenario,
	previewPlanRemoval,
	removePlanNode,
	renamePlanNode,
	scaffoldPlanLane,
	scenarioMoveRows,
} from "@workspace/trpc";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
	Boxes,
	ChevronDown,
	ChevronLeft,
	Crosshair,
	Flag,
	FolderTree,
	ListChecks,
	Plus,
	Scale,
	Search,
	ShieldHalf,
	Swords,
	TriangleAlert,
	Unlink,
	WandSparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
	buildSummaryLookups,
	describeEntity,
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
	ToggleField,
} from "./fields";
import { JsonToggle } from "./JsonToggle";
import {
	actionNameFa,
	EXECUTION_MODE_FA,
	optionsOf,
	playerTeamOptions,
	RISK_FA,
	SCENARIO_TYPE_FA,
	SUBJECT_TYPE_FA,
	sideName,
	sideOptions,
	titleFa,
} from "./labels";
import { StepGrid } from "./StepGrid";

/**
 * اهداف و سناریوها - the goal -> subject -> sub-subject -> scenario tree, edited
 * top-down in one place.
 *
 * The plan is stored as flat arrays joined by string ids. Editing those arrays
 * one tab at a time meant typing parent ids by hand, deleting a parent without
 * seeing its children, and learning about broken links only at publish. Here a
 * child is always created from its parent, removal shows what goes with it,
 * and every node carries its own live issues.
 */

export interface PlanFocus {
	kind: PlanNodeKind;
	id: string;
	nonce: number;
}

type Selection = { kind: PlanNodeKind; id: string } | null;

const nodeKey = (kind: PlanNodeKind, id: string) => `${kind}:${id}`;

const KIND_ICON: Record<PlanNodeKind, ReactNode> = {
	goal: <Flag className="size-4 shrink-0 text-violet-300" />,
	subject: <Crosshair className="size-4 shrink-0 text-cyan-300" />,
	sub_subject: <Boxes className="size-4 shrink-0 text-emerald-300" />,
	scenario: <Swords className="size-4 shrink-0 text-rose-300" />,
	step: <ListChecks className="size-4 shrink-0 text-slate-300" />,
};

const SUMMARY_KEY: Record<PlanNodeKind, string> = {
	goal: "goals",
	subject: "subjects",
	sub_subject: "sub_subjects",
	scenario: "scenarios",
	step: "scenario_steps",
};

/* ------------------------------------------------------------------- index */

interface TreeIndex {
	subjectsByGoal: Map<string, string[]>;
	subSubjectsBySubject: Map<string, string[]>;
	scenariosBySubSubject: Map<string, string[]>;
	stepsByScenario: Map<string, number>;
	orphans: Array<{ kind: PlanNodeKind; id: string; parentId: string }>;
	title: (kind: PlanNodeKind, id: string) => string;
}

const push = (map: Map<string, string[]>, key: string, value: string) => {
	const list = map.get(key);
	if (list) list.push(value);
	else map.set(key, [value]);
};

const buildIndex = (plan: ConfigureAllRequestV2): TreeIndex => {
	const goals = new Set(plan.goals.map((item) => item.id));
	const subjects = new Set(plan.subjects.map((item) => item.id));
	const subSubjects = new Set(plan.sub_subjects.map((item) => item.id));
	const scenarios = new Set(plan.scenarios.map((item) => item.id));
	const index: TreeIndex = {
		subjectsByGoal: new Map(),
		subSubjectsBySubject: new Map(),
		scenariosBySubSubject: new Map(),
		stepsByScenario: new Map(),
		orphans: [],
		title: () => "",
	};
	for (const item of plan.subjects) {
		if (goals.has(item.goal_id))
			push(index.subjectsByGoal, item.goal_id, item.id);
		else
			index.orphans.push({
				kind: "subject",
				id: item.id,
				parentId: item.goal_id,
			});
	}
	for (const item of plan.sub_subjects) {
		if (subjects.has(item.subject_id))
			push(index.subSubjectsBySubject, item.subject_id, item.id);
		else
			index.orphans.push({
				kind: "sub_subject",
				id: item.id,
				parentId: item.subject_id,
			});
	}
	for (const item of plan.scenarios) {
		if (subSubjects.has(item.sub_subject_id))
			push(index.scenariosBySubSubject, item.sub_subject_id, item.id);
		else
			index.orphans.push({
				kind: "scenario",
				id: item.id,
				parentId: item.sub_subject_id,
			});
	}
	for (const item of plan.scenario_steps) {
		if (scenarios.has(item.scenario_id))
			index.stepsByScenario.set(
				item.scenario_id,
				(index.stepsByScenario.get(item.scenario_id) ?? 0) + 1,
			);
		else
			index.orphans.push({
				kind: "step",
				id: item.id,
				parentId: item.scenario_id,
			});
	}
	const titles = new Map<string, string>();
	for (const item of plan.goals)
		titles.set(nodeKey("goal", item.id), titleFa(item));
	for (const item of plan.subjects)
		titles.set(nodeKey("subject", item.id), titleFa(item));
	for (const item of plan.sub_subjects)
		titles.set(nodeKey("sub_subject", item.id), titleFa(item));
	for (const item of plan.scenarios)
		titles.set(nodeKey("scenario", item.id), titleFa(item));
	const stepTitles = new Map(
		plan.scenario_steps.map((step) => [step.id, step.action_code]),
	);
	index.title = (kind, id) =>
		kind === "step"
			? actionNameFa(plan, stepTitles.get(id) ?? id)
			: (titles.get(nodeKey(kind, id)) ?? id);
	return index;
};

const childIds = (
	index: TreeIndex,
	kind: PlanNodeKind,
	id: string,
): string[] => {
	switch (kind) {
		case "goal":
			return index.subjectsByGoal.get(id) ?? [];
		case "subject":
			return index.subSubjectsBySubject.get(id) ?? [];
		case "sub_subject":
			return index.scenariosBySubSubject.get(id) ?? [];
		default:
			return [];
	}
};

/* ---------------------------------------------------------------- component */

export function CampaignMap({
	plan,
	issues,
	onChange,
	focus,
}: {
	plan: ConfigureAllRequestV2;
	issues: ClientValidationIssue[];
	onChange: (plan: ConfigureAllRequestV2) => void;
	focus?: PlanFocus | null;
}) {
	const index = useMemo(() => buildIndex(plan), [plan]);
	const issuesById = useMemo(() => planIssuesById(issues), [issues]);
	const [selected, setSelected] = useState<Selection>(() =>
		plan.goals[0] ? { kind: "goal", id: plan.goals[0].id } : null,
	);
	const [query, setQuery] = useState("");
	const [expanded, setExpanded] = useState<Set<string>>(() => {
		const open = new Set<string>();
		const small = plan.subjects.length + plan.sub_subjects.length < 60;
		for (const goal of plan.goals) open.add(nodeKey("goal", goal.id));
		if (small) {
			for (const subject of plan.subjects)
				open.add(nodeKey("subject", subject.id));
			for (const item of plan.sub_subjects)
				open.add(nodeKey("sub_subject", item.id));
		}
		return open;
	});

	const reveal = (kind: PlanNodeKind, id: string) => {
		setSelected({ kind, id });
		setExpanded((current) => {
			const next = new Set(current);
			for (const link of planAncestry(plan, kind, id).slice(0, -1)) {
				next.add(nodeKey(link.kind, link.id));
			}
			return next;
		});
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: react to a new focus request only
	useEffect(() => {
		if (focus) reveal(focus.kind, focus.id);
	}, [focus?.nonce]);

	/** Issues on a node plus everything under it, for the tree badges. */
	const subtreeIssues = useMemo(() => {
		const counts = new Map<string, number>();
		const own = (id: string) => issuesById.get(id)?.length ?? 0;
		const stepIssues = new Map<string, number>();
		for (const step of plan.scenario_steps) {
			const count = own(step.id);
			if (count)
				stepIssues.set(
					step.scenario_id,
					(stepIssues.get(step.scenario_id) ?? 0) + count,
				);
		}
		const count = (kind: PlanNodeKind, id: string): number => {
			const key = nodeKey(kind, id);
			const cached = counts.get(key);
			if (cached !== undefined) return cached;
			const childKind = PLAN_CHILD_KIND[kind];
			let total = own(id);
			if (kind === "scenario") total += stepIssues.get(id) ?? 0;
			else if (childKind)
				for (const child of childIds(index, kind, id))
					total += count(childKind, child);
			counts.set(key, total);
			return total;
		};
		for (const goal of plan.goals) count("goal", goal.id);
		return (kind: PlanNodeKind, id: string) => count(kind, id);
	}, [plan, index, issuesById]);

	const matches = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return null;
		const hit = new Set<string>();
		const test = (kind: PlanNodeKind, id: string): boolean => {
			const own =
				index.title(kind, id).toLowerCase().includes(needle) ||
				id.toLowerCase().includes(needle);
			const childKind = PLAN_CHILD_KIND[kind];
			let below = false;
			if (childKind && kind !== "scenario")
				for (const child of childIds(index, kind, id))
					if (test(childKind, child)) below = true;
			if (own || below) hit.add(nodeKey(kind, id));
			return own || below;
		};
		for (const goal of plan.goals) test("goal", goal.id);
		return hit;
	}, [query, index, plan.goals]);

	const toggle = (kind: PlanNodeKind, id: string) =>
		setExpanded((current) => {
			const next = new Set(current);
			const key = nodeKey(kind, id);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});

	const LEVEL_TAG: Record<PlanNodeKind, { label: string; className: string }> =
		{
			goal: { label: "هدف", className: "border-violet-400/30 text-violet-200" },
			subject: {
				label: "موضوع",
				className: "border-cyan-400/30 text-cyan-200",
			},
			sub_subject: {
				label: "زیرموضوع",
				className: "border-emerald-400/30 text-emerald-200",
			},
			scenario: {
				label: "سناریو",
				className: "border-white/15 text-slate-300",
			},
			step: { label: "گام", className: "border-white/15 text-slate-300" },
		};

	const renderNode = (kind: PlanNodeKind, id: string): ReactNode => {
		const key = nodeKey(kind, id);
		if (matches && !matches.has(key)) return null;
		const childKind = kind === "scenario" ? null : PLAN_CHILD_KIND[kind];
		const children = childKind ? childIds(index, kind, id) : [];
		const open = matches !== null || expanded.has(key);
		const issueCount = subtreeIssues(kind, id);
		const isSelected = selected?.kind === kind && selected.id === id;

		let title = index.title(kind, id);
		let meta: ReactNode = null;
		let leading: ReactNode = (
			<span
				className={`w-[4.2rem] shrink-0 rounded border px-1 text-center text-[10px] ${LEVEL_TAG[kind].className}`}
			>
				{LEVEL_TAG[kind].label}
			</span>
		);

		if (kind === "goal" || kind === "subject") {
			if (!open && children.length > 0)
				meta = `${faNum(children.length)} ${kind === "goal" ? "موضوع" : "زیرموضوع"}`;
			if (kind === "subject") {
				const total = plan.sub_subjects
					.filter((entry) => entry.subject_id === id)
					.reduce((sum, entry) => sum + entry.progress_share, 0);
				if (children.length > 0 && total !== 100)
					meta = (
						<span className="text-orange-200">جمع سهم {faNum(total)}٪</span>
					);
			}
		}
		if (kind === "sub_subject") {
			const share =
				plan.sub_subjects.find((entry) => entry.id === id)?.progress_share ?? 0;
			meta = (
				<span
					className="flex items-center gap-1.5"
					title="سهم این زیرموضوع از پیشرفت موضوع"
				>
					<span className="h-1.5 w-10 overflow-hidden rounded-full bg-white/10">
						<span
							className="block h-full rounded-full bg-emerald-400/70"
							style={{ width: `${Math.min(100, share)}%` }}
						/>
					</span>
					سهم {faNum(share)}٪
				</span>
			);
		}
		if (kind === "scenario") {
			const scenario = plan.scenarios.find((entry) => entry.id === id);
			const defense = planSideOfScenario(scenario) === "defense";
			leading = defense ? (
				<ShieldHalf className="size-4 shrink-0 text-sky-300" />
			) : (
				<Swords className="size-4 shrink-0 text-rose-300" />
			);
			// With one scenario under a sub-subject its long title only repeats the
			// sub-subject's name; what tells scenarios apart is their side.
			const siblings = (
				index.scenariosBySubSubject.get(scenario?.sub_subject_id ?? "") ?? []
			).length;
			if (siblings <= 1) title = defense ? "سناریوی دفاع" : "سناریوی حمله";
			const steps = plan.scenario_steps.filter(
				(step) => step.scenario_id === id,
			);
			meta =
				scenario?.execution_mode === "checklist"
					? `${faNum(new Set(steps.map((step) => step.action_code)).size)} کنش`
					: `${faNum(steps.length)} گام`;
		}

		return (
			<div key={key}>
				<div
					className={`flex items-center gap-1 rounded-lg py-1 pl-2 pr-1 transition ${isSelected ? "bg-cyan-400/15 ring-1 ring-inset ring-cyan-400/40" : "hover:bg-white/[0.04]"}`}
				>
					{childKind && children.length > 0 ? (
						<button
							type="button"
							aria-label={open ? "بستن" : "باز کردن"}
							onClick={() => toggle(kind, id)}
							className="grid size-5 shrink-0 place-items-center rounded text-slate-500 hover:text-slate-200"
						>
							{open ? (
								<ChevronDown className="size-3.5" />
							) : (
								<ChevronLeft className="size-3.5" />
							)}
						</button>
					) : (
						<span className="size-5 shrink-0" />
					)}
					<button
						type="button"
						onClick={() => setSelected({ kind, id })}
						title={index.title(kind, id)}
						className="flex min-w-0 flex-1 items-center gap-2 text-right"
					>
						{leading}
						<span
							className={`min-w-0 truncate text-sm ${kind === "goal" ? "font-black" : "font-bold"} ${kind === "scenario" ? "text-slate-300" : "text-slate-100"}`}
						>
							{title}
						</span>
						{meta && (
							<span className="shrink-0 text-[10px] tabular-nums text-slate-500">
								{meta}
							</span>
						)}
						{issueCount > 0 && (
							<span
								title={`${faNum(issueCount)} مشکل`}
								className="mr-auto shrink-0 rounded-full border border-amber-400/30 bg-amber-400/15 px-1.5 text-[10px] tabular-nums text-amber-100"
							>
								{faNum(issueCount)}
							</span>
						)}
					</button>
				</div>
				{open && childKind && children.length > 0 && (
					<div className="mr-3.5 space-y-0.5 border-r border-white/10 pr-1.5">
						{children.map((child) => renderNode(childKind, child))}
					</div>
				)}
			</div>
		);
	};

	/** Goals grouped under their side, with the side's role, e.g. «قرمز · مهاجم». */
	const sideGroups = (() => {
		const groups = new Map<number, string[]>();
		for (const goal of plan.goals) {
			const list = groups.get(goal.side_id) ?? [];
			list.push(goal.id);
			groups.set(goal.side_id, list);
		}
		return [...groups.entries()].map(([sideId, goalIds]) => {
			const team = plan.teams.find(
				(item) =>
					item.side_id === sideId &&
					(typeof item.role === "string" ? item.role : item.role.type) !==
						"GOVERNMENT",
			);
			const role = team
				? typeof team.role === "string"
					? team.role
					: team.role.type
				: null;
			return {
				sideId,
				goalIds,
				label: sideName(plan, sideId),
				role:
					role === "ATTACKER" ? "مهاجم" : role === "DEFENCER" ? "مدافع" : null,
			};
		});
	})();

	const selectionExists =
		selected &&
		(plan[PLAN_NODE_COLLECTION[selected.kind]] as Array<{ id: string }>).some(
			(item) => item.id === selected.id,
		);

	return (
		<div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(290px,380px)_minmax(0,1fr)]">
			<div className="min-w-0 rounded-3xl border border-white/10 bg-slate-950/55 p-4">
				<div className="mb-3 flex items-center justify-between gap-2">
					<h2 className="flex items-center gap-2 font-black text-slate-100">
						<FolderTree className="size-5 text-cyan-300" /> اهداف و سناریوها
					</h2>
					<Button
						type="button"
						size="sm"
						onClick={() => {
							const created = createPlanGoal(plan);
							onChange(created.plan);
							reveal("goal", created.id);
						}}
						className="bg-violet-400 text-slate-950 hover:bg-violet-300"
					>
						<Plus className="size-4" /> هدف
					</Button>
				</div>
				<div className="relative mb-3">
					<Search className="absolute right-3 top-2.5 size-4 text-slate-500" />
					<Input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="جست‌وجو…"
						className="border-white/10 bg-white/5 pr-9"
					/>
				</div>
				<div className="mb-2 flex gap-2 text-[11px]">
					<button
						type="button"
						className="text-slate-500 hover:text-slate-200"
						onClick={() =>
							setExpanded(
								new Set([
									...plan.goals.map((item) => nodeKey("goal", item.id)),
									...plan.subjects.map((item) => nodeKey("subject", item.id)),
									...plan.sub_subjects.map((item) =>
										nodeKey("sub_subject", item.id),
									),
								]),
							)
						}
					>
						باز کردن همه
					</button>
					<span className="text-slate-700">·</span>
					<button
						type="button"
						className="text-slate-500 hover:text-slate-200"
						onClick={() => setExpanded(new Set())}
					>
						بستن همه
					</button>
				</div>
				<p className="mb-2 text-[11px] text-slate-500">
					هدف ← موضوع ← زیرموضوع ← سناریو. روی هر ردیف بزنید تا جزئیاتش باز شود.
				</p>
				<ScrollArea dir="rtl" className="h-[62vh] min-h-[420px] pl-2">
					<div className="space-y-0.5">
						{plan.goals.length === 0 && (
							<div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-500">
								هنوز هدفی تعریف نشده است.
							</div>
						)}
						{sideGroups.map((group) => {
							const visible = group.goalIds.filter(
								(goalId) => !matches || matches.has(nodeKey("goal", goalId)),
							);
							if (visible.length === 0) return null;
							return (
								<div key={group.sideId} className="mb-3">
									<div className="mb-1 flex items-center gap-2 px-1 text-xs font-bold text-slate-400">
										<span>سمت {group.label}</span>
										{group.role && (
											<span className="rounded border border-white/10 px-1.5 text-[10px] text-slate-500">
												{group.role}
											</span>
										)}
									</div>
									{visible.map((goalId) => renderNode("goal", goalId))}
								</div>
							);
						})}
						{index.orphans.length > 0 && !matches && (
							<div className="mt-4 rounded-xl border border-orange-400/25 bg-orange-500/[0.06] p-2">
								<div className="mb-1 flex items-center gap-2 px-1 text-xs font-bold text-orange-100">
									<Unlink className="size-3.5" /> موارد وصل‌نشده (
									{faNum(index.orphans.length)})
								</div>
								{index.orphans.slice(0, 40).map((orphan) => (
									<button
										key={nodeKey(orphan.kind, orphan.id)}
										type="button"
										onClick={() =>
											setSelected({ kind: orphan.kind, id: orphan.id })
										}
										className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-right text-sm hover:bg-white/[0.04]"
									>
										{KIND_ICON[orphan.kind]}
										<span className="truncate text-slate-200">
											{index.title(orphan.kind, orphan.id)}
										</span>
										<span className="mr-auto shrink-0 text-[10px] text-slate-500">
											{PLAN_NODE_LABEL_FA[orphan.kind]}
										</span>
									</button>
								))}
								{index.orphans.length > 40 && (
									<div className="px-2 pt-1 text-[11px] text-slate-500">
										و {faNum(index.orphans.length - 40)} مورد دیگر
									</div>
								)}
							</div>
						)}
					</div>
				</ScrollArea>
			</div>

			<div className="min-w-0">
				{selected && selectionExists ? (
					<Inspector
						key={nodeKey(selected.kind, selected.id)}
						plan={plan}
						kind={selected.kind}
						id={selected.id}
						index={index}
						issues={issuesById.get(selected.id) ?? []}
						onChange={onChange}
						onSelect={reveal}
					/>
				) : (
					<div className="grid min-h-[420px] place-items-center rounded-3xl border border-dashed border-white/10 bg-slate-950/40 p-8 text-center text-slate-500">
						یک مورد را از فهرست انتخاب کنید.
					</div>
				)}
			</div>
		</div>
	);
}

/* ---------------------------------------------------------------- inspector */

function Inspector({
	plan,
	kind,
	id,
	index,
	issues,
	onChange,
	onSelect,
}: {
	plan: ConfigureAllRequestV2;
	kind: PlanNodeKind;
	id: string;
	index: TreeIndex;
	issues: ClientValidationIssue[];
	onChange: (plan: ConfigureAllRequestV2) => void;
	onSelect: (kind: PlanNodeKind, id: string) => void;
}) {
	const collection = PLAN_NODE_COLLECTION[kind];
	const items = plan[collection] as unknown as Array<
		Record<string, unknown> & { id: string }
	>;
	const item = items.find((entry) => entry.id === id);
	const [idError, setIdError] = useState<string | null>(null);
	const lookups = useMemo(() => buildSummaryLookups(plan), [plan]);
	if (!item) return null;

	const patch = (changes: Record<string, unknown>) => {
		onChange({
			...plan,
			[collection]: items.map((entry) =>
				entry.id === id ? { ...entry, ...changes } : entry,
			),
		} as ConfigureAllRequestV2);
	};

	const replace = (next: Record<string, unknown>) => {
		onChange({
			...plan,
			[collection]: items.map((entry) => (entry.id === id ? next : entry)),
		} as ConfigureAllRequestV2);
	};

	const rename = (next: string) => {
		const result = renamePlanNode(plan, kind, id, next);
		if (!result.ok) {
			setIdError(
				result.reason === "taken"
					? "این شناسه قبلاً استفاده شده است."
					: "شناسه نمی‌تواند خالی باشد.",
			);
			return;
		}
		setIdError(null);
		onChange(result.plan);
		onSelect(kind, next.trim());
	};

	const removal = previewPlanRemoval(plan, kind, id);
	const consequences = [
		kind !== "subject" && removal.subjects.length > 0
			? `${faNum(removal.subjects.length)} موضوع`
			: null,
		kind !== "sub_subject" && removal.sub_subjects.length > 0
			? `${faNum(removal.sub_subjects.length)} زیرموضوع`
			: null,
		kind !== "scenario" && removal.scenarios.length > 0
			? `${faNum(removal.scenarios.length)} سناریو`
			: null,
		kind !== "step" && removal.steps.length > 0
			? `${faNum(removal.steps.length)} گام`
			: null,
	].filter((line): line is string => line !== null);

	const ancestry = planAncestry(plan, kind, id);
	const parentLink = ancestry.at(-2) ?? null;
	const summary = describeEntity(SUMMARY_KEY[kind], item, 0, lookups);

	return (
		<div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/55 p-5">
			<nav className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
				{ancestry.map((link, position) => (
					<span
						key={nodeKey(link.kind, link.id)}
						className="flex items-center gap-1"
					>
						{position > 0 && <ChevronLeft className="size-3" />}
						{position === ancestry.length - 1 ? (
							<span className="text-slate-300">
								{PLAN_NODE_LABEL_FA[link.kind]}
							</span>
						) : (
							<button
								type="button"
								onClick={() => onSelect(link.kind, link.id)}
								className="hover:text-cyan-200"
							>
								{index.title(link.kind, link.id)}
							</button>
						)}
					</span>
				))}
			</nav>

			<EntitySummaryHeader summary={summary} />

			{issues.length > 0 && (
				<div className="space-y-1.5 rounded-2xl border border-amber-400/25 bg-amber-500/[0.07] p-3">
					{issues.map((issue) => (
						<div
							key={`${issue.code}-${issue.message}`}
							className="flex items-start gap-2 text-sm leading-6 text-amber-100"
						>
							<TriangleAlert className="mt-1 size-4 shrink-0 text-amber-300" />
							{issue.message}
						</div>
					))}
				</div>
			)}

			<Section title="مشخصات">
				<div className="grid gap-3 md:grid-cols-2">
					{kind !== "step" && (
						<>
							<TextField
								label="عنوان"
								value={item.title_fa as string | undefined}
								onCommit={(value) => patch({ title_fa: value })}
							/>
							<TextField
								label="عنوان انگلیسی"
								dir="ltr"
								value={item.title as string | undefined}
								onCommit={(value) =>
									patch({ title: value || (item.title_fa as string) || id })
								}
							/>
						</>
					)}
					<TextField
						label="شناسه"
						dir="ltr"
						mono
						value={id}
						error={idError}
						hint="با تغییر شناسه، همهٔ ارجاع‌ها به آن هم به‌روز می‌شوند."
						onCommit={rename}
					/>
					<KindFields plan={plan} kind={kind} item={item} patch={patch} />
				</div>
				{(kind === "goal" || kind === "subject") && (
					<div className="mt-3">
						<TextField
							label="توضیح"
							multiline
							value={item.description_fa as string | undefined}
							onCommit={(value) => patch({ description_fa: value })}
						/>
					</div>
				)}
			</Section>

			<Children
				plan={plan}
				kind={kind}
				id={id}
				index={index}
				onChange={onChange}
				onSelect={onSelect}
			/>

			<div className="flex flex-wrap items-start gap-2 border-t border-white/5 pt-4">
				<ConfirmRemove
					title={`حذف ${PLAN_NODE_LABEL_FA[kind]} «${index.title(kind, id)}»`}
					consequences={consequences}
					warning={
						removal.danglingEffects > 0
							? `${faNum(removal.danglingEffects)} اثر در جای دیگری از برنامه به موارد حذف‌شده اشاره می‌کند و پس از حذف شکسته می‌شود.`
							: null
					}
					onConfirm={() => {
						onChange(removePlanNode(plan, kind, id));
						if (parentLink) onSelect(parentLink.kind, parentLink.id);
					}}
				/>
				<div className="min-w-0 flex-1">
					<JsonToggle
						value={item as Record<string, unknown>}
						onApply={(next) => replace(next as Record<string, unknown>)}
						validate={(parsed) =>
							parsed === null ||
							typeof parsed !== "object" ||
							Array.isArray(parsed)
								? "مقدار باید یک شیء JSON باشد."
								: typeof (parsed as { id?: unknown }).id !== "string"
									? "فیلد id الزامی است."
									: null
						}
					/>
				</div>
			</div>
		</div>
	);
}

/* ------------------------------------------------------------- kind fields */

function KindFields({
	plan,
	kind,
	item,
	patch,
}: {
	plan: ConfigureAllRequestV2;
	kind: PlanNodeKind;
	item: Record<string, unknown>;
	patch: (changes: Record<string, unknown>) => void;
}) {
	switch (kind) {
		case "goal":
			return (
				<SelectField
					label="سمت"
					value={String(item.side_id)}
					options={sideOptions(plan)}
					onChange={(value) => value && patch({ side_id: Number(value) })}
				/>
			);
		case "subject":
			return (
				<>
					<SelectField
						label="هدف"
						value={item.goal_id as string}
						options={plan.goals.map((goal) => ({
							value: goal.id,
							label: titleFa(goal),
							hint: sideName(plan, goal.side_id),
						}))}
						hint="سمت مالک هم با هدف جدید هماهنگ می‌شود."
						onChange={(value) => {
							const goal = plan.goals.find((entry) => entry.id === value);
							if (goal)
								patch({ goal_id: goal.id, owner_side_id: goal.side_id });
						}}
					/>
					<SelectField
						label="نوع موضوع"
						value={item.subject_type as string}
						options={optionsOf(SUBJECT_TYPE_FA)}
						onChange={(value) =>
							value &&
							patch({
								subject_type: value as SubjectType,
								subject_type_fa: SUBJECT_TYPE_FA[value],
							})
						}
					/>
					<SelectField
						label="سمت مالک"
						value={String(item.owner_side_id)}
						options={sideOptions(plan)}
						onChange={(value) =>
							value && patch({ owner_side_id: Number(value) })
						}
					/>
					<SelectField
						label="تیم هدف"
						value={String(item.target_team_id)}
						options={playerTeamOptions(plan)}
						onChange={(value) =>
							value && patch({ target_team_id: Number(value) })
						}
					/>
					<NumberField
						label="اهمیت"
						value={item.criticality as number | null}
						min={1}
						max={5}
						hint="از ۱ تا ۵"
						onCommit={(value) => patch({ criticality: value })}
					/>
				</>
			);
		case "sub_subject": {
			const siblingsTotal = plan.sub_subjects
				.filter(
					(entry) =>
						entry.subject_id === item.subject_id && entry.id !== item.id,
				)
				.reduce((sum, entry) => sum + entry.progress_share, 0);
			return (
				<>
					<SelectField
						label="موضوع"
						value={item.subject_id as string}
						options={plan.subjects.map((subject) => ({
							value: subject.id,
							label: titleFa(subject),
						}))}
						onChange={(value) => value && patch({ subject_id: value })}
					/>
					<NumberField
						label="سهم از پیشرفت موضوع"
						value={item.progress_share as number}
						min={0}
						max={100}
						suffix="٪"
						hint={`بقیهٔ زیرموضوع‌ها ${faNum(siblingsTotal)}٪ — جمع باید ۱۰۰٪ شود.`}
						onCommit={(value) => patch({ progress_share: value ?? 0 })}
					/>
				</>
			);
		}
		case "scenario":
			return (
				<>
					<SelectField
						label="زیرموضوع"
						value={item.sub_subject_id as string}
						options={plan.sub_subjects.map((entry) => ({
							value: entry.id,
							label: titleFa(entry),
							hint: titleFa(
								plan.subjects.find(
									(subject) => subject.id === entry.subject_id,
								) ?? {
									id: entry.subject_id,
								},
							),
						}))}
						onChange={(value) => value && patch({ sub_subject_id: value })}
					/>
					<SelectField
						label="نوع مسیر"
						value={item.scenario_type as string}
						options={optionsOf(SCENARIO_TYPE_FA)}
						onChange={(value) => {
							if (!value) return;
							const attack = value === "attack_path";
							patch({
								scenario_type: value as ScenarioType,
								scenario_type_fa: SCENARIO_TYPE_FA[value],
								allowed_team_roles: [attack ? "ATTACKER" : "DEFENCER"],
								allowed_team_roles_fa: [attack ? "مهاجم" : "مدافع"],
							});
						}}
					/>
					<SelectField
						label="شیوهٔ اجرا"
						value={item.execution_mode as string}
						options={optionsOf(EXECUTION_MODE_FA)}
						onChange={(value) =>
							value &&
							patch({
								execution_mode: value as ExecutionMode,
								execution_mode_fa: EXECUTION_MODE_FA[value]?.split(" — ")[0],
							})
						}
					/>
					<SelectField
						label="سطح ریسک"
						value={item.risk_level as string}
						options={optionsOf(RISK_FA)}
						onChange={(value) =>
							value &&
							patch({ risk_level: value, risk_level_fa: RISK_FA[value] })
						}
					/>
					<NumberField
						label="امتیاز پایه"
						value={item.base_reward_points as number | null}
						min={0}
						onCommit={(value) => patch({ base_reward_points: value })}
					/>
					<NumberField
						label="هزینهٔ پایه"
						value={item.base_credit_cost as number | null}
						min={0}
						suffix="اعتبار"
						onCommit={(value) => patch({ base_credit_cost: value })}
					/>
				</>
			);
		case "step": {
			const scenario = plan.scenarios.find(
				(entry) => entry.id === item.scenario_id,
			);
			const siblings = plan.scenario_steps.filter(
				(entry) =>
					entry.scenario_id === item.scenario_id && entry.id !== item.id,
			);
			const dependsOn = (item.depends_on as string[] | undefined) ?? [];
			return (
				<>
					<SelectField
						label="سناریو"
						value={item.scenario_id as string}
						options={plan.scenarios.map((entry) => ({
							value: entry.id,
							label: titleFa(entry),
						}))}
						onChange={(value) =>
							value && patch({ scenario_id: value, depends_on: [] })
						}
					/>
					<SelectField
						label="کنش"
						value={item.action_code as string}
						options={planActionsForSide(plan, planSideOfScenario(scenario)).map(
							(action) => ({
								value: action.code,
								label: actionNameFa(plan, action.code),
							}),
						)}
						onChange={(value) => value && patch({ action_code: value })}
					/>
					<NumberField
						label="ترتیب"
						value={item.order as number | null}
						min={1}
						onCommit={(value) => patch({ order: value })}
					/>
					<ToggleField
						label="الزامی برای تکمیل زیرموضوع"
						checked={item.required === true}
						onChange={(value) => patch({ required: value })}
					/>
					{siblings.length > 0 && (
						<div className="md:col-span-2">
							<div className="mb-1.5 text-xs font-bold text-slate-400">
								پیش‌نیازها
							</div>
							<div className="flex flex-wrap gap-1.5">
								{siblings.map((sibling) => {
									const on = dependsOn.includes(sibling.id);
									return (
										<button
											key={sibling.id}
											type="button"
											onClick={() =>
												patch({
													depends_on: on
														? dependsOn.filter((entry) => entry !== sibling.id)
														: [...dependsOn, sibling.id],
												})
											}
											className={`rounded-md border px-2 py-1 text-[11px] transition ${on ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-100" : "border-white/10 text-slate-400 hover:text-slate-200"}`}
										>
											{faNum(sibling.order ?? 0)}.{" "}
											{actionNameFa(plan, sibling.action_code)}
										</button>
									);
								})}
							</div>
						</div>
					)}
				</>
			);
		}
	}
}

/* ---------------------------------------------------------------- children */

function Children({
	plan,
	kind,
	id,
	index,
	onChange,
	onSelect,
}: {
	plan: ConfigureAllRequestV2;
	kind: PlanNodeKind;
	id: string;
	index: TreeIndex;
	onChange: (plan: ConfigureAllRequestV2) => void;
	onSelect: (kind: PlanNodeKind, id: string) => void;
}) {
	if (kind === "step") return null;

	if (kind === "scenario") {
		const rows = scenarioMoveRows(plan, id);
		const steps = index.stepsByScenario.get(id) ?? 0;
		return (
			<Section
				title={`کنش‌ها و گام‌ها — ${faNum(rows.length)} کنش، ${faNum(steps)} گام`}
				icon={<ListChecks className="size-4 text-slate-300" />}
			>
				<StepGrid
					plan={plan}
					scenarioId={id}
					onChange={onChange}
					onSelectStep={(stepId) => onSelect("step", stepId)}
				/>
			</Section>
		);
	}

	const childKind = PLAN_CHILD_KIND[kind] as Exclude<PlanNodeKind, "goal">;
	const children = childIds(index, kind, id);
	const add = () => {
		const created = createPlanChild(plan, kind, id);
		onChange(created.plan);
		onSelect(created.kind, created.id);
	};

	if (kind === "subject") {
		const shares = plan.sub_subjects.filter((entry) => entry.subject_id === id);
		const total = shares.reduce((sum, entry) => sum + entry.progress_share, 0);
		return (
			<Section
				title={`زیرموضوع‌ها و سهم پیشرفت — جمع ${faNum(total)}٪`}
				icon={<Scale className="size-4 text-emerald-300" />}
				actions={
					<>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={shares.length === 0}
							onClick={() => onChange(balancePlanShares(plan, id))}
							className="border-white/10 bg-white/[0.03]"
						>
							<Scale className="size-4" /> تقسیم مساوی
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={add}
							className="border-white/10 bg-white/[0.03]"
						>
							<Plus className="size-4" /> زیرموضوع
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={() => {
								const lane = scaffoldPlanLane(plan, id);
								onChange(lane.plan);
								onSelect("scenario", lane.scenarioId);
							}}
							className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
							title="زیرموضوع + سناریو + همهٔ کنش‌های این سمت، هرکدام یک بار در هر نوبت"
						>
							<WandSparkles className="size-4" /> زیرموضوع کامل
						</Button>
					</>
				}
			>
				<div
					className={`mb-3 flex h-3 overflow-hidden rounded-full border ${total === 100 ? "border-emerald-400/30" : "border-orange-400/40"} bg-white/[0.03]`}
					role="img"
					aria-label={`جمع سهم‌ها ${total} درصد`}
				>
					{shares.map((entry, position) => (
						<div
							key={entry.id}
							title={`${titleFa(entry)} — ${entry.progress_share}٪`}
							className={
								position % 2 === 0 ? "bg-emerald-400/60" : "bg-emerald-300/35"
							}
							style={{ width: `${Math.min(100, entry.progress_share)}%` }}
						/>
					))}
				</div>
				{total !== 100 && (
					<p className="mb-3 text-xs text-orange-200">
						{total < 100
							? `${faNum(100 - total)}٪ از پیشرفت این موضوع به هیچ زیرموضوعی نرسیده است.`
							: `${faNum(total - 100)}٪ بیش از ۱۰۰ تقسیم شده است.`}
					</p>
				)}
				<div className="space-y-1.5">
					{shares.map((entry) => (
						<div
							key={entry.id}
							className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-2"
						>
							<button
								type="button"
								onClick={() => onSelect("sub_subject", entry.id)}
								className="flex min-w-0 flex-1 items-center gap-2 text-right"
							>
								{KIND_ICON.sub_subject}
								<span className="truncate text-sm font-bold text-slate-100">
									{titleFa(entry)}
								</span>
								<span className="shrink-0 text-[10px] text-slate-500">
									{faNum(
										(index.scenariosBySubSubject.get(entry.id) ?? []).length,
									)}{" "}
									سناریو
								</span>
							</button>
							<NumberInput
								className="w-24 shrink-0"
								value={entry.progress_share}
								min={0}
								max={100}
								suffix="٪"
								ariaLabel={`سهم ${titleFa(entry)}`}
								onCommit={(value) =>
									onChange({
										...plan,
										sub_subjects: plan.sub_subjects.map((candidate) =>
											candidate.id === entry.id
												? { ...candidate, progress_share: value ?? 0 }
												: candidate,
										),
									})
								}
							/>
						</div>
					))}
					{shares.length === 0 && (
						<p className="text-sm text-slate-500">
							این موضوع هنوز زیرموضوعی ندارد. «زیرموضوع کامل» یک زیرموضوع را
							همراه سناریو و همهٔ کنش‌های این سمت یک‌جا می‌سازد.
						</p>
					)}
				</div>
			</Section>
		);
	}

	return (
		<Section
			title={`${PLAN_NODE_LABEL_FA[childKind]}‌ها (${faNum(children.length)})`}
			actions={
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={add}
					className="border-white/10 bg-white/[0.03]"
				>
					<Plus className="size-4" /> {PLAN_NODE_LABEL_FA[childKind]}
				</Button>
			}
		>
			<div className="space-y-1.5">
				{children.map((childId) => (
					<button
						key={childId}
						type="button"
						onClick={() => onSelect(childKind, childId)}
						className="flex w-full items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-2.5 text-right hover:bg-white/[0.05]"
					>
						{KIND_ICON[childKind]}
						<span className="truncate text-sm font-bold text-slate-100">
							{index.title(childKind, childId)}
						</span>
						<ChevronLeft className="mr-auto size-4 text-slate-600" />
					</button>
				))}
				{children.length === 0 && (
					<p className="text-sm text-slate-500">
						هنوز {PLAN_NODE_LABEL_FA[childKind]}ی ندارد.
					</p>
				)}
			</div>
		</Section>
	);
}
