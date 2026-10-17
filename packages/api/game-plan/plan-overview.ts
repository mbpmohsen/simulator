import type { ConfigureAllRequestV2 } from "../game-server/types";
import { planSideName, roleTypeOf } from "./roster";
import type { PlanNodeKind } from "./structure";

/**
 * Layout for the plan's at-a-glance map: four fixed columns, grouped by side.
 *
 * Kept out of the component because the geometry is the part that can silently
 * be wrong - a node placed off-canvas, a parent whose centre drifts away from
 * its children, a lane that does not cover its own rows. None of that shows up
 * in a typecheck and all of it is cheap to assert here.
 *
 * Deliberately not a force layout: an overview that settles somewhere new on
 * every render cannot be scanned, and the admin surface is a cockpit.
 *
 * Right-to-left: column 0 (goals) is pinned to the right edge and depth grows
 * leftwards, so a child always sits to the LEFT of its parent.
 */

export interface PlanOverviewNode {
	kind: PlanNodeKind;
	id: string;
	label: string;
	column: number;
	x: number;
	y: number;
	issue: boolean;
	/** Short right-hand annotation: a share, a step count. */
	badge: string | null;
	/**
	 * Set on the "+N more" stub that stands in for the children a wide parent
	 * did not get room for. Clicking it should open that parent, not the stub.
	 */
	overflowOf: { kind: PlanNodeKind; id: string } | null;
}

export interface PlanOverviewEdge {
	from: string;
	to: string;
	issue: boolean;
}

export interface PlanOverviewLane {
	sideId: number;
	name: string;
	y: number;
	height: number;
}

export interface PlanOverview {
	nodes: PlanOverviewNode[];
	edges: PlanOverviewEdge[];
	lanes: PlanOverviewLane[];
	width: number;
	height: number;
}

export const PLAN_OVERVIEW_GEOMETRY = {
	nodeWidth: 150,
	nodeHeight: 34,
	columnGap: 58,
	rowGap: 10,
	padX: 16,
	padTop: 34,
	sideGap: 26,
	columns: 4,
	/**
	 * Children drawn per parent before the rest collapse into one stub.
	 *
	 * The bundled civic plan carries 26 subjects under a single goal; drawing
	 * all of them makes a 7000px column that nobody scans. An overview that
	 * does not fit on a screen is not an overview.
	 */
	collapseAfter: 6,
} as const;

const G = PLAN_OVERVIEW_GEOMETRY;

const localized = (value: string | undefined, fa: string | undefined): string =>
	(fa?.trim() || value?.trim() || "").trim();

const truncate = (value: string, max = 20): string =>
	value.length > max ? `${value.slice(0, max - 1)}…` : value;

const faNumber = (value: number): string => value.toLocaleString("fa-IR");

/**
 * @param issueIds ids that currently carry a validation issue.
 */
