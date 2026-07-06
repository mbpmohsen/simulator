import type {
	ConfigureAllRequestV2,
	GamePlanGraphResponse,
	ImpactEffect,
} from "../game-server/types";
import { getLocalized } from "./localization";
import { REQUIRED_VISIBILITY_EVENT_TYPES } from "./validation";

export type GamePlanGraphNodeType =
	| "goalNode"
	| "subjectNode"
	| "subSubjectNode"
	| "scenarioNode"
	| "stepNode"
	| "actionNode"
	| "counterNode"
	| "effectNode"
	| "governmentNode"
	| "marketItemNode";

export type GamePlanGraphEdgeType =
	| "owns"
	| "decomposes_to"
	| "contains"
	| "executes"
	| "depends_on"
	| "counters"
	| "affects"
	| "unlocks"
	| "disables"
	| "reveals";

export interface GamePlanGraphNode {
	id: string;
	entityId: string;
	type: GamePlanGraphNodeType;
	label: string;
	subtitle?: string;
	x: number;
	y: number;
	sideId?: number;
	subjectId?: string;
	scenarioType?: string;
	executionMode?: string;
	actionType?: string;
	goalId?: string;
	scenarioId?: string;
	raw?: unknown;
	broken?: boolean;
}

export interface GamePlanGraphEdge {
	id: string;
	source: string;
	target: string;
	type: GamePlanGraphEdgeType;
	broken?: boolean;
}

export interface GamePlanGraph {
	nodes: GamePlanGraphNode[];
	edges: GamePlanGraphEdge[];
}

export interface GamePlanGraphWarning {
	code: string;
	message: string;
	entityId?: string;
	severity: "warning" | "error";
}

export interface PublishedGamePlanGraphResult {
	graph: GamePlanGraph | null;
	warnings: GamePlanGraphWarning[];
	source: "server" | "plan" | "empty";
}

export interface PublishedGamePlanGraphLoaders {
	loadGraph: () => Promise<GamePlanGraphResponse>;
	loadPlan: () => Promise<ConfigureAllRequestV2>;
}

const nodeId = (type: string, id: string | number): string => `${type}:${id}`;

