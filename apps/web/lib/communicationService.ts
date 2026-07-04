import type {
	CommunicationMessage,
	CommunicationSendInput,
	CommunicationService,
	TeamRoleType,
} from "@workspace/trpc";

interface CommunicationServiceOptions {
	gameId: string;
	senderUserId: number;
	senderTeamId: number;
	senderRole: TeamRoleType | "ADMIN";
	turn: number;
}

const EVENT_NAME = "simulator-local-communication";
const bus = typeof window === "undefined" ? null : new EventTarget();
const storageKey = (gameId: string): string =>
	`simulator-communication:${gameId}`;

const readLocalMessages = (gameId: string): CommunicationMessage[] => {
	if (typeof window === "undefined") return [];
	const raw = window.localStorage.getItem(storageKey(gameId));
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		return Array.isArray(parsed) ? (parsed as CommunicationMessage[]) : [];
	} catch {
		return [];
	}
};

const writeLocalMessages = (
	gameId: string,
	messages: CommunicationMessage[],
): void => {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(
		storageKey(gameId),
		JSON.stringify(messages.slice(-200)),
	);
};

export const createLocalCommunicationService = (
	options: CommunicationServiceOptions,
): CommunicationService => ({
	mode: "mock",
	async listMessages(params) {
		return readLocalMessages(params.gameId).slice(-(params.limit ?? 100));
	},
	async sendMessage(input: CommunicationSendInput) {
		const simulationLabel =
			input.type === "FAKE_NEWS_SIMULATION" ||
			input.type === "THREAT_SIMULATION";
		const message: CommunicationMessage = {
			id: crypto.randomUUID(),
			game_id: input.gameId,
			turn: options.turn,
			type: input.type,
			sender_user_id: options.senderUserId,
			sender_team_id: options.senderTeamId,
			sender_role: options.senderRole,
			audience: input.audience,
			body: input.body,
			simulation_label: simulationLabel,
			related_subject_id: input.related_subject_id,
			related_sub_subject_id: input.related_sub_subject_id,
			related_scenario_id: input.related_scenario_id,
			related_step_id: input.related_step_id,
			related_event_seq: input.related_event_seq,
			created_at: new Date().toISOString(),
			status: "sent",
		};
		writeLocalMessages(input.gameId, [
			...readLocalMessages(input.gameId),
			message,
		]);
		bus?.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: message }));
		return message;
	},
	subscribeMessages({ gameId, onMessage }) {
		if (!bus) return () => undefined;
		const listener = (event: Event): void => {
			const message = (event as CustomEvent<CommunicationMessage>).detail;
			if (message.game_id === gameId) onMessage(message);
		};
		bus.addEventListener(EVENT_NAME, listener);
		return () => bus.removeEventListener(EVENT_NAME, listener);
	},
});

export const COMMUNICATION_BACKEND_NOTICE =
	"API پیام‌رسانی آزاد در قرارداد backend موجود نیست؛ پیام‌های این پنل فقط در حالت توسعه و در مرورگر ذخیره می‌شوند.";
