"use client";

import type {
	GamePlanGraph,
	GamePlanGraphEdgeType,
	GamePlanGraphNode,
} from "@workspace/trpc";
import { buildGamePlanGraph } from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import {
	Background,
	Controls,
	type Edge,
	Handle,
	MarkerType,
	MiniMap,
	type Node,
	type NodeProps,
	Position,
	ReactFlow,
} from "@xyflow/react";
import { motion } from "framer-motion";
import {
	AlertTriangle,
	ArrowLeft,
	Box,
	CircleDotDashed,
	Crosshair,
	Eye,
	EyeOff,
	Footprints,
	GitBranch,
	LoaderCircle,
	Network,
	Route,
	Search,
	ShieldCheck,
	Sparkles,
	Target,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
	loadDefaultGamePlan,
	loadPublishedGamePlan,
	loadServerGamePlanGraph,
	loadStoredGamePlanDraft,
} from "@/lib/game-plan";

type FlowNodeData = Record<string, unknown> & {
	label: string;
	subtitle?: string;
	kind: GamePlanGraphNode["type"];
	broken?: boolean;
	dimmed?: boolean;
	nodeIndex: number;
};
type StrategyFlowNode = Node<FlowNodeData>;

const NODE_TONE: Record<GamePlanGraphNode["type"], string> = {
	goalNode: "border-violet-400/50 bg-violet-950/95 text-violet-50",
	subjectNode: "border-cyan-300/60 bg-cyan-950/95 text-cyan-50",
	subSubjectNode: "border-sky-400/45 bg-sky-950/95 text-sky-50",
	scenarioNode: "border-amber-400/50 bg-amber-950/95 text-amber-50",
	stepNode: "border-emerald-400/45 bg-emerald-950/95 text-emerald-50",
	actionNode: "border-rose-400/45 bg-rose-950/95 text-rose-50",
	effectNode: "border-fuchsia-400/40 bg-fuchsia-950/95 text-fuchsia-50",
	governmentNode: "border-yellow-300/60 bg-yellow-950/95 text-yellow-50",
	marketItemNode: "border-indigo-400/40 bg-indigo-950/95 text-indigo-50",
};

const NODE_LABEL: Record<GamePlanGraphNode["type"], string> = {
	goalNode: "هدف",
	subjectNode: "موضوع فعال",
	subSubjectNode: "زیرموضوع",
	scenarioNode: "سناریو",
	stepNode: "گام",
	actionNode: "کنش",
	effectNode: "اثر",
	governmentNode: "دولت",
	marketItemNode: "بازار سیاه",
};

const NODE_ICON = {
	goalNode: Target,
	subjectNode: Crosshair,
	subSubjectNode: Network,
	scenarioNode: Route,
	stepNode: Footprints,
	actionNode: Zap,
	effectNode: Sparkles,
	governmentNode: ShieldCheck,
	marketItemNode: Box,
} satisfies Record<GamePlanGraphNode["type"], typeof Target>;

const EDGE_COLOR: Partial<Record<GamePlanGraphEdgeType, string>> = {
	owns: "#8b5cf6",
	decomposes_to: "#38bdf8",
	contains: "#f59e0b",
	executes: "#34d399",
	depends_on: "#64748b",
	counters: "#fb7185",
	affects: "#e879f9",
	unlocks: "#22c55e",
	disables: "#f43f5e",
	reveals: "#facc15",
};

const STAGES = [
	{ label: "هدف", icon: Target, tone: "text-violet-300" },
	{ label: "موضوع", icon: Crosshair, tone: "text-cyan-300" },
	{ label: "زیرموضوع", icon: Network, tone: "text-sky-300" },
	{ label: "سناریو", icon: Route, tone: "text-amber-300" },
	{ label: "گام", icon: Footprints, tone: "text-emerald-300" },
	{ label: "کنش", icon: Zap, tone: "text-rose-300" },
] as const;

