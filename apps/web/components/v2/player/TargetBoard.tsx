"use client";

import type { ScenarioView, SubjectView } from "@workspace/trpc";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import {
	CheckCircle2,
	ChevronLeft,
	Crosshair,
	LoaderCircle,
	PauseCircle,
	Target,
} from "lucide-react";
import type { ReactNode } from "react";
import { getLocalized } from "@/lib/runtimeTranslationsFa";

/**
 * The targets a team can work on this turn, as one board.
 *
 * It replaces three stacked lists - assigned subjects, then sub-subjects, then
 * scenarios - that made "where" feel like paperwork before the real decision.
 * Nothing here is themed: a tile is whatever the plan's sub-subject is called,
 * so the same board serves a city's hospital and a bank's payment gateway.
 *
 * A sub-subject usually has exactly one scenario, and the scenario is then an
 * engine detail the player never needs to see: picking the target starts it.
 * When a target really does offer several paths, they appear as a choice.
 */

export interface TargetOutcome {
	turn: number | null;
	success: boolean;
}

export interface TargetBoardProps {
	subjects: SubjectView[];
	selectedSubjectId: string | null;
	selectedSubSubjectId: string | null;
	/** The target the engine currently has this team working on. */
	activeSubSubjectId: string | null;
	onPick: (subjectId: string, subSubjectId: string) => void;
	scenarios: ScenarioView[];
	scenariosLoading: boolean;
	scenariosError: string | null;
	activeScenarioId: string | null;
	/** Targets can only be started in the selection phase. */
	canActivate: boolean;
	busyScenarioId: string | null;
	onActivate: (scenarioId: string) => void;
	/** sub_subject id -> this team's past results there, oldest first. */
	outcomesBySite: Map<string, TargetOutcome[]>;
	/** Slot for the AI insight button, which belongs to the whole board. */
	aiSlot?: ReactNode;
	/**
	 * Folded form for the phases where the target is settled and the move cards
	 * are the decision: one line that says where the team is working.
	 */
	compact?: boolean;
}

const faNumber = (value: number): string => value.toLocaleString("fa-IR");

