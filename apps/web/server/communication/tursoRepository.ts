import { createClient } from "@tursodatabase/serverless/compat";
import type { CommunicationMessage } from "@workspace/trpc";
import type {
	CommunicationRepository,
	CommunicationRepositoryQuery,
} from "./types";
import { CommunicationHttpError } from "./types";

/**
 * Turso (libSQL) backend for the communication log.
 *
 * This is the same SQLite schema and the same SQL as `sqliteRepository`, but
 * reached over HTTP instead of the local filesystem. That difference is the
 * whole point: a serverless host gives every invocation a fresh, ephemeral
 * container, so a `.sqlite` file on disk is lost between requests and is not
 * shared between two concurrent lambdas. A hosted libSQL database is.
 *
 * `@tursodatabase/serverless` is `fetch`-only with no native bindings, so it
 * survives the Vercel bundler untouched.
 */

type LibsqlClient = ReturnType<typeof createClient>;
type SqlArg = string | number | null;

interface TursoGlobals {
	communicationTursoClient?: LibsqlClient;
	communicationTursoReady?: Promise<LibsqlClient>;
}

const tursoGlobals = globalThis as typeof globalThis & TursoGlobals;

const SCHEMA_STATEMENTS = [
	`CREATE TABLE IF NOT EXISTS communication_messages (
		id TEXT PRIMARY KEY,
		game_id TEXT NOT NULL,
		room_id TEXT,
		created_at TEXT NOT NULL,
		sender_user_id INTEGER NOT NULL,
		audience_type TEXT NOT NULL,
		audience_id TEXT,
		status TEXT NOT NULL,
		message_json TEXT NOT NULL
	)`,
	`CREATE INDEX IF NOT EXISTS communication_game_created_idx
		ON communication_messages (game_id, created_at, id)`,
	`CREATE INDEX IF NOT EXISTS communication_audience_idx
		ON communication_messages (game_id, audience_type, audience_id, created_at)`,
];

const readConfig = (): { url: string; authToken: string | undefined } => {
	const url = process.env.TURSO_DATABASE_URL?.trim();
	if (!url) {
		throw new CommunicationHttpError(
			503,
			"COMMUNICATION_STORAGE_UNAVAILABLE",
			"آدرس پایگاه‌داده پیام‌رسانی تنظیم نشده است. متغیر TURSO_DATABASE_URL را مقداردهی کنید.",
		);
	}
	// A remote Turso database always needs a token; only an embedded file: URL
	// does not, and that is not a configuration this backend supports.
	const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;
	if (!authToken && !url.startsWith("file:")) {
		throw new CommunicationHttpError(
			503,
			"COMMUNICATION_STORAGE_UNAVAILABLE",
			"توکن پایگاه‌داده پیام‌رسانی تنظیم نشده است. متغیر TURSO_AUTH_TOKEN را مقداردهی کنید.",
		);
	}
	return { url, authToken };
};

/**
 * Creates the client and the schema at most once per warm container. The
 * promise itself is cached so concurrent first requests share one bootstrap
 * rather than racing three `CREATE TABLE` round-trips.
 */
const getClient = async (): Promise<LibsqlClient> => {
	if (tursoGlobals.communicationTursoClient) {
		return tursoGlobals.communicationTursoClient;
	}
	tursoGlobals.communicationTursoReady ??= (async () => {
		const { url, authToken } = readConfig();
		const client = createClient({ url, authToken });
		await client.batch(
			SCHEMA_STATEMENTS.map((sql) => ({ sql, args: [] })),
			"write",
		);
		tursoGlobals.communicationTursoClient = client;
		return client;
	})().catch((error: unknown) => {
		// Never cache a failed bootstrap - the next request should retry.
		tursoGlobals.communicationTursoReady = undefined;
		if (error instanceof CommunicationHttpError) throw error;
		console.error("[communication] Turso bootstrap failed", error);
		throw new CommunicationHttpError(
			503,
			"COMMUNICATION_STORAGE_UNAVAILABLE",
			"اتصال به پایگاه‌داده پیام‌رسانی برقرار نشد. تنظیمات TURSO_DATABASE_URL و TURSO_AUTH_TOKEN را بررسی کنید.",
		);
	});
	return tursoGlobals.communicationTursoReady;
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

/** Mirrors the SQLite backend exactly, so both stores enforce one policy. */
const visibilitySql = (
	query: CommunicationRepositoryQuery,
	params: SqlArg[],
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

export const createTursoCommunicationRepository =
	(): CommunicationRepository => ({
		async create(message) {
			try {
				const client = await getClient();
				await client.execute({
					sql: `
						INSERT INTO communication_messages (
							id, game_id, room_id, created_at, sender_user_id,
							audience_type, audience_id, status, message_json
						) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
					`,
					args: [
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
					],
				});
				return message;
			} catch (error) {
				if (error instanceof CommunicationHttpError) throw error;
				console.error("[communication] Turso write failed", error);
				throw new CommunicationHttpError(
					503,
					"COMMUNICATION_WRITE_FAILED",
					"ذخیره پیام ممکن نشد. دوباره تلاش کنید.",
				);
			}
		},

		async listVisible(query) {
			try {
				const client = await getClient();
				const params: SqlArg[] = [query.gameId];
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

				const result = await client.execute({
					sql: `
						SELECT message_json
						FROM communication_messages
						WHERE ${where}
						ORDER BY created_at ASC, id ASC
						LIMIT ?
					`,
					args: params,
				});
				return result.rows.flatMap((row) => {
					const message = parseMessageRow(row);
					return message ? [message] : [];
				});
			} catch (error) {
				if (error instanceof CommunicationHttpError) throw error;
				console.error("[communication] Turso read failed", error);
				throw new CommunicationHttpError(
					503,
					"COMMUNICATION_READ_FAILED",
					"دریافت پیام‌ها ممکن نشد. دوباره تلاش کنید.",
				);
			}
		},
	});