export const buildPlanOverview = (
	plan: ConfigureAllRequestV2,
	issueIds: ReadonlySet<string> = new Set(),
	collapseAfter: number = G.collapseAfter,
): PlanOverview => {
	const nodes: PlanOverviewNode[] = [];
	const edges: PlanOverviewEdge[] = [];
	const lanes: PlanOverviewLane[] = [];
	const hasIssue = (id: string) => issueIds.has(id);

	// Sides in the order the playing teams introduce them, so this reads the
	// same way the roster tab does. A goal on a side with no team still gets a
	// lane rather than vanishing.
	const sideIds: number[] = [];
	for (const team of plan.teams) {
		if (team.side_id === undefined) continue;
		if (roleTypeOf(team) === "GOVERNMENT") continue;
		if (!sideIds.includes(team.side_id)) sideIds.push(team.side_id);
	}
	for (const goal of plan.goals) {
		if (!sideIds.includes(goal.side_id)) sideIds.push(goal.side_id);
	}

	const row = G.nodeHeight + G.rowGap;

	/**
	 * The children to draw, plus how many were left out. Parents with an issue
	 * are pulled to the front so a problem is never hidden behind a stub.
	 */
	const visible = <T extends { id: string }>(
		children: T[],
	): { shown: T[]; hidden: number } => {
		if (children.length <= collapseAfter) {
			return { shown: children, hidden: 0 };
		}
		const flagged = children.filter((child) => hasIssue(child.id));
		const rest = children.filter((child) => !hasIssue(child.id));
		const shown = [...flagged, ...rest].slice(0, collapseAfter);
		return { shown, hidden: children.length - shown.length };
	};

	const addStub = (
		parent: { kind: PlanNodeKind; id: string },
		column: number,
		hidden: number,
		y: number,
	): void => {
		nodes.push({
			kind: parent.kind,
			id: `overflow:${parent.id}`,
			label: `+${faNumber(hidden)} مورد دیگر`,
			column,
			x: 0,
			y,
			issue: false,
			badge: null,
			overflowOf: { kind: parent.kind, id: parent.id },
		});
		edges.push({ from: parent.id, to: `overflow:${parent.id}`, issue: false });
	};
	let cursorY = G.padTop;

	for (const sideId of sideIds) {
		const laneTop = cursorY;
		const goals = plan.goals.filter((goal) => goal.side_id === sideId);

		for (const goal of goals) {
			const goalTop = cursorY;
			const allSubjects = plan.subjects.filter(
				(subject) => subject.goal_id === goal.id,
			);
			const subjectPage = visible(allSubjects);
			const subjects = subjectPage.shown;

			for (const subject of subjects) {
				const subjectTop = cursorY;
				const allSubs = plan.sub_subjects.filter(
					(item) => item.subject_id === subject.id,
				);
				const subPage = visible(allSubs);
				const subSubjects = subPage.shown;

				for (const sub of subSubjects) {
					const subTop = cursorY;
					const scenarios = plan.scenarios.filter(
						(item) => item.sub_subject_id === sub.id,
					);

					if (scenarios.length === 0) cursorY += row;
					for (const scenario of scenarios) {
						const steps = plan.scenario_steps.filter(
							(step) => step.scenario_id === scenario.id,
						).length;
						nodes.push({
							kind: "scenario",
							id: scenario.id,
							label: truncate(localized(scenario.title, scenario.title_fa)),
							column: 3,
							x: 0,
							y: cursorY,
							issue: hasIssue(scenario.id),
							badge: steps > 0 ? `${faNumber(steps)} گام` : null,
							overflowOf: null,
						});
						edges.push({
							from: sub.id,
							to: scenario.id,
							issue: hasIssue(scenario.id),
						});
						cursorY += row;
					}

					nodes.push({
						kind: "sub_subject",
						id: sub.id,
						label: truncate(localized(sub.title, sub.title_fa)),
						column: 2,
						x: 0,
						y: (subTop + (cursorY - row)) / 2,
						issue: hasIssue(sub.id),
						badge: `${faNumber(sub.progress_share ?? 0)}٪`,
						overflowOf: null,
					});
					edges.push({
						from: subject.id,
						to: sub.id,
						issue: hasIssue(sub.id),
					});
				}

				if (subPage.hidden > 0) {
					addStub(
						{ kind: "subject", id: subject.id },
						2,
						subPage.hidden,
						cursorY,
					);
					cursorY += row;
				}
				if (subSubjects.length === 0 && subPage.hidden === 0) cursorY += row;
				nodes.push({
					kind: "subject",
					id: subject.id,
					label: truncate(localized(subject.title, subject.title_fa)),
					column: 1,
					x: 0,
					y: (subjectTop + (cursorY - row)) / 2,
					issue: hasIssue(subject.id),
					badge: null,
					overflowOf: null,
				});
				edges.push({
					from: goal.id,
					to: subject.id,
					issue: hasIssue(subject.id),
				});
			}

			if (subjectPage.hidden > 0) {
				addStub({ kind: "goal", id: goal.id }, 1, subjectPage.hidden, cursorY);
				cursorY += row;
			}
			if (subjects.length === 0 && subjectPage.hidden === 0) cursorY += row;
			nodes.push({
				kind: "goal",
				id: goal.id,
				label: truncate(localized(goal.title, goal.title_fa)),
				column: 0,
				x: 0,
				y: (goalTop + (cursorY - row)) / 2,
				issue: hasIssue(goal.id),
				badge: null,
				overflowOf: null,
			});
		}

		if (goals.length === 0) cursorY += row;
		lanes.push({
			sideId,
			name: planSideName(plan, sideId),
			y: laneTop,
			height: Math.max(G.nodeHeight, cursorY - G.rowGap - laneTop),
		});
		cursorY += G.sideGap;
	}

	const width =
		G.padX * 2 + G.columns * G.nodeWidth + (G.columns - 1) * G.columnGap;
	for (const node of nodes) {
		node.x =
			width -
			G.padX -
			(node.column + 1) * G.nodeWidth -
			node.column * G.columnGap;
	}

	return {
		nodes,
		edges,
		lanes,
		width,
		height: Math.max(G.padTop + G.nodeHeight, cursorY - G.sideGap + 12),
	};
};