export const buildGamePlanGraph = (
	plan: ConfigureAllRequestV2,
): GamePlanGraph => {
	const nodes: GamePlanGraphNode[] = [];
	const edges: GamePlanGraphEdge[] = [];
	const rowByColumn = new Map<number, number>();
	const addNode = (
		column: number,
		node: Omit<GamePlanGraphNode, "x" | "y">,
	): void => {
		const row = rowByColumn.get(column) ?? 0;
		rowByColumn.set(column, row + 1);
		nodes.push({ ...node, x: column * 310, y: row * 118 });
	};
	const addEdge = (
		type: GamePlanGraphEdgeType,
		source: string,
		target: string,
		broken = false,
	): void => {
		edges.push({
			id: `${type}:${source}:${target}`,
			type,
			source,
			target,
			broken,
		});
	};

	const goalIds = new Set(plan.goals.map((item) => item.id));
	const subjectIds = new Set(plan.subjects.map((item) => item.id));
	const subSubjectIds = new Set(plan.sub_subjects.map((item) => item.id));
	const scenarioIds = new Set(plan.scenarios.map((item) => item.id));
	const stepIds = new Set(plan.scenario_steps.map((item) => item.id));
	const actionCodes = new Set(plan.actions.map((item) => item.code));
	const resolveEffectTargetType = (target: string): string =>
		actionCodes.has(target)
			? "action"
			: goalIds.has(target)
				? "goal"
				: subjectIds.has(target)
					? "subject"
					: subSubjectIds.has(target)
						? "subSubject"
						: scenarioIds.has(target)
							? "scenario"
							: "step";
	const addEffectNode = (
		source: string | null,
		id: string,
		effect: ImpactEffect,
		subtitle: string,
		sourceBroken = false,
	): void => {
		const targetMissing = Boolean(
			effect.target &&
				!actionCodes.has(effect.target) &&
				!goalIds.has(effect.target) &&
				!subjectIds.has(effect.target) &&
				!subSubjectIds.has(effect.target) &&
				!scenarioIds.has(effect.target) &&
				!stepIds.has(effect.target),
		);
		const effectNodeId = nodeId("effect", id);
		addNode(6, {
			id: effectNodeId,
			entityId: id,
			type: "effectNode",
			label: effect.type,
			subtitle,
			raw: effect,
			broken: targetMissing,
		});
		if (source) addEdge("affects", source, effectNodeId, sourceBroken);
		if (!effect.target) return;
		const edgeType: GamePlanGraphEdgeType = effect.type.includes("UNLOCK")
			? "unlocks"
			: effect.type.includes("DISABLE") || effect.type.includes("LOCK")
				? "disables"
				: effect.type.includes("REVEAL")
					? "reveals"
					: "affects";
		addEdge(
			edgeType,
			effectNodeId,
			nodeId(resolveEffectTargetType(effect.target), effect.target),
			targetMissing,
		);
	};

	for (const goal of plan.goals)
		addNode(0, {
			id: nodeId("goal", goal.id),
			entityId: goal.id,
			type: "goalNode",
			label: getLocalized(goal.title, goal.title_fa),
			subtitle: "هدف",
			sideId: goal.side_id,
			goalId: goal.id,
			raw: goal,
		});
	for (const subject of plan.subjects) {
		addNode(1, {
			id: nodeId("subject", subject.id),
			entityId: subject.id,
			type: "subjectNode",
			label: getLocalized(subject.title, subject.title_fa),
			subtitle: "موضوع",
			sideId: subject.owner_side_id,
			subjectId: subject.id,
			goalId: subject.goal_id,
			raw: subject,
			broken: !goalIds.has(subject.goal_id),
		});
		addEdge(
			"owns",
			nodeId("goal", subject.goal_id),
			nodeId("subject", subject.id),
			!goalIds.has(subject.goal_id),
		);
	}
	for (const item of plan.sub_subjects) {
		const subject = plan.subjects.find(
			(candidate) => candidate.id === item.subject_id,
		);
		addNode(2, {
			id: nodeId("subSubject", item.id),
			entityId: item.id,
			type: "subSubjectNode",
			label: getLocalized(item.title, item.title_fa),
			subtitle: `زیرموضوع · ${item.progress_share}٪`,
			sideId: subject?.owner_side_id,
			subjectId: item.subject_id,
			goalId: subject?.goal_id,
			raw: item,
			broken: !subjectIds.has(item.subject_id),
		});
		addEdge(
			"decomposes_to",
			nodeId("subject", item.subject_id),
			nodeId("subSubject", item.id),
			!subjectIds.has(item.subject_id),
		);
	}
	for (const scenario of plan.scenarios) {
		const parent = plan.sub_subjects.find(
			(candidate) => candidate.id === scenario.sub_subject_id,
		);
		const subject = plan.subjects.find(
			(candidate) => candidate.id === parent?.subject_id,
		);
		addNode(3, {
			id: nodeId("scenario", scenario.id),
			entityId: scenario.id,
			type: "scenarioNode",
			label: getLocalized(scenario.title, scenario.title_fa),
			subtitle: "سناریو",
			sideId: subject?.owner_side_id,
			subjectId: subject?.id,
			scenarioType: scenario.scenario_type,
			executionMode: scenario.execution_mode,
			goalId: subject?.goal_id,
			scenarioId: scenario.id,
			raw: scenario,
			broken: !subSubjectIds.has(scenario.sub_subject_id),
		});
		addEdge(
			"contains",
			nodeId("subSubject", scenario.sub_subject_id),
			nodeId("scenario", scenario.id),
			!subSubjectIds.has(scenario.sub_subject_id),
		);
	}
	for (const step of plan.scenario_steps) {
		const scenario = plan.scenarios.find(
			(candidate) => candidate.id === step.scenario_id,
		);
		const parent = plan.sub_subjects.find(
			(candidate) => candidate.id === scenario?.sub_subject_id,
		);
		const subject = plan.subjects.find(
			(candidate) => candidate.id === parent?.subject_id,
		);
		addNode(4, {
			id: nodeId("step", step.id),
			entityId: step.id,
			type: "stepNode",
			label: `گام ${step.order ?? "—"}`,
			subtitle: step.action_code,
			sideId: subject?.owner_side_id,
			subjectId: subject?.id,
			scenarioType: scenario?.scenario_type,
			executionMode: scenario?.execution_mode,
			goalId: subject?.goal_id,
			scenarioId: scenario?.id,
			raw: step,
			broken:
				!scenarioIds.has(step.scenario_id) ||
				!actionCodes.has(step.action_code),
		});
		addEdge(
			"contains",
			nodeId("scenario", step.scenario_id),
			nodeId("step", step.id),
			!scenarioIds.has(step.scenario_id),
		);
		addEdge(
			"executes",
			nodeId("step", step.id),
			nodeId("action", step.action_code),
			!actionCodes.has(step.action_code),
		);
		for (const dependency of step.depends_on ?? [])
			addEdge(
				"depends_on",
				nodeId("step", dependency),
				nodeId("step", step.id),
				!stepIds.has(dependency),
			);
		for (const [effectIndex, effect] of (step.on_success ?? []).entries())
			addEffectNode(
				nodeId("step", step.id),
				`${step.id}:success:${effectIndex}`,
				effect,
				"اثر موفقیت گام",
			);
		for (const [effectIndex, effect] of (step.on_failure ?? []).entries())
			addEffectNode(
				nodeId("step", step.id),
				`${step.id}:failure:${effectIndex}`,
				effect,
				"اثر شکست گام",
			);
	}
	for (const action of plan.actions)
		addNode(5, {
			id: nodeId("action", action.code),
			entityId: action.code,
			type: "actionNode",
			label: getLocalized(action.name ?? action.code, action.name_fa),
			subtitle: action.type === "attack" ? "کنش تهاجمی" : "کنش دفاعی",
			actionType: action.type,
			raw: action,
		});
	for (const mapping of plan.action_counters ?? []) {
		for (const counter of mapping.countered_by ?? [])
			addEdge(
				"counters",
				nodeId("action", mapping.attack_code),
				nodeId("action", counter.defense_code),
				!actionCodes.has(counter.defense_code) ||
					!actionCodes.has(mapping.attack_code),
			);
	}
	for (const [index, rule] of plan.impact_rules.entries()) {
		for (const [effectIndex, effect] of rule.effects.entries()) {
			const id = `${rule.id}:${effectIndex}`;
			const trigger = rule.trigger.action_code;
			addEffectNode(
				trigger ? nodeId("action", trigger) : null,
				id,
				effect,
				rule.trigger.event,
				Boolean(trigger && !actionCodes.has(trigger)),
			);
		}
		if (rule.effects.length === 0)
			rowByColumn.set(6, (rowByColumn.get(6) ?? 0) + index);
	}
	for (const government of plan.government?.side_governments ?? []) {
		const governmentNodeId = nodeId("government", government.team_id);
		addNode(0, {
			id: governmentNodeId,
			entityId: String(government.team_id),
			type: "governmentNode",
			label:
				government.player.name ?? government.player.governmentCode ?? "دولت",
			subtitle: "فرماندهی",
			sideId: government.side_id,
			raw: government,
		});
		for (const action of government.actions ?? []) {
			const actionNodeId = nodeId(
				"governmentAction",
				`${government.team_id}:${action.code}`,
			);
			addNode(5, {
				id: actionNodeId,
				entityId: action.code,
				type: "governmentNode",
				label: action.name?.trim() || action.code,
				subtitle: `دستور دولت · ${action.intervention_type}`,
				sideId: government.side_id,
				actionType: "government",
				raw: action,
			});
			addEdge("executes", governmentNodeId, actionNodeId);
			const target = action.banned_action_code ?? action.target_action_code;
			if (target)
				addEdge(
					action.intervention_type.includes("BAN") ? "disables" : "affects",
					actionNodeId,
					nodeId("action", target),
					!actionCodes.has(target),
				);
		}
	}
	if ((plan.government?.actions?.length ?? 0) > 0) {
		const governmentRootId = nodeId("government", "shared-actions");
		addNode(0, {
			id: governmentRootId,
			entityId: "shared-actions",
			type: "governmentNode",
			label: "دستورات مشترک دولت",
			subtitle: "کاتالوگ مداخله",
			raw: plan.government?.actions,
		});
		for (const action of plan.government?.actions ?? []) {
			const actionNodeId = nodeId("governmentAction", action.code);
			addNode(5, {
				id: actionNodeId,
				entityId: action.code,
				type: "governmentNode",
				label: action.name?.trim() || action.code,
				subtitle: `دستور دولت · ${action.intervention_type}`,
				actionType: "government",
				raw: action,
			});
			addEdge("executes", governmentRootId, actionNodeId);
			const target = action.banned_action_code ?? action.target_action_code;
			if (target)
				addEdge(
					action.intervention_type.includes("BAN") ? "disables" : "affects",
					actionNodeId,
					nodeId("action", target),
					!actionCodes.has(target),
				);
		}
	}
	for (const item of plan.black_market ?? []) {
		addNode(6, {
			id: nodeId("market", item.code),
			entityId: item.code,
			type: "marketItemNode",
			label: getLocalized(item.name ?? item.code, item.name_fa),
			subtitle: "بازار سیاه",
			raw: item,
		});
		if (item.target?.action_code) {
			addEdge(
				"affects",
				nodeId("market", item.code),
				nodeId("action", item.target.action_code),
				!actionCodes.has(item.target.action_code),
			);
		}
	}
	return { nodes, edges };
};

