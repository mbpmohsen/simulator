"use client";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { AlertTriangle, RefreshCw, ShieldCheck, Swords, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { createGameServerApi, type ConfigureAllRequest } from "@workspace/trpc";

type RoleType = "attack_only" | "defense_only" | "hybrid";

interface AdminUser {
	id: number;
	username: string;
}

interface TeamPlayerDraft {
	userId: string;
	isLeader: boolean;
	voteWeight: number;
}

interface TeamDraft {
	id: string;
	name: string;
	display_name: string;
	color: string;
	icon: string;
	starting_credits: number;
	roleType: RoleType;
	roleDescription: string;
	allowedActionTypesCsv: string;
	specializationsJson: string;
	players: TeamPlayerDraft[];
}

const BASE_URL = process.env.NEXT_PUBLIC_CLIENT_URL ?? "https://game.darkube.app";

const DEFAULT_ACTIONS_JSON = `[
  {
    "code": "DDOS",
    "name": "DDoS Attack",
    "type": "attack",
    "description": "Overwhelm target systems with massive traffic",
    "mitre_mapping": {
      "techniques": [
        { "id": "T1498", "name": "Network Denial of Service", "url": "https://attack.mitre.org/techniques/T1498/" }
      ],
      "tactics": ["Impact"]
    },
    "base_stats": { "cost": 10, "success_probability": 90, "points_on_success": 1, "cooldown_turns": 0 },
    "requirements": {
      "unlocked_by_default": true,
      "prerequisites": [],
      "min_credits": 10,
      "allowed_team_roles": ["attack_only", "hybrid"]
    },
    "effects": { "on_success": [{ "type": "points", "target": "self", "value": 1 }] },
    "visual": { "icon": "🌊", "color": "#FF4444", "animation": "wave_attack" }
  }
]`;

const DEFAULT_COUNTERS_JSON = `[
  {
    "attack_code": "DDOS",
    "countered_by": [
      { "defense_code": "DDOS_DEFENSE", "effectiveness": 90, "description": "Blocks 90%" }
    ]
  }
]`;

const DEFAULT_BLACK_MARKET_JSON = `[
  {
    "code": "ATTACK_BOOSTER",
    "name": "Attack Probability Booster",
    "description": "Increases attack success by 20% for 3 turns",
    "item_type": "consumable",
    "effect_type": "probability_increase",
    "target": { "action_code": "DDOS", "action_type": "attack" },
    "effect": { "modifier_type": "additive", "value": 20, "description": "+20% success probability" },
    "cost": 25,
    "duration_turns": 3,
    "stackable": false,
    "availability": {
      "unlocked_by_default": true,
      "stock_limit": null,
      "per_team_limit": 2,
      "available_from_turn": 1
    },
    "visual": { "icon": "⚡", "color": "#FFD700" }
  }
]`;

const createTeam = (id: number, roleType: RoleType, color: string, icon: string): TeamDraft => ({
	id: `team-${id}`,
	name: id === 1 ? "Red Team" : "Blue Team",
	display_name: id === 1 ? "Red Team" : "Blue Team",
	color,
	icon,
	starting_credits: 200,
	roleType,
	roleDescription: roleType === "attack_only" ? "Offensive" : "Defensive",
	allowedActionTypesCsv: roleType === "attack_only" ? "attack" : "defense",
	specializationsJson: "{}",
	players: [{ userId: "", isLeader: true, voteWeight: 2 }],
});

const parseUsersFromResponse = (response: Record<string, unknown>): AdminUser[] => {
	const candidateCollections = [
		response.users,
		response.items,
		(response.data as Record<string, unknown> | undefined)?.users,
		(response.data as Record<string, unknown> | undefined)?.items,
	];

	for (const collection of candidateCollections) {
		if (!Array.isArray(collection)) {
			continue;
		}

		const users = collection
			.map((entry) => {
				if (!entry || typeof entry !== "object") {
					return null;
				}

				const raw = entry as Record<string, unknown>;
				const id = raw.id;
				const username = raw.username;
				if (typeof id === "number" && typeof username === "string") {
					return { id, username };
				}
				return null;
			})
			.filter((entry): entry is AdminUser => entry !== null);

		if (users.length > 0) {
			return users;
		}
	}

	return [];
};

const parseJsonText = <T,>(value: string, label: string): T => {
	try {
		return JSON.parse(value) as T;
	} catch {
		throw new Error(`${label} معتبر نیست و باید JSON صحیح باشد.`);
	}
};

export default function AdminConfigurationPage() {
	const [adminPassword, setAdminPassword] = useState("");
	const [adminToken, setAdminToken] = useState("");
	const [isAuthLoading, setIsAuthLoading] = useState(false);

	const [users, setUsers] = useState<AdminUser[]>([]);
	const [isUsersLoading, setIsUsersLoading] = useState(false);

	const [version, setVersion] = useState("1.0");
	const [numTurns, setNumTurns] = useState(10);
	const [turnDurationSeconds, setTurnDurationSeconds] = useState(120);
	const [selectionPhaseDuration, setSelectionPhaseDuration] = useState(90);
	const [votingPhaseDuration, setVotingPhaseDuration] = useState(30);
	const [pointThreshold, setPointThreshold] = useState(7);
	const [pointsToWin, setPointsToWin] = useState(7);
	const [maxTurns, setMaxTurns] = useState(10);
	const [alternativeWinConditionsCsv, setAlternativeWinConditionsCsv] = useState(
		"opponent_bankruptcy,opponent_surrender",
	);
	const [votingEnabled, setVotingEnabled] = useState(true);
	const [requiredApproval, setRequiredApproval] = useState("majority");
	const [leaderVetoEnabled, setLeaderVetoEnabled] = useState(true);
	const [voteTimeLimitSeconds, setVoteTimeLimitSeconds] = useState(30);

	const [teams, setTeams] = useState<TeamDraft[]>([
		createTeam(1, "attack_only", "#FF0000", "⚔️"),
		createTeam(2, "defense_only", "#0000FF", "🛡️"),
	]);

	const [actionsJson, setActionsJson] = useState(DEFAULT_ACTIONS_JSON);
	const [actionCountersJson, setActionCountersJson] = useState(DEFAULT_COUNTERS_JSON);
	const [blackMarketJson, setBlackMarketJson] = useState(DEFAULT_BLACK_MARKET_JSON);

	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastResponse, setLastResponse] = useState<Record<string, unknown> | null>(null);

	const loginAdmin = async () => {
		setError(null);
		setIsAuthLoading(true);
		try {
			const api = createGameServerApi({ baseURL: BASE_URL });
			const result = (await api.adminLogin({
				password: adminPassword,
			})) as Record<string, unknown>;

			const nestedData =
				result.data && typeof result.data === "object"
					? (result.data as Record<string, unknown>)
					: null;

			const token =
				typeof nestedData?.token === "string"
					? nestedData.token
					: typeof result.access_token === "string"
						? result.access_token
						: typeof result.token === "string"
							? result.token
							: null;
			if (!token) {
				throw new Error("توکن ادمین از پاسخ دریافت نشد.");
			}
			setAdminToken(token);
			await loadUsers(token);
		} catch (err) {
			setError(err instanceof Error ? err.message : "خطا در ورود ادمین");
		} finally {
			setIsAuthLoading(false);
		}
	};

	const loadUsers = async (token = adminToken) => {
		if (!token) {
			setError("ابتدا باید با رمز ادمین وارد شوید.");
			return;
		}
		setError(null);
		setIsUsersLoading(true);
		try {
			const api = createGameServerApi({ baseURL: BASE_URL, adminToken: token });
			const result = (await api.listUsers({ skip: 0, limit: 500 })) as Record<string, unknown>;
			const parsedUsers = parseUsersFromResponse(result);
			setUsers(parsedUsers);
			if (parsedUsers.length === 0) {
				setError("کاربری یافت نشد. ابتدا از سمت کلاینت ثبت‌نام انجام دهید.");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "خطا در دریافت لیست کاربران");
		} finally {
			setIsUsersLoading(false);
		}
	};

	const selectedUserIds = useMemo(() => {
		return new Set(
			teams.flatMap((team) => team.players.map((player) => player.userId).filter(Boolean)),
		);
	}, [teams]);

	const updateTeam = (teamId: string, updater: (team: TeamDraft) => TeamDraft) => {
		setTeams((prev) => prev.map((team) => (team.id === teamId ? updater(team) : team)));
	};

	const addPlayerSlot = (teamId: string) => {
		updateTeam(teamId, (team) => ({
			...team,
			players: [...team.players, { userId: "", isLeader: false, voteWeight: 1 }],
		}));
	};

	const removePlayerSlot = (teamId: string, playerIndex: number) => {
		updateTeam(teamId, (team) => {
			const nextPlayers = team.players.filter((_, index) => index !== playerIndex);
			if (nextPlayers.length > 0 && !nextPlayers.some((player) => player.isLeader)) {
				nextPlayers[0] = { ...nextPlayers[0], isLeader: true };
			}
			return { ...team, players: nextPlayers };
		});
	};

	const setLeader = (teamId: string, playerIndex: number) => {
		updateTeam(teamId, (team) => ({
			...team,
			players: team.players.map((player, index) => ({
				...player,
				isLeader: index === playerIndex,
			})),
		}));
	};

	const createPayload = (): ConfigureAllRequest => {
		if (!adminToken) {
			throw new Error("ابتدا ورود ادمین را انجام دهید.");
		}
		if (users.length === 0) {
			throw new Error("لیست کاربران خالی است.");
		}

		const actions = parseJsonText<ConfigureAllRequest["actions"]>(actionsJson, "actions");
		const actionCounters = parseJsonText<ConfigureAllRequest["action_counters"]>(
			actionCountersJson,
			"action_counters",
		);
		const blackMarket = parseJsonText<ConfigureAllRequest["black_market"]>(
			blackMarketJson,
			"black_market",
		);

		const teamsPayload = teams.map((team) => {
			if (!team.name.trim()) {
				throw new Error("نام تیم نباید خالی باشد.");
			}
			if (team.players.length === 0) {
				throw new Error(`تیم ${team.name} باید حداقل یک بازیکن داشته باشد.`);
			}
			if (!team.players.some((player) => player.isLeader)) {
				throw new Error(`تیم ${team.name} باید یک لیدر داشته باشد.`);
			}

			const usedInTeam = new Set<string>();
			const players = team.players.map((player) => {
				if (!player.userId) {
					throw new Error(`برای تیم ${team.name} یک کاربر انتخاب نشده است.`);
				}
				if (usedInTeam.has(player.userId)) {
					throw new Error(`کاربر تکراری در تیم ${team.name} انتخاب شده است.`);
				}
				usedInTeam.add(player.userId);

				const user = users.find((entry) => String(entry.id) === player.userId);
				if (!user) {
					throw new Error(`کاربر انتخابی در تیم ${team.name} معتبر نیست.`);
				}

				return {
					name: user.username,
					userId: user.id,
					isLeader: player.isLeader,
					voteWeight: player.voteWeight,
				};
			});

			return {
				name: team.name,
				display_name: team.display_name || team.name,
				color: team.color,
				icon: team.icon,
				starting_credits: Number(team.starting_credits),
				role: {
					type: team.roleType,
					allowed_action_types: team.allowedActionTypesCsv
						.split(",")
						.map((value) => value.trim())
						.filter(Boolean),
					description: team.roleDescription,
				},
				specializations: parseJsonText<Record<string, { probability_modifier: number; cost_modifier: number }>>(
					team.specializationsJson,
					`specializations تیم ${team.name}`,
				),
				players,
			};
		});

		const globalUsed = new Set<number>();
		for (const team of teamsPayload) {
			for (const player of team.players) {
				if (globalUsed.has(player.userId)) {
					throw new Error(`کاربر ${player.name} در چند تیم انتخاب شده است.`);
				}
				globalUsed.add(player.userId);
			}
		}

		return {
			version,
			game_config: {
				num_turns: Number(numTurns),
				turn_duration_seconds: Number(turnDurationSeconds),
				selection_phase_duration: Number(selectionPhaseDuration),
				voting_phase_duration: Number(votingPhaseDuration),
				point_threshold: Number(pointThreshold),
				victory_conditions: {
					type: "points_or_turns",
					points_to_win: Number(pointsToWin),
					max_turns: Number(maxTurns),
					alternative_win_conditions: alternativeWinConditionsCsv
						.split(",")
						.map((value) => value.trim())
						.filter(Boolean),
				},
				voting_config: {
					voting_enabled: votingEnabled,
					required_approval: requiredApproval,
					leader_veto_enabled: leaderVetoEnabled,
					vote_time_limit_seconds: Number(voteTimeLimitSeconds),
				},
			},
			teams: teamsPayload,
			actions,
			action_counters: actionCounters,
			black_market: blackMarket,
		};
	};

	const payloadPreview = useMemo(() => {
		try {
			return JSON.stringify(createPayload(), null, 2);
		} catch (err) {
			return `// payload preview error\n${err instanceof Error ? err.message : "unknown error"}`;
		}
	}, [
		adminToken,
		users,
		version,
		numTurns,
		turnDurationSeconds,
		selectionPhaseDuration,
		votingPhaseDuration,
		pointThreshold,
		pointsToWin,
		maxTurns,
		alternativeWinConditionsCsv,
		votingEnabled,
		requiredApproval,
		leaderVetoEnabled,
		voteTimeLimitSeconds,
		teams,
		actionsJson,
		actionCountersJson,
		blackMarketJson,
	]);

	const submitConfigureAll = async () => {
		setError(null);
		setLastResponse(null);
		setSubmitting(true);
		try {
			const payload = createPayload();
			const api = createGameServerApi({ baseURL: BASE_URL, adminToken });
			const response = (await api.configureAll(payload)) as Record<string, unknown>;
			setLastResponse(response);
		} catch (err) {
			setError(err instanceof Error ? err.message : "خطا در ارسال configure_all");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#1e3a2f,transparent_30%),radial-gradient(circle_at_80%_0%,#3b1c22,transparent_26%),linear-gradient(160deg,#050708_0%,#0d1115_100%)] text-slate-100 p-4 md:p-8">
			<div className="mx-auto max-w-[1600px] space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl md:text-4xl font-black tracking-tight">Game Ops Configuration</h1>
						<p className="text-slate-300 mt-1">پنل فرماندهی: انتخاب کاربران ثبت‌نام‌شده و ساخت payload جدید configure_all</p>
					</div>
					<div className="rounded-lg border border-emerald-500/40 bg-emerald-900/25 px-4 py-2 text-sm flex items-center gap-2">
						<ShieldCheck className="w-4 h-4 text-emerald-300" />
						<span className="font-mono">{BASE_URL}</span>
					</div>
				</div>

				{error ? (
					<div className="rounded-lg border border-rose-500/40 bg-rose-950/50 px-4 py-3 flex items-center gap-2 text-rose-200">
						<AlertTriangle className="w-4 h-4" />
						<span>{error}</span>
					</div>
				) : null}

				<div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-6">
					<div className="space-y-6">
						<Card className="border-cyan-700/40 bg-slate-900/70">
							<CardHeader>
								<CardTitle className="text-cyan-300 flex items-center gap-2">
									<ShieldCheck className="w-5 h-5" />
									Admin Access + Registered Users
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
									<div className="space-y-2">
										<Label>Admin Password</Label>
										<Input
											type="password"
											value={adminPassword}
											onChange={(event) => setAdminPassword(event.target.value)}
											placeholder="admin123"
											className="bg-slate-950/80 border-slate-700"
										/>
									</div>
									<Button onClick={loginAdmin} disabled={isAuthLoading} className="self-end bg-cyan-700 hover:bg-cyan-600">
										{isAuthLoading ? "..." : "ورود ادمین"}
									</Button>
									<Button
										onClick={() => loadUsers()}
										disabled={!adminToken || isUsersLoading}
										variant="outline"
										className="self-end border-slate-600"
									>
										<RefreshCw className="w-4 h-4 mr-2" />
										{isUsersLoading ? "در حال دریافت..." : "بروزرسانی کاربران"}
									</Button>
								</div>

								<div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
									<div className="text-sm text-slate-300 flex items-center gap-2 mb-2">
										<Users className="w-4 h-4" />
										کاربران ثبت‌نام شده: {users.length}
									</div>
									<ScrollArea className="h-28">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
											{users.map((user) => (
												<div key={user.id} className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-xs flex items-center justify-between">
													<span>{user.username}</span>
													<span className="text-slate-400 font-mono">{user.id}</span>
												</div>
											))}
										</div>
									</ScrollArea>
								</div>
							</CardContent>
						</Card>

						<Card className="border-emerald-700/30 bg-slate-900/70">
							<CardHeader>
								<CardTitle className="text-emerald-300">Game Config</CardTitle>
							</CardHeader>
							<CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
								<div className="space-y-2">
									<Label>Version</Label>
									<Input value={version} onChange={(event) => setVersion(event.target.value)} className="bg-slate-950/80 border-slate-700" />
								</div>
								<div className="space-y-2">
									<Label>Num Turns</Label>
									<Input type="number" value={numTurns} onChange={(event) => setNumTurns(Number(event.target.value) || 1)} className="bg-slate-950/80 border-slate-700" />
								</div>
								<div className="space-y-2">
									<Label>Turn Duration</Label>
									<Input type="number" value={turnDurationSeconds} onChange={(event) => setTurnDurationSeconds(Number(event.target.value) || 1)} className="bg-slate-950/80 border-slate-700" />
								</div>
								<div className="space-y-2">
									<Label>Selection Phase</Label>
									<Input type="number" value={selectionPhaseDuration} onChange={(event) => setSelectionPhaseDuration(Number(event.target.value) || 1)} className="bg-slate-950/80 border-slate-700" />
								</div>
								<div className="space-y-2">
									<Label>Voting Phase</Label>
									<Input type="number" value={votingPhaseDuration} onChange={(event) => setVotingPhaseDuration(Number(event.target.value) || 1)} className="bg-slate-950/80 border-slate-700" />
								</div>
								<div className="space-y-2">
									<Label>Point Threshold</Label>
									<Input type="number" value={pointThreshold} onChange={(event) => setPointThreshold(Number(event.target.value) || 1)} className="bg-slate-950/80 border-slate-700" />
								</div>
								<div className="space-y-2">
									<Label>Points To Win</Label>
									<Input type="number" value={pointsToWin} onChange={(event) => setPointsToWin(Number(event.target.value) || 1)} className="bg-slate-950/80 border-slate-700" />
								</div>
								<div className="space-y-2">
									<Label>Max Turns</Label>
									<Input type="number" value={maxTurns} onChange={(event) => setMaxTurns(Number(event.target.value) || 1)} className="bg-slate-950/80 border-slate-700" />
								</div>
								<div className="space-y-2 col-span-2">
									<Label>Alternative Win Conditions (CSV)</Label>
									<Input
										value={alternativeWinConditionsCsv}
										onChange={(event) => setAlternativeWinConditionsCsv(event.target.value)}
										className="bg-slate-950/80 border-slate-700"
									/>
								</div>
								<div className="space-y-2">
									<Label>Required Approval</Label>
									<Input value={requiredApproval} onChange={(event) => setRequiredApproval(event.target.value)} className="bg-slate-950/80 border-slate-700" />
								</div>
								<div className="space-y-2">
									<Label>Vote Time Limit</Label>
									<Input type="number" value={voteTimeLimitSeconds} onChange={(event) => setVoteTimeLimitSeconds(Number(event.target.value) || 1)} className="bg-slate-950/80 border-slate-700" />
								</div>
								<div className="space-y-2">
									<Label>Voting Enabled</Label>
									<select
										value={votingEnabled ? "true" : "false"}
										onChange={(event) => setVotingEnabled(event.target.value === "true")}
										className="w-full h-10 rounded-md border border-slate-700 bg-slate-950/80 px-3 text-sm"
									>
										<option value="true">true</option>
										<option value="false">false</option>
									</select>
								</div>
								<div className="space-y-2">
									<Label>Leader Veto</Label>
									<select
										value={leaderVetoEnabled ? "true" : "false"}
										onChange={(event) => setLeaderVetoEnabled(event.target.value === "true")}
										className="w-full h-10 rounded-md border border-slate-700 bg-slate-950/80 px-3 text-sm"
									>
										<option value="true">true</option>
										<option value="false">false</option>
									</select>
								</div>
							</CardContent>
						</Card>

						<Card className="border-violet-700/30 bg-slate-900/70">
							<CardHeader>
								<CardTitle className="text-violet-300 flex items-center gap-2">
									<Swords className="w-5 h-5" />
									Teams + Player Assignment
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{teams.map((team) => (
									<div key={team.id} className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 space-y-3">
										<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
											<div className="space-y-2">
												<Label>Team Name</Label>
												<Input value={team.name} onChange={(event) => updateTeam(team.id, (current) => ({ ...current, name: event.target.value }))} className="bg-slate-950/80 border-slate-700" />
											</div>
											<div className="space-y-2">
												<Label>Display Name</Label>
												<Input value={team.display_name} onChange={(event) => updateTeam(team.id, (current) => ({ ...current, display_name: event.target.value }))} className="bg-slate-950/80 border-slate-700" />
											</div>
											<div className="space-y-2">
												<Label>Color</Label>
												<Input value={team.color} onChange={(event) => updateTeam(team.id, (current) => ({ ...current, color: event.target.value }))} className="bg-slate-950/80 border-slate-700" />
											</div>
											<div className="space-y-2">
												<Label>Icon</Label>
												<Input value={team.icon} onChange={(event) => updateTeam(team.id, (current) => ({ ...current, icon: event.target.value }))} className="bg-slate-950/80 border-slate-700" />
											</div>
											<div className="space-y-2">
												<Label>Starting Credits</Label>
												<Input type="number" value={team.starting_credits} onChange={(event) => updateTeam(team.id, (current) => ({ ...current, starting_credits: Number(event.target.value) || 0 }))} className="bg-slate-950/80 border-slate-700" />
											</div>
											<div className="space-y-2">
												<Label>Role Type</Label>
												<select
													value={team.roleType}
													onChange={(event) =>
														updateTeam(team.id, (current) => ({
															...current,
															roleType: event.target.value as RoleType,
														}))
													}
													className="w-full h-10 rounded-md border border-slate-700 bg-slate-950/80 px-3 text-sm"
												>
													<option value="attack_only">attack_only</option>
													<option value="defense_only">defense_only</option>
													<option value="hybrid">hybrid</option>
												</select>
											</div>
											<div className="space-y-2">
												<Label>Allowed Action Types (CSV)</Label>
												<Input value={team.allowedActionTypesCsv} onChange={(event) => updateTeam(team.id, (current) => ({ ...current, allowedActionTypesCsv: event.target.value }))} className="bg-slate-950/80 border-slate-700" />
											</div>
											<div className="space-y-2">
												<Label>Role Description</Label>
												<Input value={team.roleDescription} onChange={(event) => updateTeam(team.id, (current) => ({ ...current, roleDescription: event.target.value }))} className="bg-slate-950/80 border-slate-700" />
											</div>
										</div>

										<div className="space-y-2">
											<Label>Specializations JSON</Label>
											<textarea
												value={team.specializationsJson}
												onChange={(event) => updateTeam(team.id, (current) => ({ ...current, specializationsJson: event.target.value }))}
												className="w-full min-h-20 rounded-md border border-slate-700 bg-slate-950/80 p-3 text-xs font-mono"
											/>
										</div>

										<div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-2">
											<div className="flex items-center justify-between">
												<Label className="text-slate-200">Players (select from registered users)</Label>
												<Button size="sm" variant="outline" className="border-slate-600" onClick={() => addPlayerSlot(team.id)}>
													+ Add Player Slot
												</Button>
											</div>

											{team.players.map((player, playerIndex) => (
												<div key={`${team.id}-${playerIndex}`} className="grid grid-cols-1 md:grid-cols-[1.2fr_auto_auto_auto] gap-2 items-end rounded border border-slate-800 bg-slate-950/70 p-2">
													<div className="space-y-1">
														<Label className="text-xs">Registered User</Label>
														<select
															value={player.userId}
															onChange={(event) =>
																updateTeam(team.id, (current) => ({
																	...current,
																	players: current.players.map((entry, index) =>
																		index === playerIndex ? { ...entry, userId: event.target.value } : entry,
																	),
																}))
															}
															className="w-full h-10 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-sm"
														>
															<option value="">انتخاب کاربر</option>
															{users.map((user) => {
																const isUsedElsewhere =
																	selectedUserIds.has(String(user.id)) && String(user.id) !== player.userId;
																return (
																	<option key={user.id} value={String(user.id)} disabled={isUsedElsewhere}>
																		{user.username} ({user.id})
																	</option>
																);
															})}
														</select>
													</div>
													<div className="space-y-1">
														<Label className="text-xs">Vote Weight</Label>
														<Input
															type="number"
															value={player.voteWeight}
															onChange={(event) =>
																updateTeam(team.id, (current) => ({
																	...current,
																	players: current.players.map((entry, index) =>
																		index === playerIndex
																			? { ...entry, voteWeight: Number(event.target.value) || 1 }
																			: entry,
																	),
																}))
															}
															className="bg-slate-950/80 border-slate-700 w-28"
														/>
													</div>
													<Button
														size="sm"
														variant={player.isLeader ? "default" : "outline"}
														className={player.isLeader ? "bg-amber-700 hover:bg-amber-600" : "border-slate-600"}
														onClick={() => setLeader(team.id, playerIndex)}
													>
														Leader
													</Button>
													<Button size="sm" variant="outline" className="border-rose-700 text-rose-300" onClick={() => removePlayerSlot(team.id, playerIndex)}>
														Remove
													</Button>
												</div>
											))}
										</div>
									</div>
								))}
							</CardContent>
						</Card>

						<Card className="border-orange-700/30 bg-slate-900/70">
							<CardHeader>
								<CardTitle className="text-orange-300">Advanced JSON Sections</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label>actions</Label>
									<textarea value={actionsJson} onChange={(event) => setActionsJson(event.target.value)} className="w-full min-h-40 rounded-md border border-slate-700 bg-slate-950/80 p-3 text-xs font-mono" />
								</div>
								<div className="space-y-2">
									<Label>action_counters</Label>
									<textarea value={actionCountersJson} onChange={(event) => setActionCountersJson(event.target.value)} className="w-full min-h-28 rounded-md border border-slate-700 bg-slate-950/80 p-3 text-xs font-mono" />
								</div>
								<div className="space-y-2">
									<Label>black_market</Label>
									<textarea value={blackMarketJson} onChange={(event) => setBlackMarketJson(event.target.value)} className="w-full min-h-32 rounded-md border border-slate-700 bg-slate-950/80 p-3 text-xs font-mono" />
								</div>
								<Button onClick={submitConfigureAll} disabled={submitting || !adminToken} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white h-11">
									{submitting ? "در حال ارسال..." : "ارسال configure_all"}
								</Button>
							</CardContent>
						</Card>
					</div>

					<div className="space-y-6">
						<Card className="border-slate-700 bg-slate-900/70">
							<CardHeader>
								<CardTitle className="text-slate-200">Payload Preview</CardTitle>
							</CardHeader>
							<CardContent>
								<ScrollArea className="h-[720px] rounded-lg border border-slate-800 bg-black/50 p-3">
									<pre className="text-xs leading-6 text-emerald-200 font-mono whitespace-pre-wrap">{payloadPreview}</pre>
								</ScrollArea>
							</CardContent>
						</Card>

						{lastResponse ? (
							<Card className="border-emerald-700/40 bg-emerald-950/20">
								<CardHeader>
									<CardTitle className="text-emerald-300">Server Response</CardTitle>
								</CardHeader>
								<CardContent>
									<pre className="text-xs whitespace-pre-wrap rounded border border-emerald-800/50 bg-black/40 p-3">
										{JSON.stringify(lastResponse, null, 2)}
									</pre>
								</CardContent>
							</Card>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}