function StrategyNode({ data, selected }: NodeProps<StrategyFlowNode>) {
	const Icon = NODE_ICON[data.kind];
	return (
		<motion.div
			initial={{ opacity: 0, x: 22, scale: 0.94 }}
			animate={{ opacity: data.dimmed ? 0.18 : 1, x: 0, scale: 1 }}
			transition={{
				duration: 0.38,
				delay: Math.min(data.nodeIndex * 0.022, 0.42),
				ease: [0.22, 1, 0.36, 1],
			}}
			whileHover={data.dimmed ? undefined : { y: -4, scale: 1.025 }}
			className={`min-w-56 max-w-64 rounded-2xl border px-4 py-3.5 shadow-2xl backdrop-blur ${NODE_TONE[data.kind]} ${selected ? "ring-2 ring-white/70" : ""} ${data.broken ? "ring-2 ring-rose-500" : ""}`}
		>
			<Handle
				type="target"
				position={Position.Right}
				className="!size-2.5 !border-2 !border-slate-950 !bg-white/70"
			/>
			<div className="mb-2 flex items-center justify-between gap-3">
				<div className="flex items-center gap-2 text-[10px] font-bold opacity-65">
					<Icon className="size-3.5" />
					{NODE_LABEL[data.kind]}
				</div>
				{data.broken && (
					<AlertTriangle className="size-4 shrink-0 text-rose-300" />
				)}
			</div>
			<div className="line-clamp-2 text-sm font-black leading-6">
				{data.label}
			</div>
			{data.subtitle && (
				<div className="mt-1.5 truncate text-[10px] opacity-55">
					{data.subtitle}
				</div>
			)}
			<Handle
				type="source"
				position={Position.Left}
				className="!size-2.5 !border-2 !border-slate-950 !bg-white/70"
			/>
		</motion.div>
	);
}

const nodeTypes = {
	goalNode: StrategyNode,
	subjectNode: StrategyNode,
	subSubjectNode: StrategyNode,
	scenarioNode: StrategyNode,
	stepNode: StrategyNode,
	actionNode: StrategyNode,
	effectNode: StrategyNode,
	governmentNode: StrategyNode,
	marketItemNode: StrategyNode,
};

const rankOf = (type: GamePlanGraphNode["type"]): number => {
	switch (type) {
		case "goalNode":
			return 0;
		case "subjectNode":
			return 1;
		case "subSubjectNode":
			return 2;
		case "scenarioNode":
			return 3;
		case "stepNode":
			return 4;
		case "actionNode":
			return 5;
		default:
			return 6;
	}
};

