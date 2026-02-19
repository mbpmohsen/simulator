"use client";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	CheckCircle2,
	RefreshCw,
	ShieldCheck,
	Sparkles,
	Swords,
	Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createGameServerApi, type ConfigureAllRequest } from "@workspace/trpc";

type RoleType = "attack_only" | "defense_only" | "hybrid";
type ActionKind = "attack" | "defense";
type StepKey = "base" | "actions" | "counter-market" | "review";
type TemplateMode = "prepared" | "custom";

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

interface ActionDraft {
	id: string;
	code: string;
	name: string;
	type: ActionKind;
	description: string;
	mitreTechniqueId: string;
	mitreTechniqueUrl: string;
	tacticsCsv: string;
	cost: number;
	successProbability: number;
	pointsOnSuccess: number;
	cooldownTurns: number;
}

interface ActionCounterDraft {
	id: string;
	attackCode: string;
	defenseCode: string;
	effectiveness: number;
	description: string;
}

interface BlackMarketDraft {
	id: string;
	code: string;
	name: string;
	description: string;
	itemType: "consumable" | "unlock" | "instant";
	effectType:
		| "probability_increase"
		| "cost_reduction"
		| "action_unlock"
		| "credit_gain";
	targetActionCode: string;
	targetActionType: ActionKind | "";
	modifierType: "additive" | "multiplicative" | "unlock" | "instant";
	value: number;
	cost: number;
	durationTurns: number | null;
	stackable: boolean;
	stockLimit: number | null;
	perTeamLimit: number | null;
	availableFromTurn: number;
}

interface PreparedSummaryItem {
	id: string;
	external_id: string | null;
	name: string;
	tactics: string[];
	mitigations_count: number;
}

interface PreparedDetailItem {
	id: string;
	external_id: string | null;
	name: string;
	description: string;
	detection_strategy: string;
	procedure_examples: Array<{ source_name: string; summary: string }>;
	mitigations: Array<{ id: string; name: string; description: string }>;
	tactics: string[];
	templates: {
		actions: unknown[];
		action_counters: unknown[];
		black_market: unknown[];
	};
}

const BASE_URL = process.env.NEXT_PUBLIC_CLIENT_URL ?? "https://game.darkube.app";
const STEP_ORDER: StepKey[] = ["base", "actions", "counter-market", "review"];
const STEP_TITLE: Record<StepKey, string> = {
	base: "۱) پایه بازی",
	actions: "۲) اکشن‌ها",
	"counter-market": "۳) کانتر و بازار سیاه",
	review: "۴) بررسی و ارسال",
};

