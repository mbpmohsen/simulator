"use client";

import type { ConfigureAllRequestV2 } from "@workspace/trpc";
import {
	createPlanSide,
	createPlanTeam,
	GOVERNMENT_PERMISSION_LABEL_FA,
	isGovernmentTeam,
	planRoster,
	previewRosterRemoval,
	removeRosterNode,
	renamePlanSide,
	renamePlanTeam,
	roleTypeOf,
	setActionTeams,
	setGovernmentInterventionConfig,
	setGovernmentPermission,
	setTeamCredits,
	setTeamRole,
	TEAM_ROLE_LABEL_FA,
	TEAM_ROLES,
} from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import {
	Coins,
	Gavel,
	Plus,
	Shield,
	Swords,
	TriangleAlert,
	Users,
} from "lucide-react";
import { ConfirmRemove } from "./ConfirmRemove";
import {
	faNum,
	NumberField,
	SelectField,
	TextField,
	ToggleField,
} from "./fields";

/**
 * Sides, the teams on them, and the government that runs each side.
 *
 * This layer used to be whatever the loaded JSON said: the builder could assign
 * players to teams but could not create a team, add a side, or choose which
 * team is the government — so the platform's claim that any scenario can be
 * configured stopped at the org chart.
 *
 * The shape the engine wants is a side holding exactly one government team and
 * one or more player teams. A government runs every player team that shares its
 * side, and that link is never written down anywhere: it is inferred from the
 * side id. Moving a team between sides therefore changes who governs it, which
 * is why the side is the outer box here rather than a field on a flat list.
 *
 * **Credits do not pool.** Each team carries its own starting credits, so a
 * second team on a side brings that side's spending power again rather than
 * splitting it. The side header shows the running total for exactly that
 * reason.
 */