export const getNodeSearchText = (node: GamePlanGraphNode): string =>
	[
		node.label,
		node.entityId,
		node.subtitle,
		node.subjectId,
		node.scenarioId,
		node.scenarioType,
		node.executionMode,
		node.actionType,
	]
		.filter((value): value is string => Boolean(value))
		.join(" ")
		.toLocaleLowerCase("fa");

export const filterGamePlanGraphNodes = (
	graph: GamePlanGraph,
	query: string,
): GamePlanGraphNode[] => {
	const normalizedQuery = query.trim().toLocaleLowerCase("fa");
	if (!normalizedQuery) return graph.nodes;
	return graph.nodes.filter((node) =>
		getNodeSearchText(node).includes(normalizedQuery),
	);
};

export const getGraphDescendantNodeIds = (
	graph: GamePlanGraph,
	rootId: string | null,
): Set<string> => {
	if (!rootId) return new Set();
	const descendants = new Set([rootId]);
	let changed = true;
	while (changed) {
		changed = false;
		for (const edge of graph.edges) {
			if (descendants.has(edge.source) && !descendants.has(edge.target)) {
				descendants.add(edge.target);
				changed = true;
			}
		}
	}
	return descendants;
};

export const getNodeColorByType = (node: GamePlanGraphNode): string => {
	if (node.broken) return "#ef4444";
	if (node.type === "actionNode" || node.type === "counterNode") {
		return node.actionType === "defense" ? "#3b82f6" : "#ef4444";
	}
	const colors: Record<GamePlanGraphNodeType, string> = {
		goalNode: "#8b5cf6",
		subjectNode: "#06b6d4",
		subSubjectNode: "#0ea5e9",
		scenarioNode: "#14b8a6",
		stepNode: "#22c55e",
		actionNode: "#ef4444",
		counterNode: "#3b82f6",
		effectNode: "#f97316",
		governmentNode: "#eab308",
		marketItemNode: "#a855f7",
	};
	return colors[node.type];
};