const compactSubjectLayout = (graph: GamePlanGraph): GamePlanGraph => {
	const yById = new Map<string, number>();
	const originalNode = new Map(graph.nodes.map((node) => [node.id, node]));
	const ordered = (nodes: GamePlanGraphNode[]) =>
		[...nodes].sort((a, b) => a.y - b.y || a.label.localeCompare(b.label));
	const scenarios = ordered(
		graph.nodes.filter((node) => node.type === "scenarioNode"),
	);
	const centerY =
		scenarios.length > 0 ? ((scenarios.length - 1) * 370) / 2 + 180 : 260;

	for (const [scenarioIndex, scenario] of scenarios.entries()) {
		const scenarioY = scenarioIndex * 370 + 180;
		yById.set(scenario.id, scenarioY);
		const steps = ordered(
			graph.edges
				.filter(
					(edge) => edge.source === scenario.id && edge.type === "contains",
				)
				.flatMap((edge) => originalNode.get(edge.target) ?? [])
				.filter((node) => node.type === "stepNode"),
		);
		for (const [stepIndex, step] of steps.entries()) {
			yById.set(
				step.id,
				scenarioY + (stepIndex - (steps.length - 1) / 2) * 112,
			);
		}
	}

	const averageTargets = (
		sourceId: string,
		edgeTypes: GamePlanGraphEdgeType[],
	) => {
		const values = graph.edges
			.filter(
				(edge) => edge.source === sourceId && edgeTypes.includes(edge.type),
			)
			.flatMap((edge) => yById.get(edge.target) ?? []);
		return values.length > 0
			? values.reduce((sum, value) => sum + value, 0) / values.length
			: undefined;
	};

	for (const node of ordered(
		graph.nodes.filter((item) => item.type === "subSubjectNode"),
	)) {
		yById.set(node.id, averageTargets(node.id, ["contains"]) ?? centerY);
	}
	for (const node of graph.nodes.filter(
		(item) => item.type === "subjectNode" || item.type === "goalNode",
	)) {
		yById.set(node.id, centerY);
	}
	for (const action of ordered(
		graph.nodes.filter((item) => item.type === "actionNode"),
	)) {
		const values = graph.edges
			.filter((edge) => edge.target === action.id && edge.type === "executes")
			.flatMap((edge) => yById.get(edge.source) ?? []);
		if (values.length > 0) {
			yById.set(
				action.id,
				values.reduce((sum, value) => sum + value, 0) / values.length,
			);
		}
	}
	const contextNodes = ordered(
		graph.nodes.filter(
			(node) => node.type === "effectNode" || !yById.has(node.id),
		),
	);
	for (const [index, node] of contextNodes.entries()) {
		const targetEdge = graph.edges.find((edge) => edge.source === node.id);
		const targetY = targetEdge ? yById.get(targetEdge.target) : undefined;
		yById.set(
			node.id,
			targetY ?? centerY + (index - contextNodes.length / 2) * 118,
		);
	}

	return {
		nodes: graph.nodes.map((node) => ({
			...node,
			x: 80 + (6 - rankOf(node.type)) * 335,
			y: yById.get(node.id) ?? centerY,
		})),
		edges: graph.edges,
	};
};

const selectSubjectPath = (
	graph: GamePlanGraph,
	subjectId: string,
	includeContext: boolean,
): GamePlanGraph => {
	const selected = graph.nodes.find(
		(node) => node.type === "subjectNode" && node.entityId === subjectId,
	);
	if (!selected) return { nodes: [], edges: [] };
	const visible = new Set([selected.id]);
	const forwardTypes = new Set<GamePlanGraphEdgeType>([
		"decomposes_to",
		"contains",
		"executes",
	]);
	let changed = true;
	while (changed) {
		changed = false;
		for (const edge of graph.edges) {
			if (
				forwardTypes.has(edge.type) &&
				visible.has(edge.source) &&
				!visible.has(edge.target)
			) {
				visible.add(edge.target);
				changed = true;
			}
			if (
				edge.type === "owns" &&
				edge.target === selected.id &&
				!visible.has(edge.source)
			) {
				visible.add(edge.source);
				changed = true;
			}
		}
	}
	if (includeContext) {
		for (const edge of graph.edges) {
			if (
				["affects", "unlocks", "disables", "reveals"].includes(edge.type) &&
				visible.has(edge.target)
			) {
				visible.add(edge.source);
			}
			if (
				edge.type === "counters" &&
				(visible.has(edge.source) || visible.has(edge.target))
			) {
				visible.add(edge.source);
				visible.add(edge.target);
			}
		}
	}
	const edges = graph.edges.filter(
		(edge) => visible.has(edge.source) && visible.has(edge.target),
	);
	return compactSubjectLayout({
		nodes: graph.nodes.filter((node) => visible.has(node.id)),
		edges,
	});
};