export function Roster({
	plan,
	onChange,
	issues,
}: {
	plan: ConfigureAllRequestV2;
	onChange: (plan: ConfigureAllRequestV2) => void;
	/** Live validation issues, so a problem is shown on the thing it is about. */
	issues: Array<{ loc: string; message: string }>;
}) {
	const roster = planRoster(plan);
	const issueFor = (loc: string): string | null =>
		issues.find((issue) => issue.loc === loc)?.message ?? null;

	const totalPlayerTeams = roster.reduce(
		(sum, side) => sum + side.teams.length,
		0,
	);

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<p className="max-w-2xl text-sm leading-7 text-slate-400">
					هر سمت یک دولت دارد و آن دولت همهٔ تیم‌های همان سمت را اداره می‌کند.
					اعتبار بین تیم‌های یک سمت تقسیم نمی‌شود — هر تیم اعتبار خودش را دارد، پس
					افزودن تیم توان خرید آن سمت را بالا می‌برد.
				</p>
				<Button
					onClick={() => onChange(createPlanSide(plan).plan)}
					variant="outline"
					className="border-cyan-400/30 bg-cyan-500/5 text-cyan-100"
				>
					<Plus className="size-4" /> سمت جدید
				</Button>
			</div>

			<div className="grid gap-3 sm:grid-cols-3">
				{[
					{ label: "سمت‌ها", value: roster.length, icon: Shield },
					{ label: "تیم‌های بازیکن", value: totalPlayerTeams, icon: Users },
					{
						label: "دولت‌ها",
						value: roster.filter((side) => side.government).length,
						icon: Gavel,
					},
				].map((item) => (
					<div
						key={item.label}
						className="rounded-2xl border border-white/10 bg-slate-950/55 p-4"
					>
						<div className="flex items-center gap-2 text-xs text-slate-500">
							<item.icon className="size-4 text-cyan-300" /> {item.label}
						</div>
						<div className="mt-1.5 text-2xl font-black tabular-nums">
							{faNum(item.value)}
						</div>
					</div>
				))}
			</div>

			{roster.map((side) => {
				const sideIssue = issueFor(`side.${side.sideId}`);
				const removal = previewRosterRemoval(plan, {
					kind: "side",
					id: side.sideId,
				});
				return (
					<Card
						key={side.sideId}
						className={`border-white/10 bg-slate-950/55 text-slate-100 ${
							sideIssue ? "border-orange-400/35" : ""
						}`}
					>
						<CardHeader className="gap-3">
							<CardTitle className="flex flex-wrap items-center justify-between gap-3">
								<span className="flex items-center gap-2">
									<Shield className="text-cyan-300" /> {side.name}
								</span>
								<div className="flex flex-wrap items-center gap-2">
									<Badge className="bg-amber-400/10 text-amber-200">
										<Coins className="size-3" /> اعتبار تیم‌ها{" "}
										{faNum(side.playerCredits)}
									</Badge>
									<Badge className="bg-white/5 text-slate-300">
										{faNum(side.teams.length)} تیم
									</Badge>
									{roster.length > 2 && (
										<ConfirmRemove
											title={`حذف «${side.name}»`}
											consequences={[
												`${faNum(removal.teams.length)} تیم این سمت`,
												...(removal.goals.length > 0
													? [
															`${faNum(removal.goals.length)} هدف و هر چه زیر آن است`,
														]
													: []),
												...(removal.orphanedSubjects.length > 0
													? [
															`${faNum(removal.orphanedSubjects.length)} موضوع که هدفشان تیم‌های این سمت بود`,
														]
													: []),
												...(removal.orphanedActions.length > 0
													? [
															`${faNum(removal.orphanedActions.length)} کنش که هیچ تیم دیگری اجازهٔ بازی‌اش را ندارد`,
														]
													: []),
											]}
											onConfirm={() =>
												onChange(
													removeRosterNode(plan, {
														kind: "side",
														id: side.sideId,
													}),
												)
											}
										/>
									)}
								</div>
							</CardTitle>
							{sideIssue && (
								<p className="flex items-start gap-1.5 text-xs leading-6 text-orange-200">
									<TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
									{sideIssue}
								</p>
							)}
						</CardHeader>

						<CardContent className="space-y-4">
							<TextField
								label="نام سمت"
								value={side.name}
								onCommit={(value) =>
									onChange(renamePlanSide(plan, side.sideId, value))
								}
							/>

							{/* The government box sits above its teams, because that is the
							    relationship: everything below is what it governs. */}
							<div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.05] p-4">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="flex items-center gap-2 text-sm font-black text-amber-100">
										<Gavel className="size-4" /> دولت این سمت
									</div>
									{side.government ? (
										<Badge className="bg-amber-400/10 text-amber-200">
											{side.government.name}
										</Badge>
									) : (
										<Badge className="bg-orange-500/15 text-orange-200">
											تعیین نشده
										</Badge>
									)}
								</div>

								{side.government ? (
									<div className="mt-3 grid gap-4 lg:grid-cols-2">
										<div className="space-y-3">
											<TextField
												label="نام تیم دولت"
												value={side.government.name}
												onCommit={(value) =>
													onChange(
														renamePlanTeam(
															plan,
															side.government?.id as number,
															value,
														),
													)
												}
											/>
											<NumberField
												label="اعتبار اولیهٔ دولت"
												value={side.government.starting_credits ?? 0}
												min={0}
												onCommit={(value) =>
													onChange(
														setTeamCredits(
															plan,
															side.government?.id as number,
															value ?? 0,
														),
													)
												}
												hint="اعتباری که دولت برای مداخله‌هایش خرج می‌کند."
											/>
										</div>

										<div className="space-y-2">
											<div className="text-xs font-bold text-slate-400">
												اختیارات دولت
											</div>
											{Object.entries(GOVERNMENT_PERMISSION_LABEL_FA).map(
												([key, label]) => (
													<ToggleField
														key={key}
														label={label}
														checked={
															side.governmentConfig?.permissions?.[key] === true
														}
														onChange={(value) =>
															onChange(
																setGovernmentPermission(
																	plan,
																	side.sideId,
																	key,
																	value,
																),
															)
														}
													/>
												),
											)}
											<div className="grid gap-3 pt-1 sm:grid-cols-2">
												<NumberField
													label="مداخله در کل بازی"
													value={Number(
														side.governmentConfig?.intervention_config
															?.interventions_per_game ?? 0,
													)}
													min={0}
													onCommit={(value) =>
														onChange(
															setGovernmentInterventionConfig(
																plan,
																side.sideId,
																"interventions_per_game",
																value ?? 0,
															),
														)
													}
												/>
												<NumberField
													label="فاصلهٔ مداخله (نوبت)"
													value={Number(
														side.governmentConfig?.intervention_config
															?.intervention_cooldown_turns ?? 0,
													)}
													min={0}
													onCommit={(value) =>
														onChange(
															setGovernmentInterventionConfig(
																plan,
																side.sideId,
																"intervention_cooldown_turns",
																value ?? 0,
															),
														)
													}
												/>
											</div>
										</div>
									</div>
								) : (
									<p className="mt-2 text-xs leading-6 text-orange-200/85">
										هیچ تیمی روی این سمت نقش دولت ندارد. یکی از تیم‌های زیر را به
										نقش «دولت» تغییر بدهید.
									</p>
								)}
							</div>

							<div className="space-y-3">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="flex items-center gap-2 text-sm font-black text-slate-200">
										<Users className="size-4 text-cyan-300" /> تیم‌هایی که این
										دولت اداره می‌کند
									</div>
									<Button
										size="sm"
										variant="outline"
										onClick={() =>
											onChange(createPlanTeam(plan, side.sideId).plan)
										}
										className="border-white/10 bg-white/5"
									>
										<Plus className="size-4" /> تیم جدید
									</Button>
								</div>

								{side.teams.length === 0 && (
									<p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-xs text-slate-500">
										این سمت هیچ تیم بازیکنی ندارد.
									</p>
								)}

								{side.teams.map((team) => {
									const teamId = team.id as number;
									const teamIssue = issueFor(`teams.${teamId}`);
									const teamRemoval = previewRosterRemoval(plan, {
										kind: "team",
										id: teamId,
									});
									const playable = plan.actions.filter((action) => {
										const allowed = action.requirements?.allowed_team_ids ?? [];
										return allowed.length === 0 || allowed.includes(teamId);
									});
									return (
										<div
											key={teamId}
											className={`rounded-2xl border p-4 ${
												teamIssue
													? "border-orange-400/30 bg-orange-500/[0.05]"
													: "border-white/10 bg-white/[0.02]"
											}`}
										>
											<div className="flex flex-wrap items-center justify-between gap-2">
												<div className="flex items-center gap-2">
													<Swords className="size-4 text-slate-500" />
													<span className="font-bold">{team.name}</span>
													<Badge className="bg-white/5 text-slate-400">
														{TEAM_ROLE_LABEL_FA[roleTypeOf(team)] ??
															roleTypeOf(team)}
													</Badge>
													<Badge className="bg-white/5 text-slate-500">
														{faNum(team.players.length)} عضو
													</Badge>
												</div>
												{side.teams.length > 1 && (
													<ConfirmRemove
														title={`حذف «${team.name}»`}
														consequences={[
															...(teamRemoval.orphanedSubjects.length > 0
																? [
																		`${faNum(teamRemoval.orphanedSubjects.length)} موضوع که هدفشان این تیم است`,
																	]
																: []),
															...(teamRemoval.orphanedActions.length > 0
																? [
																		`${faNum(teamRemoval.orphanedActions.length)} کنش که تیم دیگری اجازهٔ بازی‌اش را ندارد`,
																	]
																: []),
															`${faNum(team.players.length)} تخصیص عضو`,
														]}
														onConfirm={() =>
															onChange(
																removeRosterNode(plan, {
																	kind: "team",
																	id: teamId,
																}),
															)
														}
													/>
												)}
											</div>

											<div className="mt-3 grid gap-3 lg:grid-cols-3">
												<TextField
													label="نام تیم"
													value={team.name}
													onCommit={(value) =>
														onChange(renamePlanTeam(plan, teamId, value))
													}
												/>
												<SelectField
													label="نقش"
													value={roleTypeOf(team)}
													options={TEAM_ROLES.map((role) => ({
														value: role,
														label: TEAM_ROLE_LABEL_FA[role] ?? role,
													}))}
													onChange={(value) =>
														value && onChange(setTeamRole(plan, teamId, value))
													}
													hint={
														isGovernmentTeam(team)
															? undefined
															: "«دولت» را انتخاب کنید تا این تیم فرماندهی سمت را بگیرد؛ دولت فعلی تیم بازیکن می‌شود."
													}
												/>
												<NumberField
													label="اعتبار اولیه"
													value={team.starting_credits ?? 0}
													min={0}
													onCommit={(value) =>
														onChange(setTeamCredits(plan, teamId, value ?? 0))
													}
													hint="مخصوص همین تیم است و با تیم‌های دیگر این سمت تقسیم نمی‌شود."
												/>
											</div>

											<div className="mt-3">
												<div className="mb-1.5 text-xs font-bold text-slate-400">
													کنش‌هایی که این تیم می‌تواند بازی کند
												</div>
												<div className="flex flex-wrap gap-1.5">
													{plan.actions.map((action) => {
														const allowed =
															action.requirements?.allowed_team_ids ?? [];
														const on =
															allowed.length === 0 || allowed.includes(teamId);
														return (
															<button
																key={action.code}
																type="button"
																onClick={() => {
																	const current =
																		allowed.length === 0
																			? plan.teams.flatMap((item) =>
																					item.id === undefined ||
																					isGovernmentTeam(item)
																						? []
																						: [item.id],
																				)
																			: allowed;
																	const next = on
																		? current.filter((id) => id !== teamId)
																		: [...current, teamId];
																	onChange(
																		setActionTeams(plan, action.code, next),
																	);
																}}
																className={`rounded-lg border px-2 py-1 text-[11px] transition ${
																	on
																		? "border-cyan-400/30 bg-cyan-500/10 text-cyan-100"
																		: "border-white/10 bg-white/[0.02] text-slate-500"
																}`}
															>
																{action.name_fa?.trim() || action.code}
															</button>
														);
													})}
												</div>
												{playable.length === 0 && (
													<p className="mt-2 flex items-start gap-1.5 text-[11px] leading-6 text-orange-200">
														<TriangleAlert className="mt-0.5 size-3 shrink-0" />
														این تیم هیچ کنشی ندارد و نمی‌تواند بازی کند.
													</p>
												)}
											</div>

											{teamIssue && (
												<p className="mt-2 flex items-start gap-1.5 text-[11px] leading-6 text-orange-200">
													<TriangleAlert className="mt-0.5 size-3 shrink-0" />
													{teamIssue}
												</p>
											)}
										</div>
									);
								})}
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