export const buildGraphWarnings = (
	plan: ConfigureAllRequestV2,
): GamePlanGraphWarning[] => {
	const warnings: GamePlanGraphWarning[] = [];
	const add = (
		code: string,
		message: string,
		entityId?: string,
		severity: GamePlanGraphWarning["severity"] = "warning",
	): void => {
		warnings.push({ code, message, entityId, severity });
	};
	const actionCodes = new Set(plan.actions.map((item) => item.code));
	const stepIds = new Set(plan.scenario_steps.map((item) => item.id));
	const validEffectTargets = new Set([
		...actionCodes,
		...stepIds,
		...plan.goals.map((item) => item.id),
		...plan.subjects.map((item) => item.id),
		...plan.sub_subjects.map((item) => item.id),
		...plan.scenarios.map((item) => item.id),
	]);
	for (const subject of plan.subjects) {
		const children = plan.sub_subjects.filter(
			(item) => item.subject_id === subject.id,
		);
		if (children.length === 0)
			add(
				"SUBJECT_WITHOUT_SUB_SUBJECT",
				"این موضوع زیرموضوع ندارد.",
				subject.id,
			);
		const share = children.reduce((sum, item) => sum + item.progress_share, 0);
		if (share !== 100)
			add(
				"SUB_SUBJECT_SHARE_NOT_100",
				`جمع سهم زیرموضوع‌ها ${share}٪ است؛ باید ۱۰۰٪ باشد.`,
				subject.id,
				"error",
			);
	}
	for (const item of plan.sub_subjects) {
		if (!plan.scenarios.some((scenario) => scenario.sub_subject_id === item.id))
			add(
				"SUB_SUBJECT_WITHOUT_SCENARIO",
				"این زیرموضوع سناریو ندارد.",
				item.id,
			);
	}
	for (const scenario of plan.scenarios) {
		if (!plan.scenario_steps.some((step) => step.scenario_id === scenario.id))
			add("SCENARIO_WITHOUT_STEPS", "این سناریو گامی ندارد.", scenario.id);
	}
	for (const step of plan.scenario_steps) {
		if (!actionCodes.has(step.action_code))
			add(
				"MISSING_STEP_ACTION",
				`کنش «${step.action_code}» برای این گام پیدا نشد.`,
				step.id,
				"error",
			);
		for (const dependency of step.depends_on ?? []) {
			if (!stepIds.has(dependency))
				add(
					"MISSING_STEP_DEPENDENCY",
					`پیش‌نیاز «${dependency}» پیدا نشد.`,
					step.id,
					"error",
				);
		}
		for (const effect of [
			...(step.on_success ?? []),
			...(step.on_failure ?? []),
		]) {
			if (effect.target && !validEffectTargets.has(effect.target))
				add(
					"MISSING_STEP_EFFECT_TARGET",
					`هدف اثر «${effect.target}» پیدا نشد.`,
					step.id,
					"error",
				);
		}
	}
	for (const rule of plan.impact_rules) {
		if (rule.trigger.action_code && !actionCodes.has(rule.trigger.action_code))
			add(
				"MISSING_IMPACT_TRIGGER_ACTION",
				`کنش محرک «${rule.trigger.action_code}» پیدا نشد.`,
				rule.id,
				"error",
			);
		for (const effect of rule.effects) {
			if (effect.target && !validEffectTargets.has(effect.target))
				add(
					"MISSING_EFFECT_TARGET",
					`هدف اثر «${effect.target}» پیدا نشد.`,
					rule.id,
					"error",
				);
		}
	}
	for (const mapping of plan.action_counters ?? []) {
		if (!actionCodes.has(mapping.attack_code))
			add(
				"MISSING_COUNTER_ATTACK",
				"کنش تهاجمی ضدکنش پیدا نشد.",
				mapping.attack_code,
				"error",
			);
		for (const counter of mapping.countered_by ?? []) {
			if (!actionCodes.has(counter.defense_code))
				add(
					"MISSING_COUNTER_DEFENSE",
					"کنش دفاعی ضدکنش پیدا نشد.",
					counter.defense_code,
					"error",
				);
		}
	}
	for (const item of plan.black_market ?? []) {
		const target = item.target?.action_code;
		if (target && !actionCodes.has(target))
			add(
				"MISSING_MARKET_ACTION",
				`کنش هدف «${target}» پیدا نشد.`,
				item.code,
				"error",
			);
	}
	for (const eventType of REQUIRED_VISIBILITY_EVENT_TYPES) {
		if (!(eventType in plan.visibility_config.events))
			add(
				"MISSING_VISIBILITY_EVENT",
				`سطح نمایش رویداد «${eventType}» تعریف نشده است.`,
				eventType,
				"error",
			);
	}
	return warnings;
};

