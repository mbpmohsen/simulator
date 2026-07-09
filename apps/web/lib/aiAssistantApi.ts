import type {
	AiAssistantConfigResponse,
	GameClientApi,
	PlayerAiLevelResponse,
	PlayerAiPurchaseResponse,
} from "@workspace/trpc";
import { createGameClientApi, createGameServerApi } from "@workspace/trpc";
import { parseRuntimeApiError } from "@/lib/apiErrorParser";

const CLIENT_BASE_URL = process.env.NEXT_PUBLIC_CLIENT_URL ?? "";

export type AiAssistantRoleContext = "player" | "government";

export type AiAssistantLevelState =
	| {
			status: "ready";
			level: PlayerAiLevelResponse;
			message: null;
	  }
	| {
			status: "unconfigured";
			level: null;
			message: string;
	  }
	| {
			status: "role_unsupported";
			level: null;
			message: string;
	  }
	| {
			status: "error";
			level: null;
			message: string;
	  };

export interface AiAssistantApi {
	getLevel(context: AiAssistantRoleContext): Promise<AiAssistantLevelState>;
	purchaseLevel(
		context: AiAssistantRoleContext,
	): Promise<PlayerAiPurchaseResponse>;
	getConfig(adminToken: string): Promise<AiAssistantConfigResponse>;
}

type AiAssistantClient = Pick<
	GameClientApi,
	"getPlayerAiLevel" | "purchasePlayerAiLevel"
>;

const unavailableMessage = "دستیار هوش مصنوعی برای این بازی فعال نیست.";
export const governmentAiEndpointRequiredMessage =
	"برای استفاده دولت از دستیار هوش مصنوعی، endpoint سطح دستیار دولت لازم است.";

export const createAiAssistantApi = (
	token: string,
	clientOverride?: AiAssistantClient,
): AiAssistantApi => {
	const client =
		clientOverride ??
		createGameClientApi({
			baseURL: CLIENT_BASE_URL,
			headers: token ? { Authorization: `Bearer ${token}` } : undefined,
		});

	return {
		async getLevel(context) {
			try {
				return {
					status: "ready",
					level: await client.getPlayerAiLevel(),
					message: null,
				};
			} catch (error) {
				const parsed = parseRuntimeApiError(
					error,
					"دریافت وضعیت دستیار هوش مصنوعی ممکن نشد.",
				);
				if (
					parsed.status === 404 &&
					(context === "player" || parsed.code === "AI_CONFIG_NOT_SET")
				) {
					return {
						status: "unconfigured",
						level: null,
						message: unavailableMessage,
					};
				}
				if (
					context === "government" &&
					(parsed.status === 401 || parsed.status === 403)
				) {
					return {
						status: "role_unsupported",
						level: null,
						message: governmentAiEndpointRequiredMessage,
					};
				}
				return {
					status: "error",
					level: null,
					message: parsed.message,
				};
			}
		},

		async purchaseLevel(context) {
			try {
				return await client.purchasePlayerAiLevel();
			} catch (error) {
				const parsed = parseRuntimeApiError(
					error,
					"خرید ارتقا دستیار هوش مصنوعی ناموفق بود.",
				);
				if (
					context === "government" &&
					(parsed.status === 401 || parsed.status === 403)
				) {
					throw new Error(governmentAiEndpointRequiredMessage);
				}
				throw new Error(parsed.message);
			}
		},

		getConfig(adminToken) {
			return createGameServerApi({
				baseURL: CLIENT_BASE_URL,
				adminToken,
			}).getAiAssistantConfig();
		},
	};
};
