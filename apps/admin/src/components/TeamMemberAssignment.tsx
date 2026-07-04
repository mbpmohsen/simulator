"use client";

import type {
	AdminUserSummary,
	ConfigureAllRequestV2,
	TeamRequest,
} from "@workspace/trpc";
import { getLocalized } from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { motion } from "framer-motion";
import {
	Crown,
	LoaderCircle,
	Plus,
	RefreshCw,
	Shield,
	Trash2,
	UserCheck,
	Users,
} from "lucide-react";
import { useMemo, useState } from "react";

interface TeamMemberAssignmentProps {
	plan: ConfigureAllRequestV2;
	users: AdminUserSummary[];
	loading: boolean;
	error: string | null;
	onReload: () => void;
	onChange: (plan: ConfigureAllRequestV2) => void;
}

const roleType = (team: TeamRequest): string =>
	typeof team.role === "string" ? team.role : team.role.type;

const isGovernmentTeam = (team: TeamRequest): boolean =>
	roleType(team) === "GOVERNMENT" || team.team_type === "GOVERNMENT";

const roleLabel: Record<string, string> = {
	ATTACKER: "مهاجم",
	DEFENCER: "مدافع",
	BOTH: "ترکیبی",
	GOVERNMENT: "دولت",
};

const teamTitle = (team: TeamRequest): string =>
	getLocalized(
		team.display_name ?? team.name,
		team.display_name_fa ?? team.name_fa,
	);

