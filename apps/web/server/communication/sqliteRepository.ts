import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { CommunicationMessage } from "@workspace/trpc";
import type {
	CommunicationRepository,
	CommunicationRepositoryQuery,
} from "./types";
import { CommunicationHttpError } from "./types";

interface CommunicationSqliteGlobals {
	databases?: Map<string, DatabaseSync>;
}

const sqliteGlobals = globalThis as typeof globalThis &
	CommunicationSqliteGlobals;

const defaultDatabasePath = (): string =>
	resolve(
		process.cwd(),
		process.env.COMMUNICATION_SQLITE_PATH ?? ".data/communication.sqlite",
	);

const getDatabase = (databasePath: string): DatabaseSync => {
	sqliteGlobals.databases ??= new Map<string, DatabaseSync>();
	const existing = sqliteGlobals.databases.get(databasePath);
	if (existing) return existing;

	try {
		mkdirSync(dirname(databasePath), { recursive: true });
		const database = new DatabaseSync(databasePath);
		database.exec(`
			PRAGMA journal_mode = WAL;
			PRAGMA busy_timeout = 5000;
			CREATE TABLE IF NOT EXISTS communication_messages (
				id TEXT PRIMARY KEY,
				game_id TEXT NOT NULL,
				room_id TEXT,
				created_at TEXT NOT NULL,
				sender_user_id INTEGER NOT NULL,
				audience_type TEXT NOT NULL,
				audience_id TEXT,
				status TEXT NOT NULL,
				message_json TEXT NOT NULL
			);
			CREATE INDEX IF NOT EXISTS communication_game_created_idx
				ON communication_messages (game_id, created_at, id);
			CREATE INDEX IF NOT EXISTS communication_audience_idx
				ON communication_messages (game_id, audience_type, audience_id, created_at);
		`);
		sqliteGlobals.databases.set(databasePath, database);
		return database;
	} catch {
		throw new CommunicationHttpError(
			503,
			"COMMUNICATION_STORAGE_UNAVAILABLE",
			"ذخیره‌ساز محلی پیام‌رسانی قابل دسترس نیست. مسیر COMMUNICATION_SQLITE_PATH را بررسی کنید.",
		);
	}
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
	value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;

const parseMessageRow = (value: unknown): CommunicationMessage | null => {
	const row = asRecord(value);
	if (typeof row?.message_json !== "string") return null;
	try {
		const message: unknown = JSON.parse(row.message_json);
		const candidate = asRecord(message);
		return typeof candidate?.id === "string" &&
			typeof candidate.game_id === "string" &&
			typeof candidate.body === "string" &&
			typeof candidate.created_at === "string"
			? (message as CommunicationMessage)
			: null;
	} catch {
		return null;
	}
};

const visibilitySql = (
	query: CommunicationRepositoryQuery,
	params: unknown[],
): string => {
	if (query.viewer.role === "ADMIN") return "";
	const clauses = ["sender_user_id = ?", "audience_type = 'all'"];
	params.push(query.viewer.userId);
	if (query.viewer.teamId !== null) {
		clauses.push("(audience_type = 'team' AND audience_id = ?)");
		params.push(String(query.viewer.teamId));
	}
	if (query.viewer.sideId !== null) {
		clauses.push("(audience_type = 'side' AND audience_id = ?)");
		params.push(String(query.viewer.sideId));
	}
	if (query.viewer.role === "GOVERNMENT" && query.viewer.teamId !== null) {
		clauses.push(
			"(audience_type = 'government' AND (audience_id IS NULL OR audience_id = ?))",
		);
		params.push(String(query.viewer.teamId));
	}
	return ` AND (${clauses.join(" OR ")})`;
};

export const createSqliteCommunicationRepository = (
	databasePath = defaultDatabasePath(),
): CommunicationRepository => ({
	async create(message) {
		try {
			const database = getDatabase(databasePath);
			database
				.prepare(`
					INSERT INTO communication_messages (
						id, game_id, room_id, created_at, sender_user_id,
						audience_type, audience_id, status, message_json
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				`)
				.run(
					message.id,
					message.game_id,
					message.room_id ?? null,
					message.created_at,
					message.sender_user_id,
					message.audience.type,
					message.audience.id === null || message.audience.id === undefined
						? null
						: String(message.audience.id),
					message.status,
					JSON.stringify(message),
				);
			return message;
		} catch (error) {
			if (error instanceof CommunicationHttpError) throw error;
			throw new CommunicationHttpError(
				503,
				"COMMUNICATION_WRITE_FAILED",
				"ذخیره پیام ممکن نشد. دوباره تلاش کنید.",
			);
		}
	},
	async listVisible(query) {
		try {
			const database = getDatabase(databasePath);
			const params: unknown[] = [query.gameId];
			let where = "game_id = ? AND status != 'hidden'";
			if (query.roomId) {
				where += " AND room_id = ?";
				params.push(query.roomId);
			}
			if (query.since && !Number.isNaN(Date.parse(query.since))) {
				where += " AND created_at >= ?";
				params.push(new Date(query.since).toISOString());
			}
			where += visibilitySql(query, params);
			params.push(query.limit);
			const rows = database
				.prepare(`
					SELECT message_json
					FROM communication_messages
					WHERE ${where}
					ORDER BY created_at ASC, id ASC
					LIMIT ?
				`)
				.all(...params);
			return rows.flatMap((row) => {
				const message = parseMessageRow(row);
				return message ? [message] : [];
			});
		} catch (error) {
			if (error instanceof CommunicationHttpError) throw error;
			throw new CommunicationHttpError(
				503,
				"COMMUNICATION_READ_FAILED",
				"دریافت پیام‌ها ممکن نشد. دوباره تلاش کنید.",
			);
		}
	},
});