const mapGraph = (
	graph: GamePlanGraph,
	query: string,
): { nodes: StrategyFlowNode[]; edges: Edge[] } => {
	const normalizedQuery = query.trim().toLocaleLowerCase("fa");
	return {
		nodes: graph.nodes.map((node, nodeIndex) => ({
			id: node.id,
			type: node.type,
			position: { x: node.x, y: node.y },
			draggable: false,
			data: {
				label: node.label,
				subtitle: node.subtitle,
				kind: node.type,
				broken: node.broken,
				nodeIndex,
				dimmed: Boolean(
					normalizedQuery &&
						!`${node.label} ${node.entityId}`
							.toLocaleLowerCase("fa")
							.includes(normalizedQuery),
				),
			},
		})),
		edges: graph.edges.map((edge) => {
			const color = EDGE_COLOR[edge.type] ?? "#64748b";
			return {
				id: edge.id,
				source: edge.source,
				target: edge.target,
				type: "smoothstep",
				animated: edge.type !== "depends_on",
				style: {
					stroke: edge.broken ? "#fb7185" : color,
					strokeWidth: edge.type === "depends_on" ? 1 : 1.8,
					opacity: edge.type === "depends_on" ? 0.45 : 0.75,
				},
				pathOptions: { borderRadius: 24, offset: 22 },
				markerEnd: {
					type: MarkerType.ArrowClosed,
					color: edge.broken ? "#fb7185" : color,
				},
			};
		}),
	};
};

