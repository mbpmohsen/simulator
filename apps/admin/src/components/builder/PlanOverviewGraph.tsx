"use client";

import type {
	ClientValidationIssue,
	ConfigureAllRequestV2,
	PlanNodeKind,
} from "@workspace/trpc";
import {
	buildPlanOverview,
	PLAN_OVERVIEW_GEOMETRY,
	planIssuesById,
} from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { TriangleAlert } from "lucide-react";
import { useMemo } from "react";

/**
 * The whole plan at a glance, drawn where the plan is edited.
 *
 * The tab that promised a live map used to show four counters and a button to
 * another page. Counting nodes is not seeing a shape: "۶ سناریو" does not tell
 * you that one goal carries everything and another is empty, which is exactly
 * what a facilitator opens this tab to find out.
 *
 * Deliberately **rough**: four fixed columns, no physics, no dragging, no
 * zoom. A layout that settles differently each time cannot be scanned, and the
 * admin surface pays for every decorative pixel. The interactive graph still
 * exists for tracing a single path — this answers the other question, the one
 * about the whole.
 *
 * The geometry lives in `buildPlanOverview` so it can be tested; this file
 * only draws what that returns. Every node is a button into the editor for
 * that node, so the rough view is also the fastest way to the detailed one.
 */

const COLUMN_LABEL = ["اهداف", "موضوع‌ها", "زیرموضوع‌ها", "سناریوها"] as const;

/** Column accents, kept apart from the semantic orange used for issues. */
const TONE: Record<
	PlanNodeKind,
	{ fill: string; stroke: string; text: string }
> = {
	goal: {
		fill: "rgba(167,139,250,.14)",
		stroke: "rgba(167,139,250,.45)",
		text: "#ddd6fe",
	},
	subject: {
		fill: "rgba(34,211,238,.12)",
		stroke: "rgba(34,211,238,.42)",
		text: "#cffafe",
	},
	sub_subject: {
		fill: "rgba(251,191,36,.11)",
		stroke: "rgba(251,191,36,.38)",
		text: "#fef3c7",
	},
	scenario: {
		fill: "rgba(52,211,153,.11)",
		stroke: "rgba(52,211,153,.38)",
		text: "#d1fae5",
	},
	step: {
		fill: "rgba(148,163,184,.1)",
		stroke: "rgba(148,163,184,.3)",
		text: "#e2e8f0",
	},
};

const ISSUE = {
	fill: "rgba(251,146,60,.16)",
	stroke: "rgba(251,146,60,.65)",
	text: "#ffedd5",
};

/** The "+N more" stub recedes: it is a door, not a node of the plan. */
const OVERFLOW = {
	fill: "rgba(148,163,184,.06)",
	stroke: "rgba(148,163,184,.28)",
	text: "#94a3b8",
};

const { nodeWidth: NODE_W, nodeHeight: NODE_H } = PLAN_OVERVIEW_GEOMETRY;

