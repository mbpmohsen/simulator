"use client";

import type {
	GovernmentCatalogResponse,
	GovernmentCatalogScenario,
} from "@workspace/trpc";
import {
	getGovernmentCatalogActionLabel,
	getGovernmentCatalogGoalLabel,
	getGovernmentCatalogSubjectLabel,
	matchesGovernmentCatalogSearch,
} from "@workspace/trpc";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import {
	ChevronLeft,
	Network,
	Search,
	ShieldBan,
	Workflow,
} from "lucide-react";
import { useMemo, useState } from "react";

interface GovernmentCatalogPanelProps {
	catalog: GovernmentCatalogResponse;
	onSelectSubject: (subjectId: string) => void;
	onSelectAction: (actionCode: string) => void;
	onSelectNode: (nodeId: string) => void;
}

const scenarioTypeFa = (scenario: GovernmentCatalogScenario): string =>
	scenario.scenario_type === "attack_path" ? "مسیر تهاجمی" : "مسیر دفاعی";

export function GovernmentCatalogPanel({
	catalog,
	onSelectSubject,
	onSelectAction,
	onSelectNode,
}: GovernmentCatalogPanelProps) {
	const [query, setQuery] = useState("");
	const [goalId, setGoalId] = useState("all");
	const [scenarioType, setScenarioType] = useState("all");
	const [expanded, setExpanded] = useState<string[]>([]);

	const subjects = useMemo(
		() =>
			catalog.subjects.filter((subject) => {
				if (goalId !== "all" && subject.goal_id !== goalId) return false;
				const scenarios = subject.sub_subjects.flatMap(
					(subSubject) => subSubject.scenarios,
				);
				if (
					scenarioType !== "all" &&
					!scenarios.some((scenario) => scenario.scenario_type === scenarioType)
				)
					return false;
				return matchesGovernmentCatalogSearch(
					query,
					subject.id,
					subject.title,
					subject.title_fa,
					...scenarios.flatMap((scenario) => [
						scenario.id,
						scenario.title,
						scenario.title_fa,
						...scenario.steps.flatMap((step) => [step.id, step.action_code]),
					]),
				);
			}),
		[catalog.subjects, goalId, query, scenarioType],
	);
	const actions = useMemo(
		() =>
			catalog.bannable_actions.filter((action) =>
				matchesGovernmentCatalogSearch(
					query,
					action.code,
					action.name,
					action.name_fa,
				),
			),
		[catalog.bannable_actions, query],
	);

	return (
		<Card className="border-cyan-400/15 bg-slate-950/60 text-slate-100">
			<CardHeader className="gap-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<Network className="size-5 text-cyan-300" /> کاتالوگ سمت شما
					</CardTitle>
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setExpanded(subjects.map((subject) => subject.id))}
							className="border-white/10 bg-white/5"
						>
							بازکردن همه
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setExpanded([])}
							className="border-white/10 bg-white/5"
						>
							بستن همه
						</Button>
					</div>
				</div>
				<div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_220px_190px]">
					<div className="relative">
						<Search className="absolute top-2.5 right-3 size-4 text-slate-500" />
						<Input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="جست‌وجوی عنوان، شناسه، گام یا کنش"
							className="border-white/10 bg-white/5 pr-9"
						/>
					</div>
					<Select value={goalId} onValueChange={setGoalId}>
						<SelectTrigger className="w-full border-white/10 bg-white/5">
							<SelectValue placeholder="فیلتر هدف" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">همه هدف‌ها</SelectItem>
							{catalog.goals.map((goal) => (
								<SelectItem key={goal.id} value={goal.id}>
									{getGovernmentCatalogGoalLabel(goal)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={scenarioType} onValueChange={setScenarioType}>
						<SelectTrigger className="w-full border-white/10 bg-white/5">
							<SelectValue placeholder="نوع سناریو" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">همه سناریوها</SelectItem>
							<SelectItem value="attack_path">مسیر تهاجمی</SelectItem>
							<SelectItem value="defense_path">مسیر دفاعی</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</CardHeader>
			<CardContent className="space-y-5">
				{subjects.length === 0 ? (
					<div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
						موضوعی با این فیلتر پیدا نشد.
					</div>
				) : (
					<Accordion
						type="multiple"
						value={expanded}
						onValueChange={setExpanded}
						className="space-y-2"
					>
						{subjects.map((subject) => {
							const goal = catalog.goals.find(
								(candidate) => candidate.id === subject.goal_id,
							);
							return (
								<AccordionItem
									key={subject.id}
									value={subject.id}
									className="rounded-xl border border-white/8 bg-white/[0.025] px-4"
								>
									<AccordionTrigger className="text-right hover:no-underline">
										<div>
											<div className="font-black">
												{getGovernmentCatalogSubjectLabel(subject)}
											</div>
											<div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-500">
												<span dir="ltr">{subject.id}</span>
												{goal && (
													<span>{getGovernmentCatalogGoalLabel(goal)}</span>
												)}
											</div>
										</div>
									</AccordionTrigger>
									<AccordionContent className="space-y-3">
										<Button
											type="button"
											size="sm"
											onClick={() => onSelectSubject(subject.id)}
											className="bg-amber-400 text-slate-950 hover:bg-amber-300"
										>
											انتخاب برای دستور تخصیص/اجبار
										</Button>
										{subject.sub_subjects.map((subSubject) => (
											<div
												key={subSubject.id}
												className="rounded-xl border border-white/8 bg-slate-950/50 p-3"
											>
												<div className="text-sm font-bold">
													زیرموضوع · {subSubject.title_fa || subSubject.title}
												</div>
												<div className="mt-3 space-y-2">
													{subSubject.scenarios
														.filter(
															(scenario) =>
																scenarioType === "all" ||
																scenario.scenario_type === scenarioType,
														)
														.map((scenario) => (
															<div
																key={scenario.id}
																className="rounded-lg bg-white/[0.03] p-3"
															>
																<div className="flex flex-wrap items-center gap-2">
																	<Workflow className="size-4 text-cyan-300" />
																	<span className="font-bold">
																		{scenario.title_fa || scenario.title}
																	</span>
																	<Badge className="bg-cyan-500/10 text-cyan-200">
																		{scenarioTypeFa(scenario)}
																	</Badge>
																</div>
																<div className="mt-2 space-y-1">
																	{scenario.steps.map((step) => (
																		<button
																			key={step.id}
																			type="button"
																			onClick={() => onSelectNode(step.id)}
																			className="flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-right text-xs text-slate-400 transition hover:border-orange-400/20 hover:bg-orange-500/5 hover:text-orange-100"
																		>
																			<ChevronLeft className="size-3" /> گام{" "}
																			{step.order ?? "—"} ·{" "}
																			<span dir="ltr">{step.action_code}</span>
																		</button>
																	))}
																</div>
															</div>
														))}
												</div>
											</div>
										))}
									</AccordionContent>
								</AccordionItem>
							);
						})}
					</Accordion>
				)}

				<div className="border-t border-white/8 pt-4">
					<div className="mb-3 flex items-center gap-2 font-black">
						<ShieldBan className="size-5 text-rose-300" /> کنش‌های قابل ممنوعیت
					</div>
					<div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
						{actions.map((action) => (
							<button
								key={action.code}
								type="button"
								onClick={() => onSelectAction(action.code)}
								className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-right transition hover:border-rose-400/25 hover:bg-rose-500/5"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="text-sm font-bold">
										{getGovernmentCatalogActionLabel(action)}
									</span>
									<Badge
										className={
											action.type === "attack"
												? "bg-rose-500/10 text-rose-200"
												: "bg-cyan-500/10 text-cyan-200"
										}
									>
										{action.type === "attack" ? "تهاجمی" : "دفاعی"}
									</Badge>
								</div>
								<div dir="ltr" className="mt-2 text-[10px] text-slate-500">
									{action.code}
								</div>
							</button>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