const serverGraphToLocal = (
	input: Awaited<ReturnType<typeof loadServerGamePlanGraph>>,
): GamePlanGraph | null => {
	const allowedNodeTypes = new Set<GamePlanGraphNode["type"]>([
		"goalNode",
		"subjectNode",
		"subSubjectNode",
		"scenarioNode",
		"stepNode",
		"actionNode",
		"effectNode",
		"governmentNode",
		"marketItemNode",
	]);
	const allowedEdgeTypes = new Set<GamePlanGraphEdgeType>([
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
	const nodes = input.nodes.flatMap((raw, index) => {
		const id = typeof raw.id === "string" ? raw.id : null;
		if (!id) return [];
		const data =
			raw.data && typeof raw.data === "object"
				? (raw.data as Record<string, unknown>)
				: raw;
		const kind =
			typeof raw.type === "string" &&
			allowedNodeTypes.has(raw.type as GamePlanGraphNode["type"])
				? (raw.type as GamePlanGraphNode["type"])
				: "subjectNode";
		return [
			{
				id,
				entityId: typeof data.entityId === "string" ? data.entityId : id,
				type: kind,
				label: typeof data.label === "string" ? data.label : id,
				subtitle: typeof data.subtitle === "string" ? data.subtitle : undefined,
				x: (index % 6) * 320,
				y: Math.floor(index / 6) * 130,
			},
		];
	});
	if (nodes.length === 0) return null;
	const nodeIds = new Set(nodes.map((node) => node.id));
	const edges = input.edges.flatMap((raw, index) => {
		if (typeof raw.source !== "string" || typeof raw.target !== "string")
			return [];
		const type =
			typeof raw.type === "string" &&
			allowedEdgeTypes.has(raw.type as GamePlanGraphEdgeType)
				? (raw.type as GamePlanGraphEdgeType)
				: "contains";
		return [
			{
				id: typeof raw.id === "string" ? raw.id : `server-edge-${index}`,
				source: raw.source,
				target: raw.target,
				type,
				broken: !nodeIds.has(raw.source) || !nodeIds.has(raw.target),
			},
		];
	});
	return { nodes, edges };
};

export default function AdminGamePlanGraphPage() {
	const [graph, setGraph] = useState<GamePlanGraph | null>(null);
	const [source, setSource] = useState("پیش‌نویس محلی");
	const [loading, setLoading] = useState(true);
	const [query, setQuery] = useState("");
	const [subject, setSubject] = useState("");
	const [showContext, setShowContext] = useState(false);

	useEffect(() => {
		let active = true;
		void (async () => {
			try {
				const serverGraph = serverGraphToLocal(await loadServerGamePlanGraph());
				if (active && serverGraph) {
					setGraph(serverGraph);
					setSource("گراف منتشرشده سرور");
					return;
				}
			} catch {
				// The documented graph endpoint may not be deployed yet; use the typed local fallback.
			}
			try {
				const storedPlan = loadStoredGamePlanDraft();
				const plan =
					storedPlan ??
					(await loadPublishedGamePlan().catch(loadDefaultGamePlan));
				if (active) {
					setGraph(buildGamePlanGraph(plan));
					setSource(storedPlan ? "پیش‌نویس محلی" : "ساخته‌شده از برنامه بازی");
				}
			} finally {
				if (active) setLoading(false);
			}
		})();
		return () => {
			active = false;
		};
	}, []);

	const subjects = useMemo(
		() =>
			[
				...(graph?.nodes.filter((node) => node.type === "subjectNode") ?? []),
			].sort((a, b) => a.label.localeCompare(b.label, "fa")),
		[graph],
	);

	useEffect(() => {
		if (!subject && subjects[0]) setSubject(subjects[0].entityId);
	}, [subject, subjects]);

	const selectedGraph = useMemo(
		() =>
			graph && subject
				? selectSubjectPath(graph, subject, showContext)
				: { nodes: [], edges: [] },
		[graph, showContext, subject],
	);
	const flow = useMemo(
		() => mapGraph(selectedGraph, query),
		[query, selectedGraph],
	);
	const selectedSubject = subjects.find((item) => item.entityId === subject);
	const counts = useMemo(
		() => ({
			subSubjects: selectedGraph.nodes.filter(
				(node) => node.type === "subSubjectNode",
			).length,
			scenarios: selectedGraph.nodes.filter(
				(node) => node.type === "scenarioNode",
			).length,
			steps: selectedGraph.nodes.filter((node) => node.type === "stepNode")
				.length,
		}),
		[selectedGraph],
	);

	return (
		<main className="relative flex h-screen flex-col overflow-hidden bg-[#060a14] text-slate-100">
			<motion.div
				className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-cyan-500/10 blur-3xl"
				animate={{ scale: [1, 1.16, 1], opacity: [0.35, 0.7, 0.35] }}
				transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY }}
			/>
			<header className="relative z-10 border-b border-white/10 bg-slate-950/88 px-4 py-4 backdrop-blur-xl lg:px-6">
				<div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
					<div className="flex items-center gap-3">
						<Link href="/admin/game-plan">
							<Button
								size="icon"
								variant="outline"
								className="border-white/10 bg-white/5"
							>
								<ArrowLeft className="size-4" />
							</Button>
						</Link>
						<div className="grid size-11 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">
							<GitBranch className="size-5" />
						</div>
						<div>
							<h1 className="font-black">نقشه مأموریت موضوع</h1>
							<div className="text-xs text-slate-500">
								{source} · نمایش متمرکز یک موضوع
							</div>
						</div>
					</div>
					<div className="flex flex-col gap-2 lg:flex-row lg:items-center">
						<div className="min-w-[320px] lg:min-w-[460px]">
							<Select value={subject} onValueChange={setSubject}>
								<SelectTrigger className="h-11 border-cyan-400/25 bg-cyan-500/5 text-right">
									<SelectValue placeholder="یک موضوع را انتخاب کنید" />
								</SelectTrigger>
								<SelectContent>
									{subjects.map((item) => (
										<SelectItem key={item.entityId} value={item.entityId}>
											{item.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="relative min-w-48">
							<Search className="absolute right-3 top-3 size-4 text-slate-500" />
							<Input
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="برجسته‌سازی گره…"
								className="h-11 border-white/10 bg-white/5 pr-9"
							/>
						</div>
						<Button
							variant="outline"
							onClick={() => setShowContext((value) => !value)}
							className={`h-11 border-white/10 ${showContext ? "bg-fuchsia-500/15 text-fuchsia-200" : "bg-white/5 text-slate-300"}`}
						>
							{showContext ? (
								<Eye className="size-4" />
							) : (
								<EyeOff className="size-4" />
							)}
							{showContext ? "اثرها و پادکنش‌ها: روشن" : "نمای ساده"}
						</Button>
					</div>
				</div>

				<div className="mt-4 flex items-center gap-1 overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.025] p-2">
					{STAGES.map((stage, index) => {
						const Icon = stage.icon;
						return (
							<div
								key={stage.label}
								className="flex min-w-0 flex-1 items-center"
							>
								<motion.div
									initial={{ opacity: 0, y: 6 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: index * 0.06 }}
									className="flex min-w-28 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-300"
								>
									<Icon className={`size-4 ${stage.tone}`} />
									{stage.label}
								</motion.div>
								{index < STAGES.length - 1 && (
									<ArrowLeft className="size-3.5 shrink-0 text-slate-700" />
								)}
							</div>
						);
					})}
				</div>
			</header>

			<section className="relative min-h-0 flex-1">
				{loading ? (
					<div className="grid h-full place-items-center">
						<div className="text-center">
							<LoaderCircle className="mx-auto size-9 animate-spin text-cyan-300" />
							<p className="mt-3 text-sm text-slate-500">
								در حال ساخت مسیر موضوع…
							</p>
						</div>
					</div>
				) : flow.nodes.length === 0 ? (
					<div className="grid h-full place-items-center p-6 text-center">
						<div>
							<CircleDotDashed className="mx-auto size-12 text-slate-700" />
							<h2 className="mt-4 text-lg font-black">
								موضوعی برای نمایش نیست
							</h2>
							<p className="mt-2 text-sm text-slate-500">
								یک موضوع را از فهرست بالا انتخاب کنید.
							</p>
						</div>
					</div>
				) : (
					<ReactFlow
						key={`${subject}-${showContext}`}
						nodes={flow.nodes}
						edges={flow.edges}
						nodeTypes={nodeTypes}
						fitView
						fitViewOptions={{ padding: 0.18, duration: 700 }}
						minZoom={0.22}
						maxZoom={1.65}
						nodesDraggable={false}
						nodesConnectable={false}
						elementsSelectable
						colorMode="dark"
						proOptions={{ hideAttribution: true }}
					>
						<Background color="#1e293b" gap={30} size={1} />
						<Controls position="bottom-right" showInteractive={false} />
						<MiniMap
							position="bottom-left"
							pannable
							zoomable
							nodeColor={(node) =>
								node.data.broken
									? "#fb7185"
									: node.type === "goalNode"
										? "#8b5cf6"
										: node.type === "scenarioNode"
											? "#f59e0b"
											: node.type === "actionNode"
												? "#f43f5e"
												: "#06b6d4"
							}
							maskColor="rgba(2,6,23,.74)"
						/>
					</ReactFlow>
				)}

				{selectedSubject && (
					<motion.div
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						className="pointer-events-none absolute bottom-5 right-5 z-10 max-w-sm rounded-2xl border border-cyan-400/15 bg-slate-950/85 p-4 shadow-2xl backdrop-blur-xl"
					>
						<div className="flex items-center gap-2 text-xs text-cyan-300">
							<Crosshair className="size-4" /> موضوع در حال بررسی
						</div>
						<div className="mt-2 font-black">{selectedSubject.label}</div>
						<div className="mt-3 flex flex-wrap gap-2">
							<Badge className="bg-sky-500/15 text-sky-200">
								{counts.subSubjects} زیرموضوع
							</Badge>
							<Badge className="bg-amber-500/15 text-amber-200">
								{counts.scenarios} سناریو
							</Badge>
							<Badge className="bg-emerald-500/15 text-emerald-200">
								{counts.steps} گام
							</Badge>
						</div>
					</motion.div>
				)}
			</section>
		</main>
	);
}
