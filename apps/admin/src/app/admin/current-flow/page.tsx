"use client";

import type {
	GamePlanGraph,
	GamePlanGraphEdge,
	GamePlanGraphNode,
	GamePlanGraphWarning,
} from "@workspace/trpc";
import {
	filterGamePlanGraphNodes,
	getGraphDescendantNodeIds,
	getNodeColorByType,
	resolvePublishedGamePlanGraph,
} from "@workspace/trpc";
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
import {
	Activity,
	AlertTriangle,
	BarChart3,
	BookOpen,
	Box,
	Download,
	Footprints,
	GitBranch,
	LoaderCircle,
	Network,
	RefreshCw,
	Route,
	Search,
	ShieldCheck,
	SlidersHorizontal,
	Sparkles,
	Target,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	getActiveGameId,
	loadPublishedGamePlan,
	loadServerGamePlanGraph,
} from "@/lib/game-plan";

type FlowNodeData = Record<string, unknown> & {
	graphNode: GamePlanGraphNode;
	highlighted: boolean;
	dimmed: boolean;
};
type CurrentFlowNode = Node<FlowNodeData>;

const NODE_LABEL: Record<GamePlanGraphNode["type"], string> = {
	goalNode: "هدف",
	subjectNode: "موضوع",
	subSubjectNode: "زیرموضوع",
	scenarioNode: "سناریو",
	stepNode: "گام",
	actionNode: "کنش",
	counterNode: "ضدکنش",
	effectNode: "اثر",
	governmentNode: "دولت",
	marketItemNode: "بازار سیاه",
};

const NODE_ICON = {
	goalNode: Target,
	subjectNode: SlidersHorizontal,
	subSubjectNode: Network,
	scenarioNode: Route,
	stepNode: Footprints,
	actionNode: Zap,
	counterNode: ShieldCheck,
	effectNode: Sparkles,
	governmentNode: ShieldCheck,
	marketItemNode: Box,
} satisfies Record<GamePlanGraphNode["type"], typeof Target>;

function ReadOnlyNode({ data, selected }: NodeProps<CurrentFlowNode>) {
	const node = data.graphNode;
	const Icon = NODE_ICON[node.type];
	const color = getNodeColorByType(node);
	return (
		<div
			className={`min-w-48 max-w-60 rounded-2xl border bg-slate-950/95 p-3 shadow-2xl transition ${
				data.dimmed ? "opacity-20" : "opacity-100"
			} ${selected || data.highlighted ? "ring-2 ring-white/70" : ""}`}
			style={{ borderColor: color }}
		>
			<Handle
				type="target"
				position={Position.Right}
				className="!bg-slate-300"
			/>
			<div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
				<span className="flex items-center gap-1.5">
					<Icon className="size-3.5" style={{ color }} />{" "}
					{NODE_LABEL[node.type]}
				</span>
				{node.broken && <AlertTriangle className="size-4 text-rose-400" />}
			</div>
			<div className="mt-2 line-clamp-2 text-sm font-black text-slate-50">
				{node.label}
			</div>
			<div
				dir="ltr"
				className="mt-1 truncate text-left text-[9px] text-slate-600"
			>
				{node.entityId}
			</div>
			<Handle
				type="source"
				position={Position.Left}
				className="!bg-slate-300"
			/>
		</div>
	);
}

const nodeTypes = {
	goalNode: ReadOnlyNode,
	subjectNode: ReadOnlyNode,
	subSubjectNode: ReadOnlyNode,
	scenarioNode: ReadOnlyNode,
	stepNode: ReadOnlyNode,
	actionNode: ReadOnlyNode,
	counterNode: ReadOnlyNode,
	effectNode: ReadOnlyNode,
	governmentNode: ReadOnlyNode,
	marketItemNode: ReadOnlyNode,
};

const edgeColor = (edge: GamePlanGraphEdge): string => {
	if (edge.broken) return "#ef4444";
	if (edge.type === "counters") return "#3b82f6";
	if (edge.type === "depends_on") return "#94a3b8";
	if (["affects", "disables", "unlocks", "reveals"].includes(edge.type))
		return "#f97316";
	return "#22d3ee";
};