export const normalizeServerGamePlanGraph = (
	input: GamePlanGraphResponse,
): GamePlanGraph | null => {
	const nodeTypes = new Set<GamePlanGraphNodeType>([
		"goalNode",
		"subjectNode",
		"subSubjectNode",
		"scenarioNode",
		"stepNode",
		"actionNode",
		"counterNode",
		"effectNode",
		"governmentNode",
		"marketItemNode",
	]);
	const serverNodeTypes: Record<string, GamePlanGraphNodeType> = {
		goal: "goalNode",
		goal_node: "goalNode",
		subject: "subjectNode",
		subject_node: "subjectNode",
		sub_subject: "subSubjectNode",
		subsubject: "subSubjectNode",
		scenario: "scenarioNode",
		step: "stepNode",
		scenario_step: "stepNode",
		action: "actionNode",
		counter: "counterNode",
		effect: "effectNode",
		government: "governmentNode",
		government_action: "governmentNode",
		market_item: "marketItemNode",
		black_market: "marketItemNode",
	};
	const nodes = input.nodes.flatMap((raw, index) => {
		const id = typeof raw.id === "string" ? raw.id : null;
		if (!id) return [];
		const data =
			raw.data && typeof raw.data === "object"
				? (raw.data as Record<string, unknown>)
				: raw;
		const rawType = typeof raw.type === "string" ? raw.type : "";
		const type = nodeTypes.has(rawType as GamePlanGraphNodeType)
			? (rawType as GamePlanGraphNodeType)
			: (serverNodeTypes[rawType.toLocaleLowerCase()] ?? "subjectNode");
		const position =
			raw.position && typeof raw.position === "object"
				? (raw.position as Record<string, unknown>)
				: null;
		return [
			{
				id,
				entityId:
					typeof data.entityId === "string"
						? data.entityId
						: typeof data.entity_id === "string"
							? data.entity_id
							: id,
				type,
				label:
					typeof data.label_fa === "string"
						? data.label_fa
						: typeof data.label === "string"
							? data.label
							: typeof data.title_fa === "string"
								? data.title_fa
								: typeof data.title === "string"
									? data.title
									: id,
				subtitle: typeof data.subtitle === "string" ? data.subtitle : undefined,
				x:
					typeof raw.x === "number"
						? raw.x
						: typeof position?.x === "number"
							? position.x
							: (index % 6) * 310,
				y:
					typeof raw.y === "number"
						? raw.y
						: typeof position?.y === "number"
							? position.y
							: Math.floor(index / 6) * 130,
				sideId:
					typeof data.sideId === "number"
						? data.sideId
						: typeof data.side_id === "number"
							? data.side_id
							: undefined,
				subjectId:
					typeof data.subjectId === "string"
						? data.subjectId
						: typeof data.subject_id === "string"
							? data.subject_id
							: undefined,
				scenarioType:
					typeof data.scenarioType === "string"
						? data.scenarioType
						: typeof data.scenario_type === "string"
							? data.scenario_type
							: undefined,
				executionMode:
					typeof data.executionMode === "string"
						? data.executionMode
						: typeof data.execution_mode === "string"
							? data.execution_mode
							: undefined,
				actionType:
					typeof data.actionType === "string"
						? data.actionType
						: typeof data.action_type === "string"
							? data.action_type
							: undefined,
				goalId:
					typeof data.goalId === "string"
						? data.goalId
						: typeof data.goal_id === "string"
							? data.goal_id
							: undefined,
				scenarioId:
					typeof data.scenarioId === "string"
						? data.scenarioId
						: typeof data.scenario_id === "string"
							? data.scenario_id
							: undefined,
				raw: data.raw ?? raw,
			} satisfies GamePlanGraphNode,
		];
	});
	if (nodes.length === 0) return null;
	const ids = new Set(nodes.map((node) => node.id));
	const serverEdgeTypes: Record<string, GamePlanGraphEdgeType> = {
		goal_to_subject: "owns",
		subject_to_sub_subject: "decomposes_to",
		sub_subject_to_scenario: "contains",
		scenario_to_step: "contains",
		step_to_action: "executes",
		step_depends_on_step: "depends_on",
		action_counter: "counters",
		effect_target: "affects",
		market_item_target: "affects",
		government_action_target: "affects",
	};
	const edgeTypes = new Set<GamePlanGraphEdgeType>([
		"owns",
		"decomposes_to",
		"contains",
		"executes",
		"depends_on",
		"counters",
		"affects",
		"unlocks",
		"disables",
		"reveals",
	]);
	const edges = input.edges.flatMap((raw, index) => {
		if (typeof raw.source !== "string" || typeof raw.target !== "string")
			return [];
		const rawType = typeof raw.type === "string" ? raw.type : "contains";
		return [
			{
				id: typeof raw.id === "string" ? raw.id : `server-edge-${index}`,
				source: raw.source,
				target: raw.target,
				type: edgeTypes.has(rawType as GamePlanGraphEdgeType)
					? (rawType as GamePlanGraphEdgeType)
					: (serverEdgeTypes[rawType.toLocaleLowerCase()] ?? "contains"),
				broken: !ids.has(raw.source) || !ids.has(raw.target),
			},
		];
	});
	return { nodes, edges };
};

export const resolvePublishedGamePlanGraph = async (
	loaders: PublishedGamePlanGraphLoaders,
): Promise<PublishedGamePlanGraphResult> => {
	try {
		const graph = normalizeServerGamePlanGraph(await loaders.loadGraph());
		if (graph) {
			return {
				graph,
				source: "server",
				warnings: graph.edges
					.filter((edge) => edge.broken)
					.map((edge) => ({
						code: "BROKEN_SERVER_EDGE",
						message: `ارجاع ${edge.source} ← ${edge.target} ناقص است.`,
						entityId: edge.id,
						severity: "error" as const,
					})),
			};
		}
	} catch {
		// The graph endpoint is optional. The published plan remains authoritative.
	}
	try {
		const plan = await loaders.loadPlan();
		return {
			graph: buildGamePlanGraph(plan),
			warnings: buildGraphWarnings(plan),
			source: "plan",
		};
	} catch {
		return { graph: null, warnings: [], source: "empty" };
	}
};
