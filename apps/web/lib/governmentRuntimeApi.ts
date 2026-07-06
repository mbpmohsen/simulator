import type {
	GameClientApi,
	GoalSelectResponse,
	GovernmentCatalogResponse,
	GovernmentOrder,
	GovernmentOrderResultResponse,
	GovernmentOverviewResponse,
	GovernmentTeamProgress,
	LockReasonsResponse,
	OrderView,
} from "@workspace/trpc";
import { createGameClientApi } from "@workspace/trpc";
import { parseRuntimeApiError } from "@/lib/apiErrorParser";
import {
	loadRuntimeApiContext,
	type RuntimeApiContext,
} from "@/lib/runtimeApiContext";

const BASE_URL = process.env.NEXT_PUBLIC_CLIENT_URL ?? "";

export interface GovernmentRuntimeApi {
	selectGoal(goalId: string): Promise<GoalSelectResponse>;
	getCatalog(): Promise<GovernmentCatalogResponse>;
	getOverview(): Promise<GovernmentOverviewResponse>;
	getTeamProgress(teamId: number): Promise<GovernmentTeamProgress>;
	issueOrder(order: GovernmentOrder): Promise<GovernmentOrderResultResponse>;
	getOrders(turn?: number): Promise<OrderView[]>;
	getLockReasons(teamId: number, nodeId: string): Promise<LockReasonsResponse>;
	getRuntimeContext(): Promise<RuntimeApiContext>;
}

export interface GovernmentOrderDraft {
	type: GovernmentOrder["order_type"];
	teamId: number;
	subjectId: string;
	actionCode: string;
	amount: number;
	duration: number;
	reason: string;
}

export const getGovernmentCatalogErrorMessageFa = (error: unknown): string => {
	const parsed = parseRuntimeApiError(error, "دریافت کاتالوگ دولت ناموفق بود.");
	if (parsed.status === 403)
		return "شما دسترسی دولت برای مشاهده کاتالوگ ندارید.";
	if (parsed.status === 404) return "کاتالوگ دولت برای بازی فعال پیدا نشد.";
	return "دریافت کاتالوگ دولت ناموفق بود.";
};

export const buildGovernmentOrder = (
	input: GovernmentOrderDraft,
): GovernmentOrder => {
	switch (input.type) {
		case "ASSIGN_SUBJECT":
		case "FORCE_SUBJECT":
			return {
				order_type: input.type,
				target_team_id: input.teamId,
				payload: { subject_id: input.subjectId },
			};
		case "ALLOCATE_CREDIT":
			return {
				order_type: input.type,
				target_team_id: input.teamId,
				payload: { amount: input.amount },
			};
		case "BAN_ACTION":
			return {
				order_type: input.type,
				target_team_id: input.teamId,
				payload: { action_code: input.actionCode, duration: input.duration },
			};
		case "UNBAN_ACTION":
			return {
				order_type: input.type,
				target_team_id: input.teamId,
				payload: { action_code: input.actionCode },
			};
		case "DISABLE_TEAM":
			return {
				order_type: input.type,
				target_team_id: input.teamId,
				payload: {
					duration: input.duration,
					reason: input.reason || undefined,
				},
			};
		case "ENABLE_TEAM":
			return {
				order_type: input.type,
				target_team_id: input.teamId,
				payload: {},
			};
	}
};

export const createGovernmentRuntimeApi = (
	token: string,
): GovernmentRuntimeApi => {
	const client: GameClientApi = createGameClientApi({
		baseURL: BASE_URL,
		headers: token ? { Authorization: `Bearer ${token}` } : undefined,
	});
	return {
		selectGoal: (goalId) => client.selectGovernmentGoal(goalId),
		getCatalog: () => client.getGovernmentCatalog(),
		getOverview: () => client.getGovernmentOverview(),
		getTeamProgress: (teamId) => client.getGovernmentTeamProgress(teamId),
		issueOrder: (order) => client.issueGovernmentOrder(order),
		getOrders: (turn) => client.getGovernmentOrders(turn),
		getLockReasons: (teamId, nodeId) =>
			client.getGovernmentLockReasons(teamId, nodeId),
		getRuntimeContext: () => loadRuntimeApiContext(client),
	};
};
