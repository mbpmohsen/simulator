"use client";

import type { ConfigureAllRequestV2 } from "@workspace/trpc";
import {
	createPlanChild,
	moveScenarioStep,
	planActionsForSide,
	planSideOfScenario,
	scenarioMoveRows,
	setScenarioMoveProgress,
	setScenarioMoveUses,
} from "@workspace/trpc";
import { Button } from "@workspace/ui/components/button";
import {
	ArrowDown,
	ArrowUp,
	ChevronLeft,
	Plus,
	ShieldHalf,
	Swords,
	X,
} from "lucide-react";
import { faNum, NumberInput, SelectField } from "./fields";
import { actionNameFa } from "./labels";

/**
 * A scenario's steps, edited as the game sees them.
 *
 * Checklist scenarios store "this move can be played N times" as N identical
 * steps, because the engine consumes a step when it resolves. Here that is one
 * row per move and one cell per use: 108 steps in the demo become six rows.
 * Ordered and branching scenarios really are sequences, so they stay a list.
 */
export function StepGrid({
	plan,
	scenarioId,
	onChange,
	onSelectStep,
}: {
	plan: ConfigureAllRequestV2;
	scenarioId: string;
	onChange: (plan: ConfigureAllRequestV2) => void;
	onSelectStep: (stepId: string) => void;
}) {
	const scenario = plan.scenarios.find((item) => item.id === scenarioId);
	if (!scenario) return null;
	const side = planSideOfScenario(scenario);

	if (scenario.execution_mode !== "checklist") {
		return (
			<OrderedSteps
				plan={plan}
				scenarioId={scenarioId}
				onChange={onChange}
				onSelectStep={onSelectStep}
			/>
		);
	}

	const turns = Math.max(1, plan.game_config.num_turns || 1);
	const rows = scenarioMoveRows(plan, scenarioId);
	const columns = Math.max(
		turns,
		rows.reduce((max, row) => Math.max(max, row.stepIds.length), 0),
	);
	const available = planActionsForSide(plan, side).filter(
		(action) => !rows.some((row) => row.actionCode === action.code),
	);

	return (
		<div className="space-y-3">
			<p className="text-[11px] leading-6 text-slate-500">
				هر خانه یعنی یک بار اجرای این کنش در این سناریو. این بازی {faNum(turns)}{" "}
				نوبت دارد.
			</p>

			{rows.length === 0 ? (
				<div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-500">
					این سناریو هنوز کنشی ندارد. از فهرست پایین یک کنش اضافه کنید.
				</div>
			) : (
				<div className="overflow-x-auto rounded-xl border border-white/8">
					<table className="w-full min-w-[560px] border-collapse text-sm">
						<thead>
							<tr className="bg-white/[0.03] text-[11px] text-slate-500">
								<th className="px-3 py-2 text-right font-bold">کنش</th>
								<th className="px-2 py-2 text-center font-bold">
									تعداد بار قابل بازی
								</th>
								<th className="w-28 px-2 py-2 text-center font-bold">
									پیشرفت در موفقیت
								</th>
								<th className="w-10" />
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => {
								const action = plan.actions.find(
									(item) => item.code === row.actionCode,
								);
								const uses = row.stepIds.length;
								const kind = action?.type ?? side;
								return (
									<tr key={row.actionCode} className="border-t border-white/5">
										<td className="px-3 py-2.5">
											<div className="flex items-center gap-2">
												{kind === "defense" ? (
													<ShieldHalf className="size-4 shrink-0 text-sky-300" />
												) : (
													<Swords className="size-4 shrink-0 text-rose-300" />
												)}
												<div className="min-w-0">
													<div className="truncate font-bold text-slate-100">
														{actionNameFa(plan, row.actionCode)}
													</div>
													{action ? (
														<div className="text-[10px] tabular-nums text-slate-500">
															هزینه {faNum(action.base_stats.cost)} · شانس{" "}
															{faNum(action.base_stats.success_probability)}٪ ·{" "}
															{faNum(action.base_stats.points_on_success ?? 0)}{" "}
															امتیاز
														</div>
													) : (
														<div className="text-[10px] text-orange-200">
															این کنش در فهرست کنش‌ها وجود ندارد
														</div>
													)}
												</div>
											</div>
										</td>
										<td className="px-2 py-2.5">
											<fieldset
												className="m-0 flex items-center justify-center gap-1 border-0 p-0"
												aria-label={`تعداد بار ${actionNameFa(plan, row.actionCode)}`}
											>
												{Array.from({ length: columns }, (_, index) => {
													const filled = index < uses;
													const beyond = index >= turns;
													return (
														<button
															// biome-ignore lint/suspicious/noArrayIndexKey: cells are positional
															key={index}
															type="button"
															title={`${faNum(index + 1)} بار`}
															onClick={() =>
																onChange(
																	setScenarioMoveUses(
																		plan,
																		scenarioId,
																		row.actionCode,
																		index + 1 === uses ? index : index + 1,
																	),
																)
															}
															className={`grid size-7 place-items-center rounded-md border text-[10px] tabular-nums transition ${
																filled
																	? kind === "defense"
																		? "border-sky-400/50 bg-sky-400/25 text-sky-50"
																		: "border-rose-400/50 bg-rose-400/25 text-rose-50"
																	: "border-white/10 bg-white/[0.02] text-slate-600 hover:border-white/25"
															} ${beyond ? "border-dashed" : ""}`}
														>
															{faNum(index + 1)}
														</button>
													);
												})}
											</fieldset>
											{uses < turns && uses > 0 && (
												<div className="mt-1 text-center text-[10px] text-amber-200/80">
													کمتر از تعداد نوبت‌ها — در نوبت‌های پایانی دیگر در دسترس
													نیست
												</div>
											)}
										</td>
										<td className="px-2 py-2.5">
											<NumberInput
												value={row.progress}
												allowEmpty
												min={0}
												max={100}
												suffix="٪"
												placeholder="—"
												ariaLabel="پیشرفت زیرموضوع در موفقیت"
												onCommit={(value) =>
													onChange(
														setScenarioMoveProgress(
															plan,
															scenarioId,
															row.actionCode,
															value,
														),
													)
												}
											/>
										</td>
										<td className="px-1 py-2.5">
											<Button
												type="button"
												variant="ghost"
												size="icon"
												title="برداشتن این کنش از سناریو"
												onClick={() =>
													onChange(
														setScenarioMoveUses(
															plan,
															scenarioId,
															row.actionCode,
															0,
														),
													)
												}
												className="size-7 text-slate-500 hover:text-rose-300"
											>
												<X className="size-4" />
											</Button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			{available.length > 0 && (
				<div className="max-w-sm">
					<SelectField
						label="افزودن کنش به این سناریو"
						value={null}
						placeholder="یک کنش انتخاب کنید"
						options={available.map((action) => ({
							value: action.code,
							label: actionNameFa(plan, action.code),
						}))}
						hint={`به تعداد نوبت‌های بازی (${faNum(turns)} بار) اضافه می‌شود؛ بعداً قابل تغییر است.`}
						onChange={(code) => {
							if (code)
								onChange(setScenarioMoveUses(plan, scenarioId, code, turns));
						}}
					/>
				</div>
			)}
		</div>
	);
}

function OrderedSteps({
	plan,
	scenarioId,
	onChange,
	onSelectStep,
}: {
	plan: ConfigureAllRequestV2;
	scenarioId: string;
	onChange: (plan: ConfigureAllRequestV2) => void;
	onSelectStep: (stepId: string) => void;
}) {
	const steps = plan.scenario_steps
		.filter((item) => item.scenario_id === scenarioId)
		.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

	return (
		<div className="space-y-2">
			<p className="text-[11px] leading-6 text-slate-500">
				در سناریوی ترتیبی یا شاخه‌ای هر گام جایگاه خودش را دارد. ترتیب را با
				پیکان‌ها عوض کنید و برای ویرایش جزئیات روی گام بزنید.
			</p>
			{steps.length === 0 && (
				<div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-500">
					این سناریو هنوز گامی ندارد.
				</div>
			)}
			{steps.map((step, index) => (
				<div
					key={step.id}
					className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-2"
				>
					<span className="grid size-7 shrink-0 place-items-center rounded-md bg-white/5 text-xs tabular-nums text-slate-300">
						{faNum(step.order ?? index + 1)}
					</span>
					<button
						type="button"
						onClick={() => onSelectStep(step.id)}
						className="flex min-w-0 flex-1 items-center gap-2 text-right"
					>
						<span className="truncate text-sm font-bold text-slate-100">
							{actionNameFa(plan, step.action_code)}
						</span>
						{step.required && (
							<span className="shrink-0 rounded border border-white/10 px-1 text-[10px] text-slate-400">
								الزامی
							</span>
						)}
						{(step.depends_on?.length ?? 0) > 0 && (
							<span className="shrink-0 text-[10px] text-slate-500">
								{faNum(step.depends_on?.length ?? 0)} پیش‌نیاز
							</span>
						)}
						<ChevronLeft className="mr-auto size-4 shrink-0 text-slate-600" />
					</button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						disabled={index === 0}
						title="جابه‌جایی به بالا"
						onClick={() => onChange(moveScenarioStep(plan, step.id, -1))}
						className="size-7"
					>
						<ArrowUp className="size-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						disabled={index === steps.length - 1}
						title="جابه‌جایی به پایین"
						onClick={() => onChange(moveScenarioStep(plan, step.id, 1))}
						className="size-7"
					>
						<ArrowDown className="size-4" />
					</Button>
				</div>
			))}
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => {
					const created = createPlanChild(plan, "scenario", scenarioId);
					onChange(created.plan);
					onSelectStep(created.id);
				}}
				className="border-white/10 bg-white/[0.03]"
			>
				<Plus className="size-4" /> افزودن گام
			</Button>
		</div>
	);
}