const makeId = (prefix: string): string =>
	`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

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
		if (!Array.isArray(collection)) continue;

		const users = collection
			.map((entry) => {
				if (!entry || typeof entry !== "object") return null;
				const raw = entry as Record<string, unknown>;
				const id = raw.id;
				const username = raw.username;
				if (typeof id === "number" && typeof username === "string") {
					return { id, username };
				}
				return null;
			})
			.filter((entry): entry is AdminUser => entry !== null);

		if (users.length > 0) return users;
	}

	return [];
};

const parseJsonText = <T,>(value: string, label: string): T => {
	try {
		return JSON.parse(value) as T;
	} catch {
		throw new Error(`${label} معتبر نیست.`);
	}
};

const RangeField = ({
	label,
	min,
	max,
	step = 1,
	value,
	onChange,
}: {
	label: string;
	min: number;
	max: number;
	step?: number;
	value: number;
	onChange: (value: number) => void;
}) => {
	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between text-xs text-slate-300">
				<Label className="text-xs">{label}</Label>
				<span className="font-mono">{value}</span>
			</div>
			<div className="grid grid-cols-[1fr_72px] gap-2 items-center">
				<input
					type="range"
					min={min}
					max={max}
					step={step}
					value={value}
					onChange={(event) => onChange(Number(event.target.value))}
					className="h-2 w-full accent-emerald-500"
				/>
				<Input
					type="number"
					min={min}
					max={max}
					step={step}
					value={value}
					onChange={(event) => onChange(Number(event.target.value) || min)}
					className="h-8 bg-slate-950/80 border-slate-700 text-xs"
				/>
			</div>
		</div>
	);
};

export default function AdminConfigurationPage() {
	const [currentStepIndex, setCurrentStepIndex] = useState(0);
	const currentStep = STEP_ORDER[currentStepIndex];

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

	const [templateMode, setTemplateMode] = useState<TemplateMode>("prepared");
	const [preparedSearch, setPreparedSearch] = useState("");
	const [preparedSummaries, setPreparedSummaries] = useState<PreparedSummaryItem[]>([]);
	const [preparedDetail, setPreparedDetail] = useState<PreparedDetailItem | null>(null);
	const [isPreparedLoading, setIsPreparedLoading] = useState(false);
	const [isPreparedDetailLoading, setIsPreparedDetailLoading] = useState(false);

	const [actions, setActions] = useState<ActionDraft[]>([
		{
			id: makeId("action"),
			code: "DDOS",
			name: "DDoS Attack",
			type: "attack",
			description: "Overwhelm target systems with massive traffic.",
			mitreTechniqueId: "T1498",
			mitreTechniqueUrl: "https://attack.mitre.org/techniques/T1498/",
			tacticsCsv: "Impact",
			cost: 10,
			successProbability: 90,
			pointsOnSuccess: 1,
			cooldownTurns: 0,
		},
	]);

	const [actionCounters, setActionCounters] = useState<ActionCounterDraft[]>([
		{
			id: makeId("counter"),
			attackCode: "DDOS",
			defenseCode: "DDOS_DEFENSE",
			effectiveness: 90,
			description: "Blocks 90%",
		},
	]);

	const [blackMarketItems, setBlackMarketItems] = useState<BlackMarketDraft[]>([
		{
			id: makeId("market"),
			code: "ATTACK_BOOSTER",
			name: "Attack Probability Booster",
			description: "Increases attack success by 20% for 3 turns",
			itemType: "consumable",
			effectType: "probability_increase",
			targetActionCode: "DDOS",
			targetActionType: "attack",
			modifierType: "additive",
			value: 20,
			cost: 25,
			durationTurns: 3,
			stackable: false,
			stockLimit: 3,
			perTeamLimit: 1,
			availableFromTurn: 1,
		},
	]);

	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastResponse, setLastResponse] = useState<Record<string, unknown> | null>(null);

	const selectedUserIds = useMemo(() => {
		return new Set(
			teams.flatMap((team) => team.players.map((player) => player.userId).filter(Boolean)),
		);
	}, [teams]);

	const attackCodes = useMemo(
		() => actions.filter((action) => action.type === "attack").map((action) => action.code),
		[actions],
	);

	const defenseCodes = useMemo(
		() => actions.filter((action) => action.type === "defense").map((action) => action.code),
		[actions],
	);

	const filteredPrepared = useMemo(() => {
		if (!preparedSearch.trim()) return preparedSummaries;
		const needle = preparedSearch.trim().toLowerCase();
		return preparedSummaries.filter((item) =>
			[item.name, item.external_id ?? "", item.tactics.join(" ")].join(" ").toLowerCase().includes(needle),
		);
	}, [preparedSummaries, preparedSearch]);

	useEffect(() => {
		if (currentStep !== "actions") return;
		if (templateMode !== "prepared") return;
		if (preparedSummaries.length > 0 || isPreparedLoading) return;

		const loadPreparedSummary = async () => {
			setIsPreparedLoading(true);
			try {
				const response = await fetch("/api/prepared-catalog?summary=true&limit=700");
				const payload = (await response.json()) as {
					items?: PreparedSummaryItem[];
				};
				setPreparedSummaries(Array.isArray(payload.items) ? payload.items : []);
			} catch {
				setError("خطا در دریافت لیست آماده ATT&CK.");
			} finally {
				setIsPreparedLoading(false);
			}
		};

		void loadPreparedSummary();
	}, [currentStep, templateMode, preparedSummaries.length, isPreparedLoading]);

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
			setError("ابتدا باید ورود ادمین انجام شود.");
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
				setError("کاربری یافت نشد. ابتدا از کلاینت ثبت‌نام انجام دهید.");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "خطا در دریافت کاربران");
		} finally {
			setIsUsersLoading(false);
		}
	};

	const updateTeam = (teamId: string, updater: (team: TeamDraft) => TeamDraft) => {
		setTeams((prev) => prev.map((team) => (team.id === teamId ? updater(team) : team)));
	};

	const addPlayerSlot = (teamId: string) => {
		updateTeam(teamId, (team) => ({
			...team,
			players: [...team.players, { userId: "", isLeader: false, voteWeight: 1 }],
		}));
	};

	const removePlayerSlot = (teamId: string, indexToRemove: number) => {
		updateTeam(teamId, (team) => {
			const players = team.players.filter((_, index) => index !== indexToRemove);
			if (players.length > 0 && !players.some((player) => player.isLeader)) {
				players[0] = { ...players[0], isLeader: true };
			}
			return { ...team, players };
		});
	};

	const setLeader = (teamId: string, leaderIndex: number) => {
		updateTeam(teamId, (team) => ({
			...team,
			players: team.players.map((player, index) => ({
				...player,
				isLeader: index === leaderIndex,
			})),
		}));
	};

	const selectPreparedItem = async (id: string) => {
		setIsPreparedDetailLoading(true);
		setError(null);
		try {
			const response = await fetch(`/api/prepared-catalog?id=${encodeURIComponent(id)}`);
			if (!response.ok) {
				throw new Error("جزئیات تکنیک آماده پیدا نشد.");
			}
			const detail = (await response.json()) as PreparedDetailItem;
			setPreparedDetail(detail);
		} catch (err) {
			setError(err instanceof Error ? err.message : "خطا در دریافت جزئیات آیتم آماده");
		} finally {
			setIsPreparedDetailLoading(false);
		}
	};

	const applyPreparedTemplate = () => {
		if (!preparedDetail) return;

		const templateActions = Array.isArray(preparedDetail.templates.actions)
			? preparedDetail.templates.actions
			: [];
		const templateCounters = Array.isArray(preparedDetail.templates.action_counters)
			? preparedDetail.templates.action_counters
			: [];
		const templateMarket = Array.isArray(preparedDetail.templates.black_market)
			? preparedDetail.templates.black_market
			: [];

		const nextActions: ActionDraft[] = templateActions
			.map((raw, index) => {
				const action = raw as Record<string, unknown>;
				const technique = Array.isArray(
					(action.mitre_mapping as Record<string, unknown> | undefined)?.techniques,
				)
					? (
							(action.mitre_mapping as Record<string, unknown>).techniques as Array<
								Record<string, unknown>
							>
						)[0]
					: null;

				const mapped: ActionDraft = {
					id: makeId(`action-prepared-${index}`),
					code: String(action.code ?? ""),
					name: String(action.name ?? ""),
					type: action.type === "defense" ? "defense" : "attack",
					description: String(action.description ?? ""),
					mitreTechniqueId: String(technique?.id ?? ""),
					mitreTechniqueUrl: String(technique?.url ?? ""),
					tacticsCsv: Array.isArray(
						(action.mitre_mapping as Record<string, unknown> | undefined)?.tactics,
					)
						? (
								(action.mitre_mapping as Record<string, unknown>).tactics as string[]
							).join(", ")
						: "",
					cost: Number((action.base_stats as Record<string, unknown> | undefined)?.cost ?? 10),
					successProbability: Number(
						(action.base_stats as Record<string, unknown> | undefined)?.success_probability ??
							75,
					),
					pointsOnSuccess: Number(
						(action.base_stats as Record<string, unknown> | undefined)?.points_on_success ?? 1,
					),
					cooldownTurns: Number(
						(action.base_stats as Record<string, unknown> | undefined)?.cooldown_turns ?? 0,
					),
				};
				return mapped;
			})
			.filter((action) => action.code && action.name);

		const nextCounters: ActionCounterDraft[] = templateCounters
			.flatMap((raw) => {
				const counter = raw as Record<string, unknown>;
				const attackCode = String(counter.attack_code ?? "");
				const list = Array.isArray(counter.countered_by)
					? (counter.countered_by as Array<Record<string, unknown>>)
					: [];
				return list.map((entry) => ({
					id: makeId("counter-prepared"),
					attackCode,
					defenseCode: String(entry.defense_code ?? ""),
					effectiveness: Number(entry.effectiveness ?? 80),
					description: String(entry.description ?? "Prepared counter"),
				}));
			})
			.filter((counter) => counter.attackCode && counter.defenseCode);

		const nextMarket: BlackMarketDraft[] = templateMarket
			.map((raw) => {
				const item = raw as Record<string, unknown>;
				const target = (item.target as Record<string, unknown> | undefined) ?? {};
				const effect = (item.effect as Record<string, unknown> | undefined) ?? {};
				const availability =
					(item.availability as Record<string, unknown> | undefined) ?? {};

				const targetActionTypeRaw = String(target.action_type ?? "");
				const targetActionType: ActionKind | "" =
					targetActionTypeRaw === "defense" ? "defense" : targetActionTypeRaw === "attack" ? "attack" : "";

				const mapped: BlackMarketDraft = {
					id: makeId("market-prepared"),
					code: String(item.code ?? ""),
					name: String(item.name ?? ""),
					description: String(item.description ?? ""),
					itemType:
						item.item_type === "unlock" || item.item_type === "instant"
							? (item.item_type as "unlock" | "instant")
							: "consumable",
					effectType:
						item.effect_type === "cost_reduction" ||
						item.effect_type === "action_unlock" ||
						item.effect_type === "credit_gain"
							? (item.effect_type as
									| "cost_reduction"
									| "action_unlock"
									| "credit_gain")
							: "probability_increase",
					targetActionCode: String(target.action_code ?? ""),
					targetActionType,
					modifierType:
						effect.modifier_type === "multiplicative" ||
						effect.modifier_type === "unlock" ||
						effect.modifier_type === "instant"
							? (effect.modifier_type as
									| "multiplicative"
									| "unlock"
									| "instant")
							: "additive",
					value: Number(effect.value ?? 20),
					cost: Number(item.cost ?? 25),
					durationTurns:
						item.duration_turns === null || item.duration_turns === undefined
							? null
							: Number(item.duration_turns),
					stackable: Boolean(item.stackable),
					stockLimit:
						availability.stock_limit === null || availability.stock_limit === undefined
							? null
							: Number(availability.stock_limit),
					perTeamLimit:
						availability.per_team_limit === null ||
						availability.per_team_limit === undefined
							? null
							: Number(availability.per_team_limit),
					availableFromTurn: Number(availability.available_from_turn ?? 1),
				};
				return mapped;
			})
			.filter((item) => item.code && item.name);

		if (nextActions.length > 0) setActions(nextActions);
		if (nextCounters.length > 0) setActionCounters(nextCounters);
		if (nextMarket.length > 0) setBlackMarketItems(nextMarket);
	};

	const addAction = (kind: ActionKind) => {
		setActions((prev) => [
			...prev,
			{
				id: makeId("action"),
				code: "",
				name: "",
				type: kind,
				description: "",
				mitreTechniqueId: "",
				mitreTechniqueUrl: "",
				tacticsCsv: "",
				cost: kind === "attack" ? 15 : 10,
				successProbability: kind === "attack" ? 70 : 85,
				pointsOnSuccess: kind === "attack" ? 1 : 0,
				cooldownTurns: 0,
			},
		]);
	};

	const updateAction = (actionId: string, updater: (action: ActionDraft) => ActionDraft) => {
		setActions((prev) => prev.map((action) => (action.id === actionId ? updater(action) : action)));
	};

	const removeAction = (actionId: string) => {
		setActions((prev) => prev.filter((action) => action.id !== actionId));
	};

	const addCounter = () => {
		setActionCounters((prev) => [
			...prev,
			{
				id: makeId("counter"),
				attackCode: attackCodes[0] ?? "",
				defenseCode: defenseCodes[0] ?? "",
				effectiveness: 80,
				description: "",
			},
		]);
	};

	const updateCounter = (
		counterId: string,
		updater: (counter: ActionCounterDraft) => ActionCounterDraft,
	) => {
		setActionCounters((prev) =>
			prev.map((counter) => (counter.id === counterId ? updater(counter) : counter)),
		);
	};

	const removeCounter = (counterId: string) => {
		setActionCounters((prev) => prev.filter((counter) => counter.id !== counterId));
	};

	const addBlackMarketItem = () => {
		const firstTarget = actions[0];
		setBlackMarketItems((prev) => [
			...prev,
			{
				id: makeId("market"),
				code: "",
				name: "",
				description: "",
				itemType: "consumable",
				effectType: "probability_increase",
				targetActionCode: firstTarget?.code ?? "",
				targetActionType: firstTarget?.type ?? "",
				modifierType: "additive",
				value: 20,
				cost: 25,
				durationTurns: 3,
				stackable: false,
				stockLimit: 3,
				perTeamLimit: 1,
				availableFromTurn: 1,
			},
		]);
	};

	const updateBlackMarketItem = (
		itemId: string,
		updater: (item: BlackMarketDraft) => BlackMarketDraft,
	) => {
		setBlackMarketItems((prev) => prev.map((item) => (item.id === itemId ? updater(item) : item)));
	};

	const removeBlackMarketItem = (itemId: string) => {
		setBlackMarketItems((prev) => prev.filter((item) => item.id !== itemId));
	};

	const validateStep = (step: StepKey): string | null => {
		if (step === "base") {
			if (!adminToken) return "ابتدا ورود ادمین انجام شود.";
			if (users.length === 0) return "لیست کاربران ثبت‌شده خالی است.";
			for (const team of teams) {
				if (!team.name.trim()) return "نام تیم نباید خالی باشد.";
				if (team.players.length === 0) return `تیم ${team.name} بازیکن ندارد.`;
				if (!team.players.some((player) => player.isLeader)) {
					return `تیم ${team.name} باید یک لیدر داشته باشد.`;
				}
				for (const player of team.players) {
					if (!player.userId) return `برای تیم ${team.name} بازیکن انتخاب نشده است.`;
				}
			}
		}

		if (step === "actions") {
			if (actions.length === 0) return "حداقل یک اکشن تعریف کنید.";
			if (actions.some((action) => !action.code.trim() || !action.name.trim())) {
				return "اکشن‌ها باید code و name داشته باشند.";
			}
			const uniqueCodes = new Set(actions.map((action) => action.code.trim()));
			if (uniqueCodes.size !== actions.length) return "code اکشن‌ها باید یکتا باشد.";
		}

		if (step === "counter-market") {
			if (actionCounters.length === 0) return "حداقل یک action counter تعریف کنید.";
			if (blackMarketItems.length === 0) return "حداقل یک آیتم بازار سیاه تعریف کنید.";
		}

		return null;
	};

	const createPayload = (): ConfigureAllRequest => {
		const baseError = validateStep("base");
		if (baseError) throw new Error(baseError);
		const actionsError = validateStep("actions");
		if (actionsError) throw new Error(actionsError);
		const countersError = validateStep("counter-market");
		if (countersError) throw new Error(countersError);

		const teamsPayload = teams.map((team) => {
			const usedInTeam = new Set<string>();
			const players = team.players.map((player) => {
				if (usedInTeam.has(player.userId)) {
					throw new Error(`کاربر تکراری در تیم ${team.name}`);
				}
				usedInTeam.add(player.userId);

				const user = users.find((entry) => String(entry.id) === player.userId);
				if (!user) {
					throw new Error(`کاربر انتخابی برای تیم ${team.name} معتبر نیست.`);
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
						.map((item) => item.trim())
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

		const globallyUsed = new Set<number>();
		for (const team of teamsPayload) {
			for (const player of team.players) {
				if (globallyUsed.has(player.userId)) {
					throw new Error(`کاربر ${player.name} در چند تیم انتخاب شده است.`);
				}
				globallyUsed.add(player.userId);
			}
		}

		const actionsPayload = actions.map((action) => {
			const allowedRoles =
				action.type === "attack"
					? ["attack_only", "hybrid"]
					: ["defense_only", "hybrid"];

			const mappedTactics = action.tacticsCsv
				.split(",")
				.map((item) => item.trim())
				.filter(Boolean);

			return {
				code: action.code.trim(),
				name: action.name.trim(),
				type: action.type,
				description: action.description.trim(),
				mitre_mapping: {
					techniques: [
						{
							id: action.mitreTechniqueId || action.code.trim(),
							name: action.name.trim(),
							url: action.mitreTechniqueUrl || undefined,
						},
					],
					tactics: mappedTactics,
				},
				base_stats: {
					cost: Number(action.cost),
					success_probability: Number(action.successProbability),
					points_on_success: Number(action.pointsOnSuccess),
					cooldown_turns: Number(action.cooldownTurns),
				},
				requirements: {
					unlocked_by_default: true,
					prerequisites: [],
					min_credits: 0,
					allowed_team_roles: allowedRoles,
				},
				effects:
					action.type === "attack"
						? {
								on_success: [
									{
										type: "points",
										target: "self",
										value: Number(action.pointsOnSuccess) || 1,
									},
								],
							}
						: {
								on_success: [{ type: "block_attack" }],
							},
				visual: {
					icon: action.type === "attack" ? "⚔️" : "🛡️",
					color: action.type === "attack" ? "#EF4444" : "#3B82F6",
					animation: action.type === "attack" ? "strike" : "shield_block",
				},
			};
		});

		const countersPayload = actionCounters.map((counter) => ({
			attack_code: counter.attackCode,
			countered_by: [
				{
					defense_code: counter.defenseCode,
					effectiveness: Number(counter.effectiveness),
					description: counter.description || "Configured by admin",
				},
			],
		}));

		const blackMarketPayload = blackMarketItems.map((item) => ({
			code: item.code.trim(),
			name: item.name.trim(),
			description: item.description.trim(),
			item_type: item.itemType,
			effect_type: item.effectType,
			target: {
				action_code: item.targetActionCode || null,
				action_type: item.targetActionType || null,
			},
			effect: {
				modifier_type: item.modifierType,
				value: Number(item.value),
				description: item.description || undefined,
			},
			cost: Number(item.cost),
			duration_turns: item.durationTurns === null ? null : Number(item.durationTurns),
			stackable: item.stackable,
			availability: {
				unlocked_by_default: true,
				stock_limit: item.stockLimit === null ? null : Number(item.stockLimit),
				per_team_limit: item.perTeamLimit === null ? null : Number(item.perTeamLimit),
				available_from_turn: Number(item.availableFromTurn),
			},
			visual: {
				icon: item.itemType === "unlock" ? "🔓" : item.itemType === "instant" ? "💸" : "⚡",
				color: item.itemType === "unlock" ? "#F97316" : "#FACC15",
			},
		}));

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
						.map((item) => item.trim())
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
			actions: actionsPayload,
			action_counters: countersPayload,
			black_market: blackMarketPayload,
		};
	};

	const payloadPreview = useMemo(() => {
		try {
			return JSON.stringify(createPayload(), null, 2);
		} catch (err) {
			return `// payload preview error\n${err instanceof Error ? err.message : "unknown error"}`;
		}
	}, [
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
		users,
		adminToken,
		actions,
		actionCounters,
		blackMarketItems,
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

	const goNext = () => {
		const validationError = validateStep(currentStep);
		if (validationError) {
			setError(validationError);
			return;
		}
		setError(null);
		setCurrentStepIndex((prev) => Math.min(prev + 1, STEP_ORDER.length - 1));
	};

	const goPrev = () => {
		setError(null);
		setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
	};

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,rgba(27,100,72,0.32),transparent_28%),radial-gradient(circle_at_80%_5%,rgba(120,34,34,0.24),transparent_32%),linear-gradient(160deg,#050708_0%,#0d1115_100%)] text-slate-100 px-3 py-5 md:px-8">
			<div className="mx-auto max-w-[1600px] space-y-5">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
					<div>
						<h1 className="text-2xl md:text-4xl font-black tracking-tight">
							Game Simulator Configuration Wizard
						</h1>
						<p className="text-slate-300 mt-1 text-sm md:text-base">
							مرحله‌به‌مرحله جلو بروید؛ هر بخش ساده و قابل ویرایش است.
						</p>
					</div>
					<div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-xs md:text-sm flex items-center gap-2 w-fit">
						<ShieldCheck className="w-4 h-4 text-emerald-300" />
						<span className="font-mono">{BASE_URL}</span>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-4 gap-2">
					{STEP_ORDER.map((step, index) => {
						const isActive = index === currentStepIndex;
						const isDone = index < currentStepIndex;
						return (
							<motion.button
								key={step}
								type="button"
								onClick={() => setCurrentStepIndex(index)}
								whileHover={{ scale: 1.01 }}
								className={`rounded-xl border px-3 py-2 text-right transition-colors ${
									isActive
										? "border-cyan-500 bg-cyan-500/15"
										: isDone
											? "border-emerald-500/60 bg-emerald-500/10"
											: "border-slate-700 bg-slate-900/60"
								}`}
							>
								<div className="flex items-center justify-between">
									<span className="text-xs text-slate-400">Step {index + 1}</span>
									{isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : null}
								</div>
								<div className="font-semibold text-sm mt-1">{STEP_TITLE[step]}</div>
							</motion.button>
						);
					})}
				</div>

				{error ? (
					<div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-rose-100 flex items-center gap-2">
						<AlertTriangle className="w-4 h-4" />
						{error}
					</div>
				) : null}

				<div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1fr] gap-5 items-start">
					<Card className="border-slate-700 bg-slate-900/75 min-h-[760px]">
						<CardContent className="p-4 md:p-6">
							<AnimatePresence mode="wait">
								<motion.div
									key={currentStep}
									initial={{ opacity: 0, x: 30 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -30 }}
									transition={{ duration: 0.24, ease: "easeOut" }}
									className="space-y-5"
								>
									{currentStep === "base" ? (
										<div className="space-y-5">
											<div className="rounded-xl border border-cyan-700/40 bg-cyan-950/20 p-4">
												<div className="flex items-center gap-2 text-cyan-200 font-semibold mb-3">
													<ShieldCheck className="w-4 h-4" />
													ورود ادمین + کاربران ثبت‌شده
												</div>
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
														{isUsersLoading ? "..." : "دریافت کاربران"}
													</Button>
												</div>
												<div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/70 p-3">
													<div className="text-sm text-slate-300 flex items-center gap-2 mb-2">
														<Users className="w-4 h-4" />
														کاربران ثبت‌نام‌شده: {users.length}
													</div>
													<ScrollArea className="h-24">
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
											</div>

											<div className="rounded-xl border border-emerald-700/30 bg-emerald-950/10 p-4">
												<div className="font-semibold text-emerald-200 mb-3">تنظیمات پایه بازی</div>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div className="space-y-2">
														<Label>Version</Label>
														<Input value={version} onChange={(event) => setVersion(event.target.value)} className="bg-slate-950/80 border-slate-700" />
													</div>
													<div className="space-y-2">
														<Label>Required Approval</Label>
														<Input value={requiredApproval} onChange={(event) => setRequiredApproval(event.target.value)} className="bg-slate-950/80 border-slate-700" />
													</div>
													<RangeField label="Num Turns" min={1} max={30} value={numTurns} onChange={setNumTurns} />
													<RangeField label="Turn Duration (sec)" min={20} max={300} value={turnDurationSeconds} onChange={setTurnDurationSeconds} />
													<RangeField label="Selection Phase (sec)" min={10} max={180} value={selectionPhaseDuration} onChange={setSelectionPhaseDuration} />
													<RangeField label="Voting Phase (sec)" min={10} max={180} value={votingPhaseDuration} onChange={setVotingPhaseDuration} />
													<RangeField label="Point Threshold" min={1} max={20} value={pointThreshold} onChange={setPointThreshold} />
													<RangeField label="Points To Win" min={1} max={20} value={pointsToWin} onChange={setPointsToWin} />
													<RangeField label="Max Turns for Victory" min={1} max={40} value={maxTurns} onChange={setMaxTurns} />
													<RangeField label="Vote Time Limit (sec)" min={5} max={120} value={voteTimeLimitSeconds} onChange={setVoteTimeLimitSeconds} />
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
														<Label>Leader Veto Enabled</Label>
														<select
															value={leaderVetoEnabled ? "true" : "false"}
															onChange={(event) => setLeaderVetoEnabled(event.target.value === "true")}
															className="w-full h-10 rounded-md border border-slate-700 bg-slate-950/80 px-3 text-sm"
														>
															<option value="true">true</option>
															<option value="false">false</option>
														</select>
													</div>
													<div className="md:col-span-2 space-y-2">
														<Label>Alternative Win Conditions (CSV)</Label>
														<Input
															value={alternativeWinConditionsCsv}
															onChange={(event) => setAlternativeWinConditionsCsv(event.target.value)}
															className="bg-slate-950/80 border-slate-700"
														/>
													</div>
												</div>
											</div>

											<div className="rounded-xl border border-violet-700/30 bg-violet-950/10 p-4 space-y-3">
												<div className="font-semibold text-violet-200 flex items-center gap-2">
													<Swords className="w-4 h-4" />
													تیم‌ها و انتخاب بازیکنان
												</div>
												{teams.map((team) => (
													<div key={team.id} className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 space-y-2">
														<div className="grid grid-cols-1 md:grid-cols-4 gap-2">
															<Input
																value={team.name}
																onChange={(event) =>
																	updateTeam(team.id, (current) => ({ ...current, name: event.target.value }))
																}
																placeholder="Team Name"
																className="bg-slate-950/80 border-slate-700"
															/>
															<Input
																value={team.display_name}
																onChange={(event) =>
																	updateTeam(team.id, (current) => ({
																		...current,
																		display_name: event.target.value,
																	}))
																}
																placeholder="Display Name"
																className="bg-slate-950/80 border-slate-700"
															/>
															<Input
																value={team.color}
																onChange={(event) =>
																	updateTeam(team.id, (current) => ({ ...current, color: event.target.value }))
																}
																placeholder="#FF0000"
																className="bg-slate-950/80 border-slate-700"
															/>
															<Input
																value={team.icon}
																onChange={(event) =>
																	updateTeam(team.id, (current) => ({ ...current, icon: event.target.value }))
																}
																placeholder="⚔️"
																className="bg-slate-950/80 border-slate-700"
															/>
														</div>
														<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
															<RangeField
																label="Starting Credits"
																min={50}
																max={500}
																value={team.starting_credits}
																onChange={(value) =>
																	updateTeam(team.id, (current) => ({
																		...current,
																		starting_credits: value,
																	}))
																}
															/>
															<div className="space-y-1.5">
																<Label className="text-xs">Role Type</Label>
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
															<div className="space-y-1.5">
																<Label className="text-xs">Allowed Action Types (CSV)</Label>
																<Input
																	value={team.allowedActionTypesCsv}
																	onChange={(event) =>
																		updateTeam(team.id, (current) => ({
																			...current,
																			allowedActionTypesCsv: event.target.value,
																		}))
																	}
																	className="bg-slate-950/80 border-slate-700"
																/>
															</div>
														</div>
														<div className="space-y-1.5">
															<Label className="text-xs">Role Description</Label>
															<Input
																value={team.roleDescription}
																onChange={(event) =>
																	updateTeam(team.id, (current) => ({
																		...current,
																		roleDescription: event.target.value,
																	}))
																}
																className="bg-slate-950/80 border-slate-700"
															/>
														</div>
														<div className="space-y-1.5">
															<Label className="text-xs">Specializations JSON</Label>
															<textarea
																value={team.specializationsJson}
																onChange={(event) =>
																	updateTeam(team.id, (current) => ({
																		...current,
																		specializationsJson: event.target.value,
																	}))
																}
																className="w-full min-h-16 rounded-md border border-slate-700 bg-slate-950/80 p-2 text-xs font-mono"
															/>
														</div>
														<div className="rounded border border-slate-800 bg-slate-900/80 p-2 space-y-2">
															<div className="flex items-center justify-between">
																<Label className="text-xs">Players</Label>
																<Button size="sm" variant="outline" className="h-7 border-slate-600 text-xs" onClick={() => addPlayerSlot(team.id)}>
																	+ Player
																</Button>
															</div>
															{team.players.map((player, index) => (
																<div key={`${team.id}-${index}`} className="grid grid-cols-1 md:grid-cols-[1.2fr_auto_auto_auto] gap-2 items-end rounded border border-slate-800 bg-slate-950/60 p-2">
																	<select
																		value={player.userId}
																		onChange={(event) =>
																			updateTeam(team.id, (current) => ({
																				...current,
																				players: current.players.map((entry, idx) =>
																					idx === index
																						? { ...entry, userId: event.target.value }
																						: entry,
																				),
																			}))
																		}
																		className="w-full h-10 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-sm"
																	>
																		<option value="">انتخاب کاربر</option>
																		{users.map((user) => {
																			const isUsedElsewhere =
																				selectedUserIds.has(String(user.id)) &&
																				String(user.id) !== player.userId;
																			return (
																				<option key={user.id} value={String(user.id)} disabled={isUsedElsewhere}>
																					{user.username} ({user.id})
																				</option>
																			);
																		})}
																	</select>
																	<Input
																		type="number"
																		value={player.voteWeight}
																		onChange={(event) =>
																			updateTeam(team.id, (current) => ({
																				...current,
																				players: current.players.map((entry, idx) =>
																					idx === index
																						? { ...entry, voteWeight: Number(event.target.value) || 1 }
																						: entry,
																				),
																			}))
																		}
																		className="h-10 bg-slate-950/80 border-slate-700 w-24"
																	/>
																	<Button
																		size="sm"
																		variant={player.isLeader ? "default" : "outline"}
																		className={player.isLeader ? "h-10 bg-amber-700 hover:bg-amber-600 text-xs" : "h-10 border-slate-600 text-xs"}
																		onClick={() => setLeader(team.id, index)}
																	>
																		Leader
																	</Button>
																	<Button
																		size="sm"
																		variant="outline"
																		className="h-10 border-rose-700 text-rose-300 text-xs"
																		onClick={() => removePlayerSlot(team.id, index)}
																	>
																		Remove
																	</Button>
																</div>
															))}
														</div>
													</div>
												))}
											</div>
										</div>
									) : null}

									{currentStep === "actions" ? (
										<div className="space-y-4">
											<div className="rounded-xl border border-orange-700/40 bg-orange-950/15 p-4">
												<div className="flex items-center justify-between gap-3 flex-wrap">
													<div>
														<div className="font-semibold text-orange-200">حالت تنظیم اکشن</div>
														<div className="text-xs text-slate-400 mt-1">
															Prepared برای کاربران ساده بهتر است. Custom برای تنظیم کامل دستی.
														</div>
													</div>
													<div className="flex gap-2">
														<Button
															variant={templateMode === "prepared" ? "default" : "outline"}
															className={templateMode === "prepared" ? "bg-orange-700 hover:bg-orange-600" : "border-slate-600"}
															onClick={() => setTemplateMode("prepared")}
														>
															Prepared
														</Button>
														<Button
															variant={templateMode === "custom" ? "default" : "outline"}
															className={templateMode === "custom" ? "bg-orange-700 hover:bg-orange-600" : "border-slate-600"}
															onClick={() => setTemplateMode("custom")}
														>
															Custom
														</Button>
													</div>
												</div>
											</div>

											{templateMode === "prepared" ? (
												<div className="grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] gap-4">
													<div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 space-y-2">
														<Label>Search ATT&CK Technique</Label>
														<Input
															placeholder="مثال: Hijack Execution Flow"
															value={preparedSearch}
															onChange={(event) => setPreparedSearch(event.target.value)}
															className="bg-slate-950/80 border-slate-700"
														/>
														<ScrollArea className="h-72 rounded border border-slate-800 p-2">
															{isPreparedLoading ? (
																<div className="text-sm text-slate-400 p-2">در حال بارگذاری...</div>
															) : (
																<div className="space-y-2">
																	{filteredPrepared.map((item) => (
																		<button
																			key={item.id}
																			type="button"
																			onClick={() => void selectPreparedItem(item.id)}
																			className="w-full text-right rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 hover:border-cyan-500/50 transition-colors"
																		>
																			<div className="text-sm font-semibold">{item.name}</div>
																			<div className="text-xs text-slate-400 mt-1">
																				{item.external_id ?? "N/A"} • {item.tactics.join(", ") || "No tactic"}
																			</div>
																		</button>
																	))}
																</div>
															)}
														</ScrollArea>
													</div>

													<div className="rounded-xl border border-cyan-700/40 bg-cyan-950/10 p-3">
														{isPreparedDetailLoading ? (
															<div className="text-sm text-slate-300">در حال بارگذاری جزئیات...</div>
														) : preparedDetail ? (
															<div className="space-y-3">
																<div className="flex items-start justify-between gap-3">
																	<div>
																		<div className="text-sm text-cyan-300 font-semibold">
																			{preparedDetail.name}
																		</div>
																		<div className="text-xs text-slate-400">
																			{preparedDetail.external_id ?? "N/A"} • {preparedDetail.tactics.join(", ")}
																		</div>
																	</div>
																	<Button onClick={applyPreparedTemplate} className="bg-cyan-700 hover:bg-cyan-600">
																		<Sparkles className="w-4 h-4 mr-2" />
																		اعمال Template
																	</Button>
																</div>
																<div className="text-xs text-slate-300 leading-6">
																	{preparedDetail.description || "No description"}
																</div>
																<div className="rounded border border-slate-700 bg-slate-950/60 p-2">
																	<div className="text-xs text-slate-400 mb-1">Detection Strategy</div>
																	<div className="text-xs leading-6 text-slate-200">
																		{preparedDetail.detection_strategy || "No detection guidance"}
																	</div>
																</div>
																<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
																	<div className="rounded border border-slate-700 bg-slate-950/60 p-2">
																		<div className="text-xs text-slate-400 mb-1">Procedure Examples</div>
																		<ul className="text-xs space-y-1">
																			{preparedDetail.procedure_examples.slice(0, 3).map((example, idx) => (
																				<li key={`${example.source_name}-${idx}`} className="leading-5">
																					<span className="text-cyan-300">{example.source_name}:</span>{" "}
																					<span>{example.summary}</span>
																				</li>
																			))}
																		</ul>
																	</div>
																	<div className="rounded border border-slate-700 bg-slate-950/60 p-2">
																		<div className="text-xs text-slate-400 mb-1">Mitigations</div>
																		<ul className="text-xs space-y-1">
																			{preparedDetail.mitigations.slice(0, 3).map((mitigation) => (
																				<li key={mitigation.id} className="leading-5">
																					<span className="text-emerald-300">{mitigation.name}</span>
																				</li>
																			))}
																		</ul>
																	</div>
																</div>
															</div>
														) : (
															<div className="text-sm text-slate-400">
																یک آیتم از لیست انتخاب کنید تا جزئیات و Template نمایش داده شود.
															</div>
														)}
													</div>
												</div>
											) : null}

											<div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 space-y-3">
												<div className="flex items-center justify-between flex-wrap gap-2">
													<div className="font-semibold text-slate-200">Action Builder</div>
													<div className="flex gap-2">
														<Button size="sm" variant="outline" className="border-slate-600" onClick={() => addAction("attack")}>
															+ Attack Action
														</Button>
														<Button size="sm" variant="outline" className="border-slate-600" onClick={() => addAction("defense")}>
															+ Defense Action
														</Button>
													</div>
												</div>
												<div className="space-y-3">
													{actions.map((action) => (
														<div key={action.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-2">
															<div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_auto] gap-2 items-end">
																<Input
																	value={action.code}
																	onChange={(event) =>
																		updateAction(action.id, (current) => ({
																			...current,
																			code: event.target.value.toUpperCase().replace(/\s+/g, "_"),
																		}))
																	}
																	placeholder="CODE"
																	className="bg-slate-950/80 border-slate-700"
																/>
																<Input
																	value={action.name}
																	onChange={(event) =>
																		updateAction(action.id, (current) => ({
																			...current,
																			name: event.target.value,
																		}))
																	}
																	placeholder="Action Name"
																	className="bg-slate-950/80 border-slate-700"
																/>
																<select
																	value={action.type}
																	onChange={(event) =>
																		updateAction(action.id, (current) => ({
																			...current,
																			type: event.target.value as ActionKind,
																			pointsOnSuccess:
																				event.target.value === "defense"
																					? 0
																					: Math.max(1, current.pointsOnSuccess),
																		}))
																	}
																	className="h-10 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-sm"
																>
																	<option value="attack">attack</option>
																	<option value="defense">defense</option>
																</select>
																<Button size="sm" variant="outline" className="border-rose-700 text-rose-300" onClick={() => removeAction(action.id)}>
																	Remove
																</Button>
															</div>
															<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
																<Input
																	value={action.mitreTechniqueId}
																	onChange={(event) =>
																		updateAction(action.id, (current) => ({
																			...current,
																			mitreTechniqueId: event.target.value,
																		}))
																	}
																	placeholder="MITRE Technique ID (e.g. T1574.004)"
																	className="bg-slate-950/80 border-slate-700"
																/>
																<Input
																	value={action.mitreTechniqueUrl}
																	onChange={(event) =>
																		updateAction(action.id, (current) => ({
																			...current,
																			mitreTechniqueUrl: event.target.value,
																		}))
																	}
																	placeholder="MITRE URL"
																	className="bg-slate-950/80 border-slate-700"
																/>
															</div>
															<Input
																value={action.tacticsCsv}
																onChange={(event) =>
																	updateAction(action.id, (current) => ({
																		...current,
																		tacticsCsv: event.target.value,
																	}))
																}
																placeholder="Tactics CSV (Impact, Defense Evasion)"
																className="bg-slate-950/80 border-slate-700"
															/>
															<textarea
																value={action.description}
																onChange={(event) =>
																	updateAction(action.id, (current) => ({
																		...current,
																		description: event.target.value,
																	}))
																}
																placeholder="Action description..."
																className="w-full min-h-16 rounded-md border border-slate-700 bg-slate-950/80 p-2 text-sm"
															/>
															<div className="grid grid-cols-1 md:grid-cols-4 gap-2">
																<RangeField label="Cost" min={1} max={500} value={action.cost} onChange={(value) => updateAction(action.id, (current) => ({ ...current, cost: value }))} />
																<RangeField label="Success %" min={1} max={100} value={action.successProbability} onChange={(value) => updateAction(action.id, (current) => ({ ...current, successProbability: value }))} />
																<RangeField label="Points on Success" min={0} max={10} value={action.pointsOnSuccess} onChange={(value) => updateAction(action.id, (current) => ({ ...current, pointsOnSuccess: value }))} />
																<RangeField label="Cooldown" min={0} max={6} value={action.cooldownTurns} onChange={(value) => updateAction(action.id, (current) => ({ ...current, cooldownTurns: value }))} />
															</div>
														</div>
													))}
												</div>
											</div>
										</div>
									) : null}

									{currentStep === "counter-market" ? (
										<div className="space-y-4">
											<div className="rounded-xl border border-blue-700/30 bg-blue-950/10 p-3 space-y-3">
												<div className="flex items-center justify-between">
													<div className="font-semibold text-blue-200">Action Counters</div>
													<Button size="sm" variant="outline" className="border-slate-600" onClick={addCounter}>
														+ Counter
													</Button>
												</div>
												<div className="space-y-3">
													{actionCounters.map((counter) => (
														<div key={counter.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-2">
															<div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
																<select
																	value={counter.attackCode}
																	onChange={(event) =>
																		updateCounter(counter.id, (current) => ({
																			...current,
																			attackCode: event.target.value,
																		}))
																	}
																	className="h-10 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-sm"
																>
																	<option value="">Select attack action</option>
																	{attackCodes.map((code) => (
																		<option key={code} value={code}>
																			{code}
																		</option>
																	))}
																</select>
																<select
																	value={counter.defenseCode}
																	onChange={(event) =>
																		updateCounter(counter.id, (current) => ({
																			...current,
																			defenseCode: event.target.value,
																		}))
																	}
																	className="h-10 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-sm"
																>
																	<option value="">Select defense action</option>
																	{defenseCodes.map((code) => (
																		<option key={code} value={code}>
																			{code}
																		</option>
																	))}
																</select>
																<Button size="sm" variant="outline" className="border-rose-700 text-rose-300" onClick={() => removeCounter(counter.id)}>
																	Remove
																</Button>
															</div>
															<RangeField
																label="Effectiveness %"
																min={1}
																max={100}
																value={counter.effectiveness}
																onChange={(value) =>
																	updateCounter(counter.id, (current) => ({
																		...current,
																		effectiveness: value,
																	}))
																}
															/>
															<Input
																value={counter.description}
																onChange={(event) =>
																	updateCounter(counter.id, (current) => ({
																		...current,
																		description: event.target.value,
																	}))
																}
																placeholder="Counter description"
																className="bg-slate-950/80 border-slate-700"
															/>
														</div>
													))}
												</div>
											</div>

											<div className="rounded-xl border border-amber-700/30 bg-amber-950/10 p-3 space-y-3">
												<div className="flex items-center justify-between">
													<div className="font-semibold text-amber-200">Black Market Items</div>
													<Button size="sm" variant="outline" className="border-slate-600" onClick={addBlackMarketItem}>
														+ Item
													</Button>
												</div>
												<div className="space-y-3">
													{blackMarketItems.map((item) => (
														<div key={item.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-2">
															<div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
																<Input
																	value={item.code}
																	onChange={(event) =>
																		updateBlackMarketItem(item.id, (current) => ({
																			...current,
																			code: event.target.value.toUpperCase().replace(/\s+/g, "_"),
																		}))
																	}
																	placeholder="Item Code"
																	className="bg-slate-950/80 border-slate-700"
																/>
																<Input
																	value={item.name}
																	onChange={(event) =>
																		updateBlackMarketItem(item.id, (current) => ({
																			...current,
																			name: event.target.value,
																		}))
																	}
																	placeholder="Item Name"
																	className="bg-slate-950/80 border-slate-700"
																/>
																<Button size="sm" variant="outline" className="border-rose-700 text-rose-300" onClick={() => removeBlackMarketItem(item.id)}>
																	Remove
																</Button>
															</div>
															<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
																<select
																	value={item.itemType}
																	onChange={(event) =>
																		updateBlackMarketItem(item.id, (current) => ({
																			...current,
																			itemType: event.target.value as
																				| "consumable"
																				| "unlock"
																				| "instant",
																		}))
																	}
																	className="h-10 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-sm"
																>
																	<option value="consumable">consumable</option>
																	<option value="unlock">unlock</option>
																	<option value="instant">instant</option>
																</select>
																<select
																	value={item.effectType}
																	onChange={(event) =>
																		updateBlackMarketItem(item.id, (current) => ({
																			...current,
																			effectType: event.target.value as
																				| "probability_increase"
																				| "cost_reduction"
																				| "action_unlock"
																				| "credit_gain",
																		}))
																	}
																	className="h-10 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-sm"
																>
																	<option value="probability_increase">probability_increase</option>
																	<option value="cost_reduction">cost_reduction</option>
																	<option value="action_unlock">action_unlock</option>
																	<option value="credit_gain">credit_gain</option>
																</select>
																<select
																	value={item.modifierType}
																	onChange={(event) =>
																		updateBlackMarketItem(item.id, (current) => ({
																			...current,
																			modifierType: event.target.value as
																				| "additive"
																				| "multiplicative"
																				| "unlock"
																				| "instant",
																		}))
																	}
																	className="h-10 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-sm"
																>
																	<option value="additive">additive</option>
																	<option value="multiplicative">multiplicative</option>
																	<option value="unlock">unlock</option>
																	<option value="instant">instant</option>
																</select>
															</div>
															<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
																<select
																	value={item.targetActionCode}
																	onChange={(event) => {
																		const selected = actions.find((action) => action.code === event.target.value);
																		updateBlackMarketItem(item.id, (current) => ({
																			...current,
																			targetActionCode: event.target.value,
																			targetActionType: selected?.type ?? "",
																		}));
																	}}
																	className="h-10 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-sm"
																>
																	<option value="">Target action</option>
																	{actions.map((action) => (
																		<option key={action.id} value={action.code}>
																			{action.code} ({action.type})
																		</option>
																	))}
																</select>
																<select
																	value={item.targetActionType}
																	onChange={(event) =>
																		updateBlackMarketItem(item.id, (current) => ({
																			...current,
																			targetActionType: event.target.value as ActionKind | "",
																		}))
																	}
																	className="h-10 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-sm"
																>
																	<option value="">Target type</option>
																	<option value="attack">attack</option>
																	<option value="defense">defense</option>
																</select>
															</div>
															<textarea
																value={item.description}
																onChange={(event) =>
																	updateBlackMarketItem(item.id, (current) => ({
																		...current,
																		description: event.target.value,
																	}))
																}
																placeholder="Item description"
																className="w-full min-h-14 rounded-md border border-slate-700 bg-slate-950/80 p-2 text-sm"
															/>
															<div className="grid grid-cols-1 md:grid-cols-4 gap-2">
																<RangeField label="Value" min={1} max={200} value={item.value} onChange={(value) => updateBlackMarketItem(item.id, (current) => ({ ...current, value }))} />
																<RangeField label="Cost" min={1} max={400} value={item.cost} onChange={(value) => updateBlackMarketItem(item.id, (current) => ({ ...current, cost: value }))} />
																<RangeField label="Duration" min={1} max={10} value={item.durationTurns ?? 1} onChange={(value) => updateBlackMarketItem(item.id, (current) => ({ ...current, durationTurns: value }))} />
																<RangeField label="Available From Turn" min={1} max={20} value={item.availableFromTurn} onChange={(value) => updateBlackMarketItem(item.id, (current) => ({ ...current, availableFromTurn: value }))} />
															</div>
															<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
																<div className="space-y-1.5">
																	<Label className="text-xs">Stackable</Label>
																	<select
																		value={item.stackable ? "true" : "false"}
																		onChange={(event) =>
																			updateBlackMarketItem(item.id, (current) => ({
																				...current,
																				stackable: event.target.value === "true",
																			}))
																		}
																		className="w-full h-10 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-sm"
																	>
																		<option value="false">false</option>
																		<option value="true">true</option>
																	</select>
																</div>
																<div className="space-y-1.5">
																	<Label className="text-xs">Stock Limit (-1 = null)</Label>
																	<Input
																		type="number"
																		value={item.stockLimit ?? -1}
																		onChange={(event) =>
																			updateBlackMarketItem(item.id, (current) => ({
																				...current,
																				stockLimit:
																					Number(event.target.value) < 0
																						? null
																						: Number(event.target.value),
																			}))
																		}
																		className="bg-slate-950/80 border-slate-700"
																	/>
																</div>
																<div className="space-y-1.5">
																	<Label className="text-xs">Per Team Limit (-1 = null)</Label>
																	<Input
																		type="number"
																		value={item.perTeamLimit ?? -1}
																		onChange={(event) =>
																			updateBlackMarketItem(item.id, (current) => ({
																				...current,
																				perTeamLimit:
																					Number(event.target.value) < 0
																						? null
																						: Number(event.target.value),
																			}))
																		}
																		className="bg-slate-950/80 border-slate-700"
																	/>
																</div>
															</div>
														</div>
													))}
												</div>
											</div>
										</div>
									) : null}

									{currentStep === "review" ? (
										<div className="space-y-4">
											<div className="rounded-xl border border-emerald-700/40 bg-emerald-950/15 p-4">
												<div className="font-semibold text-emerald-200 mb-2">مرور نهایی</div>
												<p className="text-sm text-slate-300">
													اگر همه چیز درست است، configure_all را ارسال کنید. در سمت راست payload کامل را می‌بینید.
												</p>
												<Button
													onClick={submitConfigureAll}
													disabled={submitting}
													className="mt-4 bg-emerald-700 hover:bg-emerald-600 text-white"
												>
													{submitting ? "در حال ارسال..." : "ارسال configure_all"}
												</Button>
											</div>

											{lastResponse ? (
												<div className="rounded-xl border border-emerald-700/40 bg-black/40 p-3">
													<div className="font-semibold text-emerald-300 mb-2">Server Response</div>
													<pre className="text-xs whitespace-pre-wrap">
														{JSON.stringify(lastResponse, null, 2)}
													</pre>
												</div>
											) : null}
										</div>
									) : null}
								</motion.div>
							</AnimatePresence>
						</CardContent>
					</Card>

					<Card className="border-slate-700 bg-slate-900/75">
						<CardHeader>
							<CardTitle className="text-slate-200">Payload Preview</CardTitle>
						</CardHeader>
						<CardContent>
							<ScrollArea className="h-[760px] rounded-lg border border-slate-800 bg-black/45 p-3">
								<pre className="text-xs leading-6 text-emerald-200 font-mono whitespace-pre-wrap">
									{payloadPreview}
								</pre>
							</ScrollArea>
						</CardContent>
					</Card>
				</div>

				<div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/70 p-3">
					<Button
						variant="outline"
						className="border-slate-600"
						onClick={goPrev}
						disabled={currentStepIndex === 0}
					>
						<ArrowRight className="w-4 h-4 mr-2" />
						مرحله قبل
					</Button>
					<div className="text-sm text-slate-300">{STEP_TITLE[currentStep]}</div>
					<Button
						className="bg-cyan-700 hover:bg-cyan-600"
						onClick={goNext}
						disabled={currentStepIndex === STEP_ORDER.length - 1}
					>
						مرحله بعد
						<ArrowLeft className="w-4 h-4 ml-2" />
					</Button>
				</div>
			</div>
		</div>
	);
}