export default function CurrentPublishedFlowPage() {
	const [graph, setGraph] = useState<GamePlanGraph | null>(null);
	const [warnings, setWarnings] = useState<GamePlanGraphWarning[]>([]);
	const [source, setSource] = useState<"server" | "plan" | "empty">("empty");
	const [activeGameId, setActiveGameId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [query, setQuery] = useState("");
	const [side, setSide] = useState("all");
	const [goal, setGoal] = useState("all");
	const [subject, setSubject] = useState("all");
	const [scenarioType, setScenarioType] = useState("all");
	const [executionMode, setExecutionMode] = useState("all");
	const [actionType, setActionType] = useState("all");
	const [selectedId, setSelectedId] = useState<string | null>(null);

	useEffect(() => setActiveGameId(getActiveGameId()), []);

	const load = useCallback(async () => {
		setLoading(true);
		setGraph(null);
		setWarnings([]);
		try {
			const result = await resolvePublishedGamePlanGraph({
				loadGraph: loadServerGamePlanGraph,
				loadPlan: loadPublishedGamePlan,
			});
			setGraph(result.graph);
			setWarnings(result.warnings);
			setSource(result.source);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => void load(), [load]);

	const options = useMemo(() => {
		const nodes = graph?.nodes ?? [];
		return {
			sides: [...new Set(nodes.flatMap((node) => node.sideId ?? []))],
			goals: nodes.filter((node) => node.type === "goalNode"),
			subjects: nodes.filter((node) => node.type === "subjectNode"),
			scenarioTypes: [
				...new Set(nodes.flatMap((node) => node.scenarioType ?? [])),
			],
			executionModes: [
				...new Set(nodes.flatMap((node) => node.executionMode ?? [])),
			],
		};
	}, [graph]);

	const visibleGraph = useMemo<GamePlanGraph>(() => {
		if (!graph) return { nodes: [], edges: [] };
		let allowed = new Set(graph.nodes.map((node) => node.id));
		const keep = (predicate: (node: GamePlanGraphNode) => boolean) => {
			allowed = new Set(
				graph.nodes
					.filter((node) => allowed.has(node.id) && predicate(node))
					.map((node) => node.id),
			);
		};
		if (side !== "all")
			keep((node) => node.sideId === undefined || String(node.sideId) === side);
		if (goal !== "all") keep((node) => !node.goalId || node.goalId === goal);
		if (subject !== "all") {
			const root = graph.nodes.find(
				(node) => node.type === "subjectNode" && node.entityId === subject,
			);
			const subjectPath = getGraphDescendantNodeIds(graph, root?.id ?? null);
			allowed = new Set([...allowed].filter((id) => subjectPath.has(id)));
		}
		if (scenarioType !== "all")
			keep((node) => !node.scenarioType || node.scenarioType === scenarioType);
		if (executionMode !== "all")
			keep(
				(node) => !node.executionMode || node.executionMode === executionMode,
			);
		if (actionType !== "all")
			keep(
				(node) => node.type !== "actionNode" || node.actionType === actionType,
			);
		return {
			nodes: graph.nodes.filter((node) => allowed.has(node.id)),
			edges: graph.edges.filter(
				(edge) => allowed.has(edge.source) && allowed.has(edge.target),
			),
		};
	}, [actionType, executionMode, goal, graph, scenarioType, side, subject]);

	const selectedPath = useMemo(
		() => getGraphDescendantNodeIds(visibleGraph, selectedId),
		[selectedId, visibleGraph],
	);
	const normalizedQuery = query.trim().toLocaleLowerCase("fa");
	const searchMatches = useMemo(
		() =>
			new Set(
				filterGamePlanGraphNodes(visibleGraph, query).map(({ id }) => id),
			),
		[query, visibleGraph],
	);
	const flow = useMemo(() => {
		const nodes: CurrentFlowNode[] = visibleGraph.nodes.map((node) => ({
			id: node.id,
			type: node.type,
			position: { x: node.x, y: node.y },
			draggable: false,
			data: {
				graphNode: node,
				highlighted: selectedPath.has(node.id),
				dimmed: Boolean(normalizedQuery && !searchMatches.has(node.id)),
			},
		}));
		const edges: Edge[] = visibleGraph.edges.map((edge) => ({
			id: edge.id,
			source: edge.source,
			target: edge.target,
			type: "smoothstep",
			animated: edge.type !== "depends_on",
			style: { stroke: edgeColor(edge), strokeWidth: 1.7 },
			markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor(edge) },
		}));
		return { nodes, edges };
	}, [normalizedQuery, searchMatches, selectedPath, visibleGraph]);

	const selectedNode =
		graph?.nodes.find((node) => node.id === selectedId) ?? null;
	const exportGraph = (): void => {
		const blob = new Blob([JSON.stringify({ graph, warnings }, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `published-game-flow-${activeGameId ?? "current"}.json`;
		anchor.click();
		URL.revokeObjectURL(url);
	};

	return (
		<main
			dir="rtl"
			className="flex min-h-screen flex-col bg-[#060a14] text-slate-100"
		>
			<header className="border-b border-white/10 bg-slate-950/85 px-4 py-4 backdrop-blur-xl lg:px-6">
				<div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
					<div>
						<div className="flex items-center gap-2 text-xs text-cyan-300">
							<GitBranch className="size-4" /> نمای خواندنی و منتشرشده
						</div>
						<h1 className="mt-2 text-2xl font-black">
							نقشه پیکربندی فعلی بازی
						</h1>
						<p className="mt-1 text-sm text-slate-500">
							نمای خواندنی از هدف‌ها، موضوع‌ها، سناریوها، گام‌ها و اثرهای منتشرشده
						</p>
						<div className="mt-2 flex flex-wrap gap-2">
							<Badge variant="outline">
								منبع:{" "}
								{source === "server"
									? "گراف سرور"
									: source === "plan"
										? "برنامه منتشرشده"
										: "بدون داده"}
							</Badge>
							{activeGameId && (
								<Badge className="bg-cyan-500/15 text-cyan-100">
									بازی {activeGameId}
								</Badge>
							)}
							<Badge className="bg-emerald-500/15 text-emerald-100">
								فقط خواندنی
							</Badge>
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button asChild variant="outline">
							<Link href="/admin/game-plan">ویرایش در سازنده بازی</Link>
						</Button>
						<Button asChild variant="outline">
							<Link href="/admin/game-plan/graph">
								<Route className="size-4" /> سازنده گراف
							</Link>
						</Button>
						<Button asChild variant="outline">
							<Link href="/monitoring">
								<Activity className="size-4" /> مانیتورینگ
							</Link>
						</Button>
						<Button asChild variant="outline">
							<Link href="/analytics">
								<BarChart3 className="size-4" /> آنالیتیکس
							</Link>
						</Button>
						<Button asChild variant="outline">
							<Link href="/docs">
								<BookOpen className="size-4" /> راهنما
							</Link>
						</Button>
						<Button onClick={() => void load()}>
							<RefreshCw className="size-4" /> به‌روزرسانی
						</Button>
					</div>
				</div>
				<div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-7">
					<div className="relative md:col-span-2">
						<Search className="absolute right-3 top-3 size-4 text-slate-500" />
						<Input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="جست‌وجوی عنوان فارسی، شناسه یا کد کنش…"
							className="pr-9"
						/>
					</div>
					{[
						[
							side,
							setSide,
							"سمت",
							options.sides.map((value) => [String(value), `سمت ${value}`]),
						],
						[
							goal,
							setGoal,
							"هدف",
							options.goals.map((node) => [node.entityId, node.label]),
						],
						[
							subject,
							setSubject,
							"موضوع",
							options.subjects.map((node) => [node.entityId, node.label]),
						],
						[
							scenarioType,
							setScenarioType,
							"نوع سناریو",
							options.scenarioTypes.map((value) => [value, value]),
						],
						[
							executionMode,
							setExecutionMode,
							"شیوه اجرا",
							options.executionModes.map((value) => [value, value]),
						],
					].map(([value, setter, label, items]) => (
						<Select
							key={label as string}
							value={value as string}
							onValueChange={setter as (value: string) => void}
						>
							<SelectTrigger>
								<SelectValue placeholder={label as string} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">همه {label as string}</SelectItem>
								{(items as string[][]).map(([id, text]) => (
									<SelectItem key={id} value={id}>
										{text}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					))}
					<Select value={actionType} onValueChange={setActionType}>
						<SelectTrigger>
							<SelectValue placeholder="نوع کنش" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">همه کنش‌ها</SelectItem>
							<SelectItem value="attack">تهاجمی</SelectItem>
							<SelectItem value="defense">دفاعی</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</header>

			<section className="grid min-h-[720px] flex-1 xl:grid-cols-[minmax(0,1fr)_360px]">
				<div className="relative min-h-[620px] border-l border-white/10">
					{loading ? (
						<div className="grid h-full place-items-center">
							<LoaderCircle className="size-9 animate-spin text-cyan-300" />
						</div>
					) : flow.nodes.length === 0 ? (
						<div className="grid h-full place-items-center p-8 text-center">
							<div>
								<GitBranch className="mx-auto size-12 text-slate-700" />
								<h2 className="mt-4 text-lg font-black">
									هنوز پیکربندی فعالی منتشر نشده است.
								</h2>
							</div>
						</div>
					) : (
						<ReactFlow
							nodes={flow.nodes}
							edges={flow.edges}
							nodeTypes={nodeTypes}
							fitView
							nodesDraggable={false}
							nodesConnectable={false}
							onNodeClick={(_, node) => setSelectedId(node.id)}
							colorMode="dark"
							proOptions={{ hideAttribution: true }}
						>
							<Background color="#1e293b" gap={28} size={1} />
							<Controls position="bottom-right" showInteractive={false} />
							<MiniMap
								position="bottom-left"
								nodeColor={(node) =>
									getNodeColorByType((node.data as FlowNodeData).graphNode)
								}
								maskColor="rgba(2,6,23,.75)"
							/>
						</ReactFlow>
					)}
				</div>
				<aside className="space-y-4 overflow-y-auto bg-slate-950/55 p-4">
					<div className="flex items-center justify-between">
						<h2 className="font-black">جزئیات گره</h2>
						<Button
							size="sm"
							variant="outline"
							disabled={!graph}
							onClick={exportGraph}
						>
							<Download className="size-4" /> JSON
						</Button>
					</div>
					{selectedNode ? (
						<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
							<Badge
								style={{ backgroundColor: getNodeColorByType(selectedNode) }}
							>
								{NODE_LABEL[selectedNode.type]}
							</Badge>
							<h3 className="mt-3 font-black">{selectedNode.label}</h3>
							<div dir="ltr" className="mt-1 text-left text-xs text-slate-500">
								{selectedNode.entityId}
							</div>
							<div className="mt-3 flex flex-wrap gap-1">
								{[
									selectedNode.goalId,
									selectedNode.subjectId,
									selectedNode.scenarioId,
								]
									.filter(Boolean)
									.map((id) => (
										<Badge key={id} variant="outline">
											{id}
										</Badge>
									))}
							</div>
							<details className="mt-4">
								<summary className="cursor-pointer text-xs text-cyan-300">
									JSON خام
								</summary>
								<pre
									dir="ltr"
									className="mt-2 max-h-80 overflow-auto rounded-xl bg-slate-950 p-3 text-left text-[10px] text-slate-400"
								>
									{JSON.stringify(selectedNode.raw ?? selectedNode, null, 2)}
								</pre>
							</details>
						</div>
					) : (
						<p className="text-sm leading-7 text-slate-500">
							برای بررسی داده و ارتباط‌ها یک گره را انتخاب کنید.
						</p>
					)}
					<div>
						<div className="mb-2 flex items-center justify-between">
							<h2 className="font-black">هشدارهای اعتبارسنجی</h2>
							<Badge
								className={
									warnings.length
										? "bg-rose-500/15 text-rose-200"
										: "bg-emerald-500/15 text-emerald-200"
								}
							>
								{warnings.length}
							</Badge>
						</div>
						<div className="space-y-2">
							{warnings.slice(0, 30).map((warning, index) => (
								<button
									key={`${warning.code}-${warning.entityId}-${index}`}
									type="button"
									onClick={() => {
										const node = graph?.nodes.find(
											(item) => item.entityId === warning.entityId,
										);
										if (node) setSelectedId(node.id);
									}}
									className="w-full rounded-xl border border-rose-400/15 bg-rose-500/5 p-3 text-right text-xs leading-6 text-rose-100"
								>
									<div className="font-bold">{warning.code}</div>
									{warning.message}
								</button>
							))}
							{warnings.length === 0 && (
								<div className="rounded-xl border border-emerald-400/15 bg-emerald-500/5 p-3 text-xs text-emerald-200">
									ارجاع شکسته‌ای پیدا نشد.
								</div>
							)}
						</div>
					</div>
				</aside>
			</section>
		</main>
	);
}