export function TargetBoard({
	subjects,
	selectedSubjectId,
	selectedSubSubjectId,
	activeSubSubjectId,
	onPick,
	scenarios,
	scenariosLoading,
	scenariosError,
	activeScenarioId,
	canActivate,
	busyScenarioId,
	onActivate,
	outcomesBySite,
	aiSlot,
	compact = false,
}: TargetBoardProps) {
	const manySubjects = subjects.length > 1;
	const pickedSite =
		subjects
			.flatMap((subject) => subject.sub_subjects)
			.find((site) => site.id === selectedSubSubjectId) ?? null;
	// With one path there is nothing to choose: starting the target starts it.
	const soleScenario = scenarios.length === 1 ? scenarios[0] : null;

	if (compact) {
		const working =
			subjects
				.flatMap((subject) => subject.sub_subjects)
				.find((site) => site.id === activeSubSubjectId) ?? pickedSite;
		return (
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-2.5 text-sm">
				<span className="flex items-center gap-2 text-slate-400">
					<Crosshair className="size-4 text-cyan-300" /> هدف این نوبت
				</span>
				<span className="font-black text-slate-100">
					{working
						? getLocalized(working.title, working.title_fa)
						: "انتخاب نشده"}
				</span>
				{working && (
					<span className="tabular-nums text-[11px] text-slate-500">
						سهم {faNumber(working.progress_share)}٪
					</span>
				)}
				<span className="mr-auto text-[11px] text-slate-500">
					تغییر هدف فقط در فاز «انتخاب مسیر»
				</span>
			</div>
		);
	}

	return (
		<Card className="border-white/10 bg-slate-950/55 text-slate-100">
			<CardHeader className="pb-3">
				<CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
					<span className="flex items-center gap-2">
						<Target className="size-5 text-cyan-300" /> هدف‌های تیم شما
					</span>
					{aiSlot}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-xs leading-6 text-slate-400">
					اول هدف این نوبت را انتخاب کنید، بعد روی حرکت‌ها رأی بدهید. «سهم» یعنی
					پیشرفت روی این هدف چقدر در پیشرفت کل مأموریت اثر می‌گذارد.
				</p>

				{subjects.length === 0 && (
					<div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
						هنوز هدفی به تیم شما واگذار نشده است.
					</div>
				)}

				{subjects.map((subject) => (
					<section key={subject.id} className="space-y-2.5">
						{manySubjects && (
							<div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-1.5">
								<span className="text-sm font-black text-slate-200">
									{getLocalized(subject.title, subject.title_fa)}
								</span>
								<span className="text-[11px] tabular-nums text-slate-500">
									پیشرفت {faNumber(subject.progress_percent)}٪
								</span>
							</div>
						)}

						<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
							{subject.sub_subjects.map((site) => {
								const picked = selectedSubSubjectId === site.id;
								const working = activeSubSubjectId === site.id;
								const history = outcomesBySite.get(site.id) ?? [];
								return (
									<button
										key={site.id}
										type="button"
										onClick={() => onPick(subject.id, site.id)}
										className={`rounded-2xl border p-3.5 text-right transition ${
											picked
												? "border-cyan-400/50 bg-cyan-500/10"
												: "border-white/8 bg-white/[0.03] hover:border-white/20"
										}`}
									>
										<div className="flex items-start justify-between gap-2">
											<span className="min-w-0 break-words font-black text-slate-100">
												{getLocalized(site.title, site.title_fa)}
											</span>
											{site.completed ? (
												<CheckCircle2 className="size-4 shrink-0 text-emerald-300" />
											) : site.stalled ? (
												<PauseCircle className="size-4 shrink-0 text-orange-300" />
											) : working ? (
												<Crosshair className="size-4 shrink-0 text-cyan-300" />
											) : null}
										</div>

										<div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
											<span className="rounded-lg border border-white/8 bg-black/25 px-2 py-0.5 tabular-nums text-slate-300">
												سهم {faNumber(site.progress_share)}٪
											</span>
											{working && (
												<span className="rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-cyan-100">
													هدف فعال تیم
												</span>
											)}
											{site.completed && (
												<span className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-emerald-100">
													تکمیل‌شده
												</span>
											)}
											{site.stalled && (
												<span className="rounded-lg border border-orange-400/25 bg-orange-400/10 px-2 py-0.5 text-orange-100">
													متوقف
												</span>
											)}
										</div>

										{history.length > 0 ? (
											<span className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-400">
												<span className="flex items-center gap-1">
													{history.slice(-6).map((outcome, index) => (
														<span
															// biome-ignore lint/suspicious/noArrayIndexKey: outcomes are positional
															key={index}
															title={
																outcome.turn === null
																	? undefined
																	: `نوبت ${faNumber(outcome.turn)}`
															}
															className={`size-2 rounded-full ${outcome.success ? "bg-emerald-400" : "bg-rose-400"}`}
														/>
													))}
												</span>
												تلاش‌های شما اینجا
											</span>
										) : (
											<span className="mt-2.5 block text-[11px] text-slate-600">
												هنوز اینجا کاری نکرده‌اید
											</span>
										)}
									</button>
								);
							})}
						</div>
					</section>
				))}

				{pickedSite && (
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/25 bg-cyan-500/[0.07] p-3">
						<span className="text-sm">
							<span className="text-slate-400">هدف انتخاب‌شده: </span>
							<span className="font-black text-slate-100">
								{getLocalized(pickedSite.title, pickedSite.title_fa)}
							</span>
						</span>
						{soleScenario ? (
							<Button
								onClick={() => onActivate(soleScenario.id)}
								disabled={
									!canActivate ||
									busyScenarioId !== null ||
									activeScenarioId === soleScenario.id
								}
								className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
							>
								{busyScenarioId === `scenario-${soleScenario.id}` ? (
									<LoaderCircle className="size-4 animate-spin" />
								) : (
									<ChevronLeft className="size-4" />
								)}
								{activeScenarioId === soleScenario.id
									? "هدف این نوبت شماست"
									: "کار روی این هدف را شروع کن"}
							</Button>
						) : scenariosLoading ? (
							<span className="flex items-center gap-2 text-[11px] text-slate-400">
								<LoaderCircle className="size-3.5 animate-spin" /> در حال خواندن
								مسیرها
							</span>
						) : null}
					</div>
				)}

				{scenariosError && (
					<p className="text-sm text-rose-300">{scenariosError}</p>
				)}

				{/* Several paths on one target is rare, and only then is it a choice. */}
				{selectedSubjectId && scenarios.length > 1 && (
					<div className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.06] p-3">
						<div className="mb-2 text-xs font-bold text-violet-100">
							این هدف چند مسیر دارد؛ یکی را انتخاب کنید
						</div>
						<div className="flex flex-wrap gap-2">
							{scenarios.map((scenario) => (
								<Button
									key={scenario.id}
									variant="outline"
									disabled={!canActivate || busyScenarioId !== null}
									onClick={() => onActivate(scenario.id)}
									className={`border-white/10 bg-white/[0.03] ${activeScenarioId === scenario.id ? "border-violet-400/50 text-violet-100" : "text-slate-300"}`}
								>
									{busyScenarioId === `scenario-${scenario.id}` && (
										<LoaderCircle className="size-4 animate-spin" />
									)}
									{getLocalized(scenario.title, scenario.title_fa)}
								</Button>
							))}
						</div>
					</div>
				)}

				{!canActivate && (
					<p className="text-[11px] leading-6 text-amber-200/80">
						هدف را فقط در فاز «انتخاب مسیر» می‌توان عوض کرد. در فاز رأی‌گیری روی
						هدف فعلی رأی می‌دهید.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
