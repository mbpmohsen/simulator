import type { ConfigureAllRequestV2 } from "../game-server/types";
import { getLocalized } from "./localization";

export type GamePlanGraphNodeType =
	| "goalNode"
	| "subjectNode"
	| "subSubjectNode"
	| "scenarioNode"
	| "stepNode"
	| "actionNode"
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

	for (const goal of plan.goals)
		addNode(0, {
			id: nodeId("goal", goal.id),
			entityId: goal.id,
			type: "goalNode",
			label: getLocalized(goal.title, goal.title_fa),
			subtitle: "هدف",
			sideId: goal.side_id,
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
	}
	for (const action of plan.actions)
		addNode(5, {
			id: nodeId("action", action.code),
			entityId: action.code,
			type: "actionNode",
			label: getLocalized(action.name ?? action.code, action.name_fa),
			subtitle: action.type === "attack" ? "کنش تهاجمی" : "کنش دفاعی",
		});
	for (const mapping of plan.action_counters ?? []) {
		for (const counter of mapping.countered_by ?? [])
			addEdge(
				"counters",
				nodeId("action", counter.defense_code),
				nodeId("action", mapping.attack_code),
				!actionCodes.has(counter.defense_code) ||
					!actionCodes.has(mapping.attack_code),
			);
	}
	for (const [index, rule] of plan.impact_rules.entries()) {
		for (const [effectIndex, effect] of rule.effects.entries()) {
			const id = `${rule.id}:${effectIndex}`;
			addNode(6, {
				id: nodeId("effect", id),
				entityId: id,
				type: "effectNode",
				label: effect.type,
				subtitle: rule.trigger.event,
				broken: Boolean(
					effect.target &&
						!actionCodes.has(effect.target) &&
						!subjectIds.has(effect.target) &&
						!subSubjectIds.has(effect.target) &&
						!scenarioIds.has(effect.target) &&
						!stepIds.has(effect.target),
				),
			});
			if (effect.target) {
				const targetType = actionCodes.has(effect.target)
					? "action"
					: subjectIds.has(effect.target)
						? "subject"
						: subSubjectIds.has(effect.target)
							? "subSubject"
							: scenarioIds.has(effect.target)
								? "scenario"
								: "step";
				const edgeType: GamePlanGraphEdgeType = effect.type.includes("UNLOCK")
					? "unlocks"
					: effect.type.includes("DISABLE")
						? "disables"
						: effect.type.includes("REVEAL")
							? "reveals"
							: "affects";
				addEdge(
					edgeType,
					nodeId("effect", id),
					nodeId(targetType, effect.target),
				);
			}
		}
		if (rule.effects.length === 0)
			rowByColumn.set(6, (rowByColumn.get(6) ?? 0) + index);
	}
	for (const government of plan.government?.side_governments ?? [])
		addNode(0, {
			id: nodeId("government", government.team_id),
			entityId: String(government.team_id),
			type: "governmentNode",
			label:
				government.player.name ?? government.player.governmentCode ?? "دولت",
			subtitle: "فرماندهی",
			sideId: government.side_id,
		});
	for (const item of plan.black_market ?? [])
		addNode(6, {
			id: nodeId("market", item.code),
			entityId: item.code,
			type: "marketItemNode",
			label: getLocalized(item.name ?? item.code, item.name_fa),
			subtitle: "بازار سیاه",
		});
	return { nodes, edges };
};