export default function TeamMemberAssignment({
	plan,
	users,
	loading,
	error,
	onReload,
	onChange,
}: TeamMemberAssignmentProps) {
	const [selectedByTeam, setSelectedByTeam] = useState<Record<number, string>>(
		{},
	);
	const usersById = useMemo(
		() => new Map(users.map((user) => [user.id, user])),
		[users],
	);
	const assignedTeamByUser = useMemo(() => {
		const assigned = new Map<number, number>();
		for (const [teamIndex, team] of plan.teams.entries()) {
			for (const player of team.players) assigned.set(player.userId, teamIndex);
		}
		return assigned;
	}, [plan.teams]);
	const assignedCount = new Set(
		plan.teams.flatMap((team) => team.players.map((player) => player.userId)),
	).size;
	const unresolvedCount = plan.teams.reduce(
		(count, team) =>
			count +
			team.players.filter((player) => !usersById.has(player.userId)).length,
		0,
	);

	const updateGovernmentOperator = (
		next: ConfigureAllRequestV2,
		team: TeamRequest,
		user: AdminUserSummary | null,
	) => {
		if (!next.government || team.id === undefined) return;
		next.government.side_governments = next.government.side_governments.map(
			(government) =>
				government.team_id === team.id
					? {
							...government,
							player: {
								...government.player,
								userId: user?.id ?? 0,
								name: user?.username ?? null,
							},
						}
					: government,
		);
	};

	const addMember = (teamIndex: number) => {
		const selected = selectedByTeam[teamIndex];
		const user = usersById.get(Number(selected));
		const sourceTeam = plan.teams[teamIndex];
		if (!user || !sourceTeam) return;
		const currentAssignment = assignedTeamByUser.get(user.id);
		if (currentAssignment !== undefined && currentAssignment !== teamIndex)
			return;

		const next = structuredClone(plan);
		const team = next.teams[teamIndex];
		if (!team) return;
		const member = {
			userId: user.id,
			name: user.username,
			isLeader: true,
			voteWeight: 1,
		};
		if (isGovernmentTeam(team)) {
			team.players = [member];
			updateGovernmentOperator(next, team, user);
		} else if (!team.players.some((player) => player.userId === user.id)) {
			team.players = [
				...team.players,
				{ ...member, isLeader: team.players.length === 0 },
			];
		}
		onChange(next);
		setSelectedByTeam((current) => ({ ...current, [teamIndex]: "" }));
	};

	const removeMember = (teamIndex: number, userId: number) => {
		const next = structuredClone(plan);
		const team = next.teams[teamIndex];
		if (!team) return;
		const removed = team.players.find((player) => player.userId === userId);
		team.players = team.players.filter((player) => player.userId !== userId);
		if (removed?.isLeader && team.players[0]) team.players[0].isLeader = true;
		if (isGovernmentTeam(team)) updateGovernmentOperator(next, team, null);
		onChange(next);
	};

	const makeLeader = (teamIndex: number, userId: number) => {
		const next = structuredClone(plan);
		const team = next.teams[teamIndex];
		if (!team) return;
		team.players = team.players.map((player) => ({
			...player,
			isLeader: player.userId === userId,
		}));
		onChange(next);
	};

	const clearUnregistered = () => {
		const next = structuredClone(plan);
		for (const team of next.teams) {
			team.players = team.players.filter((player) =>
				usersById.has(player.userId),
			);
			if (
				team.players.length > 0 &&
				!team.players.some((player) => player.isLeader)
			) {
				if (team.players[0]) team.players[0].isLeader = true;
			}
			if (isGovernmentTeam(team)) {
				const user = usersById.get(team.players[0]?.userId ?? 0) ?? null;
				updateGovernmentOperator(next, team, user);
			}
		}
		onChange(next);
	};

	return (
		<div className="space-y-5">
			<Card className="overflow-hidden border-cyan-400/15 bg-gradient-to-l from-cyan-500/10 via-slate-950/80 to-violet-500/10 text-slate-100">
				<CardContent className="flex flex-col justify-between gap-5 p-6 lg:flex-row lg:items-center">
					<div>
						<div className="flex items-center gap-2 text-lg font-black">
							<UserCheck className="size-5 text-cyan-300" /> انتخاب کاربران
							ثبت‌شده
						</div>
						<p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
							هر کاربر فقط در یک تیم قرار می‌گیرد. تیم‌های دولتی دقیقاً یک عضو
							دارند و همان کاربر به‌عنوان اپراتور دولت ثبت می‌شود.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Badge className="border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200">
							{users.length.toLocaleString("fa-IR")} کاربر ثبت‌شده
						</Badge>
						<Badge className="border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-cyan-200">
							{assignedCount.toLocaleString("fa-IR")} کاربر انتخاب‌شده
						</Badge>
						{unresolvedCount > 0 && (
							<Badge className="border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-amber-200">
								{unresolvedCount.toLocaleString("fa-IR")} عضو نمونه/نامعتبر
							</Badge>
						)}
					</div>
				</CardContent>
			</Card>

			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="text-sm text-slate-400">
					{loading
						? "در حال دریافت کاربران از سرور…"
						: (error ?? "فهرست کاربران با سرور همگام است.")}
				</div>
				<div className="flex gap-2">
					{unresolvedCount > 0 && (
						<Button
							variant="outline"
							onClick={clearUnregistered}
							className="border-amber-400/25 bg-amber-500/5 text-amber-200"
						>
							<Trash2 className="size-4" /> حذف اعضای نمونه
						</Button>
					)}
					<Button
						variant="outline"
						disabled={loading}
						onClick={onReload}
						className="border-white/10 bg-white/5 text-slate-200"
					>
						{loading ? (
							<LoaderCircle className="size-4 animate-spin" />
						) : (
							<RefreshCw className="size-4" />
						)}
						به‌روزرسانی کاربران
					</Button>
				</div>
			</div>

			<div className="grid gap-4 xl:grid-cols-2">
				{plan.teams.map((team, teamIndex) => {
					const government = isGovernmentTeam(team);
					const availableUsers = users.filter((user) => {
						const assignment = assignedTeamByUser.get(user.id);
						return assignment === undefined || assignment === teamIndex;
					});
					return (
						<motion.div
							key={team.id ?? `${team.name}-${teamIndex}`}
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: Math.min(teamIndex * 0.06, 0.3) }}
						>
							<Card
								className={`h-full text-slate-100 ${government ? "border-amber-400/20 bg-amber-500/[0.06]" : "border-white/10 bg-slate-950/55"}`}
							>
								<CardHeader className="pb-4">
									<div className="flex items-start justify-between gap-3">
										<div>
											<div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
												{government ? (
													<Shield className="size-4 text-amber-300" />
												) : (
													<Users className="size-4 text-cyan-300" />
												)}
												{government ? "عضو دولت" : "بازیکنان تیم"}
											</div>
											<CardTitle className="text-lg">
												{teamTitle(team)}
											</CardTitle>
											<div
												dir="ltr"
												className="mt-1 text-left font-mono text-[10px] text-slate-600"
											>
												{team.id}
											</div>
										</div>
										<Badge
											className={
												government
													? "bg-amber-400/15 text-amber-200"
													: "bg-cyan-400/10 text-cyan-200"
											}
										>
											{roleLabel[roleType(team)] ?? roleType(team)}
										</Badge>
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-2">
										{team.players.map((player) => {
											const user = usersById.get(player.userId);
											return (
												<div
													key={player.userId}
													className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${user ? "border-white/5 bg-white/[0.035]" : "border-amber-400/20 bg-amber-500/10"}`}
												>
													<div className="min-w-0">
														<div className="flex items-center gap-2">
															<span className="truncate text-sm font-bold">
																{user?.username ??
																	player.name ??
																	"کاربر ناشناخته"}
															</span>
															{player.isLeader && (
																<Crown className="size-4 text-amber-300" />
															)}
														</div>
														<div
															dir="ltr"
															className="mt-1 text-left font-mono text-[10px] text-slate-500"
														>
															{player.userId}
														</div>
													</div>
													<div className="flex shrink-0 gap-1">
														{!government && !player.isLeader && user && (
															<Button
																size="sm"
																variant="ghost"
																onClick={() =>
																	makeLeader(teamIndex, player.userId)
																}
																className="text-slate-400 hover:text-amber-200"
															>
																<Crown className="size-4" /> سرگروه
															</Button>
														)}
														<Button
															size="icon"
															variant="ghost"
															aria-label={`حذف ${user?.username ?? player.userId}`}
															onClick={() =>
																removeMember(teamIndex, player.userId)
															}
															className="text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"
														>
															<Trash2 className="size-4" />
														</Button>
													</div>
												</div>
											);
										})}
										{team.players.length === 0 && (
											<div className="rounded-xl border border-dashed border-rose-400/25 bg-rose-500/5 p-4 text-center text-sm text-rose-200">
												هنوز عضوی برای این تیم انتخاب نشده است.
											</div>
										)}
									</div>

									<div className="flex gap-2 border-t border-white/5 pt-4">
										<Select
											value={selectedByTeam[teamIndex] || undefined}
											onValueChange={(value) =>
												setSelectedByTeam((current) => ({
													...current,
													[teamIndex]: value,
												}))
											}
											disabled={loading || users.length === 0}
										>
											<SelectTrigger className="h-10 min-w-0 flex-1 border-white/10 bg-slate-950/70 text-slate-200">
												<SelectValue
													placeholder={
														government && team.players.length > 0
															? "جایگزینی عضو دولت"
															: "انتخاب از کاربران"
													}
												/>
											</SelectTrigger>
											<SelectContent
												position="popper"
												className="border-white/10 bg-slate-950 text-slate-100"
											>
												{availableUsers.map((user) => (
													<SelectItem
														key={user.id}
														value={String(user.id)}
														className="focus:bg-cyan-400/10 focus:text-cyan-100"
													>
														<span>{user.username}</span>
														<span
															dir="ltr"
															className="font-mono text-[10px] text-slate-500"
														>
															{user.id}
														</span>
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<Button
											onClick={() => addMember(teamIndex)}
											disabled={!selectedByTeam[teamIndex]}
											className={
												government
													? "bg-amber-400 text-slate-950 hover:bg-amber-300"
													: "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
											}
										>
											<Plus className="size-4" />{" "}
											{government ? "انتخاب" : "افزودن"}
										</Button>
									</div>
								</CardContent>
							</Card>
						</motion.div>
					);
				})}
			</div>
		</div>
	);
}