export function PlanOverviewGraph({
	plan,
	issues,
	onOpen,
}: {
	plan: ConfigureAllRequestV2;
	issues: ClientValidationIssue[];
	/** Opens the detailed editor focused on this node. */
	onOpen: (kind: PlanNodeKind, id: string) => void;
}) {
	const { nodes, edges, width, height, lanes } = useMemo(() => {
		const ids = new Set(planIssuesById(issues).keys());
		return buildPlanOverview(plan, ids);
	}, [plan, issues]);

	const byId = useMemo(
		() => new Map(nodes.map((node) => [node.id, node])),
		[nodes],
	);

	if (nodes.length === 0) {
		return (
			<div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-sm text-slate-500">
				این برنامه هنوز هدفی ندارد؛ از تب «اهداف و سناریوها» شروع کنید.
			</div>
		);
	}

	const issueCount = nodes.filter((node) => node.issue).length;

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex flex-wrap items-center gap-1.5 text-[11px]">
					{COLUMN_LABEL.map((label, index) => {
						const kind: PlanNodeKind = (
							["goal", "subject", "sub_subject", "scenario"] as const
						)[index];
						return (
							<span
								key={label}
								className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1"
								style={{
									borderColor: TONE[kind].stroke,
									background: TONE[kind].fill,
									color: TONE[kind].text,
								}}
							>
								{label}
							</span>
						);
					})}
				</div>
				{issueCount > 0 && (
					<Badge className="bg-orange-500/15 text-orange-200">
						<TriangleAlert className="size-3" />{" "}
						{issueCount.toLocaleString("fa-IR")} گره دارای ایراد
					</Badge>
				)}
			</div>

			{/* Horizontal scroll only: the diagram is as tall as the plan, and a
			    vertical scroller inside a page that already scrolls is a trap.

			    Edges are SVG, nodes are HTML buttons on top of it. Persian text
			    in <text> does not pick up the app font or RTL shaping reliably,
			    and a <g role="button"> is not a button. */}
			<div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/55 p-1">
				<div className="relative" style={{ width, height, minWidth: width }}>
					<svg
						aria-hidden="true"
						width={width}
						height={height}
						viewBox={`0 0 ${width} ${height}`}
						className="absolute inset-0"
					>
						{lanes.map((lane) => (
							<rect
								key={`${lane.sideId}-${lane.y}`}
								x={4}
								y={lane.y - 10}
								width={width - 8}
								height={lane.height + 20}
								rx={14}
								fill="rgba(148,163,184,.04)"
								stroke="rgba(148,163,184,.12)"
							/>
						))}
						{edges.map((edge) => {
							const from = byId.get(edge.from);
							const to = byId.get(edge.to);
							if (!from || !to) return null;
							// RTL: a child sits to the LEFT of its parent, so the line
							// leaves the parent's left edge and enters the child's right.
							const x1 = from.x;
							const y1 = from.y + NODE_H / 2;
							const x2 = to.x + NODE_W;
							const y2 = to.y + NODE_H / 2;
							const mid = (x1 + x2) / 2;
							return (
								<path
									key={`${edge.from}->${edge.to}`}
									d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
									fill="none"
									stroke={
										edge.issue ? "rgba(251,146,60,.5)" : "rgba(148,163,184,.28)"
									}
									strokeWidth={1.5}
								/>
							);
						})}
					</svg>

					{lanes.map((lane) => (
						<div
							key={`label-${lane.sideId}`}
							className="absolute text-[11px] text-slate-400"
							style={{ right: 14, top: lane.y - 26 }}
						>
							{lane.name}
						</div>
					))}

					{nodes.map((node) => {
						// A stub stands for the children that did not fit; clicking it
						// opens the parent that hides them, not the stub itself.
						const target = node.overflowOf ?? { kind: node.kind, id: node.id };
						const tone = node.overflowOf
							? OVERFLOW
							: node.issue
								? ISSUE
								: TONE[node.kind];
						return (
							<button
								key={`${node.kind}:${node.id}`}
								type="button"
								onClick={() => onOpen(target.kind, target.id)}
								title={node.label}
								className="absolute flex items-center justify-between gap-2 overflow-hidden rounded-[9px] px-2.5 text-[11px] transition hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
								style={{
									right: width - node.x - NODE_W,
									top: node.y,
									width: NODE_W,
									height: NODE_H,
									background: tone.fill,
									color: tone.text,
									border: `${node.issue && !node.overflowOf ? 1.6 : 1}px ${node.overflowOf ? "dashed" : "solid"} ${tone.stroke}`,
								}}
							>
								<span className="truncate text-right">{node.label}</span>
								{node.badge && (
									<span className="shrink-0 text-[9px] tabular-nums text-slate-400">
										{node.badge}
									</span>
								)}
							</button>
						);
					})}
				</div>
			</div>

			<p className="text-[11px] leading-6 text-slate-500">
				روی هر گره بزنید تا همان‌جا در «اهداف و سناریوها» باز شود. در برنامه‌های
				بزرگ، هر شاخه چند فرزند اول را نشان می‌دهد و بقیه پشت «+N مورد دیگر» جمع
				می‌شوند — گره‌های دارای ایراد همیشه نمایش داده می‌شوند. برای ردیابی یک مسیر
				کامل با کنش‌ها و اثرها، گراف تعاملی را باز کنید.
			</p>
		</div>
	);
}
