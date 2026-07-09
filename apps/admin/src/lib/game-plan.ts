import type {
	AdminUserSummary,
	AiAssistantConfigRequest,
	AiAssistantConfigResponse,
	ConfigureAllRequestV2,
	ConfigureAllResponse,
	GamePlanGraphResponse,
	GamePlanValidationResponse,
} from "@workspace/trpc";
import {
	createGameServerApi,
	normalizeDefaultGamePlan,
	validateDefaultGamePlanClientSide,
} from "@workspace/trpc";

export const ADMIN_TOKEN_STORAGE_KEY = "simulator-admin-token";
export const GAME_PLAN_SESSION_KEY = "simulator-v2-game-plan-draft";
export const ACTIVE_GAME_ID_STORAGE_KEY = "simulator-active-game-id";

const BASE_URL =
	process.env.NEXT_PUBLIC_CLIENT_URL ?? "https://game.darkube.ir";

export const getAdminToken = (): string => {
	if (typeof window === "undefined") return "";
	return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "";
};

const createAdminApi = (adminToken = getAdminToken()) =>
	createGameServerApi({
		baseURL: BASE_URL,
		adminToken,
	});

export const loginAdmin = async (password: string): Promise<string> => {
	const response = await createGameServerApi({ baseURL: BASE_URL }).adminLogin({
		password,
	});
	const root = response as unknown as Record<string, unknown>;
	const data =
		root.data && typeof root.data === "object"
			? (root.data as Record<string, unknown>)
			: null;
	const token =
		typeof data?.token === "string"
			? data.token
			: typeof root.access_token === "string"
				? root.access_token
				: typeof root.token === "string"
					? root.token
					: null;
	if (!token) throw new Error("توکن مدیریت در پاسخ سرور وجود ندارد.");
	if (typeof window !== "undefined") {
		window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
	}
	return token;
};

export const logoutAdmin = (): void => {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
};

export const listAdminUsers = async (
	adminToken = getAdminToken(),
	limit = 500,
): Promise<AdminUserSummary[]> => {
	const response = await createAdminApi(adminToken).listUsers({
		skip: 0,
		limit,
	});
	const root = response as unknown as Record<string, unknown>;
	const data =
		root.data && typeof root.data === "object"
			? (root.data as Record<string, unknown>)
			: null;
	const candidates = [root.users, root.items, data?.users, data?.items];
	for (const candidate of candidates) {
		if (!Array.isArray(candidate)) continue;
		return candidate.flatMap((entry) => {
			if (!entry || typeof entry !== "object") return [];
			const user = entry as Record<string, unknown>;
			if (typeof user.id !== "number" || typeof user.username !== "string") {
				return [];
			}
			return [
				{
					id: user.id,
					username: user.username,
					created_at: typeof user.created_at === "number" ? user.created_at : 0,
					updated_at: typeof user.updated_at === "number" ? user.updated_at : 0,
				},
			];
		});
	}
	return [];
};

export const loadDefaultGamePlan = async (): Promise<ConfigureAllRequestV2> => {
	const response = await fetch("/data/default-game-plan.json", {
		cache: "no-store",
	});
	if (!response.ok) throw new Error("دریافت سناریوی پیش‌فرض ممکن نشد.");
	return normalizeDefaultGamePlan(await response.json());
};

export { validateDefaultGamePlanClientSide };

export const validateGamePlanOnServer = (
	plan: ConfigureAllRequestV2,
): Promise<GamePlanValidationResponse> =>
	createAdminApi().validateGamePlan(plan);

export const submitDefaultGamePlan = (
	plan: ConfigureAllRequestV2,
): Promise<ConfigureAllResponse> => createAdminApi().configureAll(plan);

export const loadAiAssistantConfig = (): Promise<AiAssistantConfigResponse> =>
	createAdminApi().getAiAssistantConfig();

export const saveAiAssistantConfig = (
	levels: AiAssistantConfigRequest["levels"],
): Promise<AiAssistantConfigResponse> =>
	createAdminApi().setAiAssistantConfig({ levels });

export const startAdminGame = (gameId: string) =>
	createAdminApi().startGame(gameId);

export const storeActiveGameId = (gameId: string): void => {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(ACTIVE_GAME_ID_STORAGE_KEY, gameId);
};

export const getActiveGameId = (): string | null => {
	if (typeof window === "undefined") return null;
	return window.localStorage.getItem(ACTIVE_GAME_ID_STORAGE_KEY);
};

export const loadPublishedGamePlan = (): Promise<ConfigureAllRequestV2> =>
	createAdminApi().getGamePlan();

export const loadServerGamePlanGraph = (): Promise<GamePlanGraphResponse> =>
	createAdminApi().getGamePlanGraph();

export const storeGamePlanDraft = (plan: ConfigureAllRequestV2): void => {
	if (typeof window === "undefined") return;
	window.sessionStorage.setItem(GAME_PLAN_SESSION_KEY, JSON.stringify(plan));
};

export const loadStoredGamePlanDraft = (): ConfigureAllRequestV2 | null => {
	if (typeof window === "undefined") return null;
	const raw = window.sessionStorage.getItem(GAME_PLAN_SESSION_KEY);
	if (!raw) return null;
	try {
		return normalizeDefaultGamePlan(JSON.parse(raw) as unknown);
	} catch {
		return null;
	}
};
