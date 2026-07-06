import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createServerCommunicationService } from "@/lib/communicationService";
import { CommunicationMessageService } from "@/server/communication/service";
import { createSqliteCommunicationRepository } from "@/server/communication/sqliteRepository";
import type {
	CommunicationActor,
	CommunicationRepository,
	CommunicationRepositoryQuery,
} from "@/server/communication/types";
import type {
	CommunicationMessage,
	CommunicationService,
} from "./communication";
import { isCommunicationVisibleToViewer } from "./communication";

class TestCommunicationRepository implements CommunicationRepository {
	readonly messages: CommunicationMessage[] = [];

	async create(message: CommunicationMessage): Promise<CommunicationMessage> {
		this.messages.push(structuredClone(message));
		return structuredClone(message);
	}

	async listVisible(
		query: CommunicationRepositoryQuery,
	): Promise<CommunicationMessage[]> {
		return this.messages
			.filter((message) => message.game_id === query.gameId)
			.filter((message) => !query.roomId || message.room_id === query.roomId)
			.filter(
				(message) =>
					!query.since ||
					Date.parse(message.created_at) >= Date.parse(query.since),
			)
			.filter(
				(message) =>
					query.viewer.role === "ADMIN" ||
					isCommunicationVisibleToViewer(message, {
						userId: query.viewer.userId,
						teamId: query.viewer.teamId,
						sideId: query.viewer.sideId,
						role: query.viewer.role,
					}),
			)
			.slice(0, query.limit)
			.map((message) => structuredClone(message));
	}
}

const teams: CommunicationActor["teams"] = [
	{ id: 101, sideId: 10, role: "ATTACKER" },
	{ id: 102, sideId: 10, role: "DEFENCER" },
	{ id: 199, sideId: 10, role: "GOVERNMENT" },
	{ id: 201, sideId: 20, role: "ATTACKER" },
	{ id: 299, sideId: 20, role: "GOVERNMENT" },
];

const actor = (
	overrides: Partial<CommunicationActor> = {},
): CommunicationActor => ({
	userId: 1,
	teamId: 101,
	sideId: 10,
	role: "ATTACKER",
	gameId: "game-1",
	turn: 2,
	phase: "VOTING",
	teams,
	permissions: {
		allowPublicAnnouncements: false,
		allowPlayerEnemyMessaging: false,
	},
	...overrides,
});

const teamChatInput = (teamId = 101) => ({
	gameId: "game-1",
	type: "TEAM_CHAT" as const,
	audience: { type: "team" as const, id: teamId },
	body: "هماهنگی تیمی",
});

describe("server-backed communication permissions and persistence", () => {
	it("allows a player to send TEAM_CHAT to their own team", async () => {
		const service = new CommunicationMessageService(
			new TestCommunicationRepository(),
		);
		const message = await service.create(actor(), teamChatInput());
		expect(message.audience).toEqual({ type: "team", id: 101 });
		expect(message.status).toBe("delivered");
	});

	it("rejects a player message addressed to an enemy team", async () => {
		const service = new CommunicationMessageService(
			new TestCommunicationRepository(),
		);
		await expect(
			service.create(actor(), teamChatInput(201)),
		).rejects.toMatchObject({
			status: 403,
			code: "PLAYER_TEAM_CHAT_FORBIDDEN",
		});
	});

	it("allows Government to message a team on its own side", async () => {
		const service = new CommunicationMessageService(
			new TestCommunicationRepository(),
		);
		const message = await service.create(
			actor({ userId: 9, teamId: 199, role: "GOVERNMENT" }),
			{
				gameId: "game-1",
				type: "GOVERNMENT_TO_OWN_TEAM",
				audience: { type: "team", id: 102 },
				body: "پیام دولت",
			},
		);
		expect(message.sender_role).toBe("GOVERNMENT");
		expect(message.audience.id).toBe(102);
	});

	it("marks Government fake-news and threat messages as simulation", async () => {
		const service = new CommunicationMessageService(
			new TestCommunicationRepository(),
		);
		const government = actor({
			userId: 9,
			teamId: 199,
			role: "GOVERNMENT",
		});
		for (const type of ["FAKE_NEWS_SIMULATION", "THREAT_SIMULATION"] as const) {
			const message = await service.create(government, {
				gameId: "game-1",
				type,
				audience: { type: "all" },
				body: "هشدار امن و سناریویی",
			});
			expect(message.simulation_label).toBe(true);
		}
	});

	it("allows Admin to read all messages in a game", async () => {
		const repository = new TestCommunicationRepository();
		const service = new CommunicationMessageService(repository);
		await service.create(actor({ userId: 1 }), teamChatInput(101));
		await service.create(actor({ userId: 2, teamId: 201, sideId: 20 }), {
			...teamChatInput(201),
			body: "پیام تیم دیگر",
		});
		const messages = await service.list(
			actor({
				userId: 0,
				teamId: null,
				sideId: null,
				role: "ADMIN",
			}),
			{ gameId: "game-1", limit: 100 },
		);
		expect(messages).toHaveLength(2);
	});

	it("rejects an empty message", async () => {
		const service = new CommunicationMessageService(
			new TestCommunicationRepository(),
		);
		await expect(
			service.create(actor(), { ...teamChatInput(), body: "   " }),
		).rejects.toMatchObject({ status: 400, code: "EMPTY_MESSAGE" });
	});

	it("persists messages across service recreation and page-style refresh", async () => {
		const directory = mkdtempSync(join(tmpdir(), "simulator-communication-"));
		const databasePath = join(directory, "communication.sqlite");
		try {
			await new CommunicationMessageService(
				createSqliteCommunicationRepository(databasePath),
			).create(actor(), teamChatInput());
			const messages = await new CommunicationMessageService(
				createSqliteCommunicationRepository(databasePath),
			).list(actor(), { gameId: "game-1", limit: 100 });
			expect(messages).toHaveLength(1);
		} finally {
			rmSync(directory, { force: true, recursive: true });
		}
	});

	it("lets two simulated team clients read the same stored message", async () => {
		const repository = new TestCommunicationRepository();
		const service = new CommunicationMessageService(repository);
		await service.create(actor({ userId: 1 }), teamChatInput());
		const teammateMessages = await service.list(actor({ userId: 2 }), {
			gameId: "game-1",
			limit: 100,
		});
		expect(teammateMessages[0]?.body).toBe("هماهنگی تیمی");
	});
});

describe("communication polling client", () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("receives a newly created server message on the next poll", async () => {
		vi.useFakeTimers();
		const message: CommunicationMessage = {
			id: "message-1",
			game_id: "game-1",
			turn: 2,
			phase: "VOTING",
			type: "TEAM_CHAT",
			sender_user_id: 2,
			sender_team_id: 101,
			sender_side_id: 10,
			sender_role: "ATTACKER",
			audience: { type: "team", id: 101 },
			body: "پیام تازه",
			status: "delivered",
			created_at: new Date().toISOString(),
		};
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(JSON.stringify([message]), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					}),
			),
		);
		const service: CommunicationService = createServerCommunicationService({
			token: "token",
			gameId: "game-1",
			senderUserId: 1,
			senderTeamId: 101,
			senderSideId: 10,
			senderRole: "ATTACKER",
			turn: 2,
			phase: "VOTING",
		});
		const received: CommunicationMessage[] = [];
		const unsubscribe = service.subscribeMessages({
			gameId: "game-1",
			onMessage: (nextMessage) => received.push(nextMessage),
		});
		await vi.advanceTimersByTimeAsync(2500);
		expect(received).toEqual([message]);
		unsubscribe();
	});
});
