import type { CommunicationMessage } from "@workspace/trpc";
import {
	type Collection,
	type Filter,
	MongoClient,
	type WithId,
} from "mongodb";
import type {
	CommunicationRepository,
	CommunicationRepositoryQuery,
} from "./types";
import { CommunicationHttpError } from "./types";

type CommunicationMessageDocument = CommunicationMessage;

// Cached on globalThis, matching the SQLite backend's pattern. Module-scoped
// state is re-created on every hot reload in dev and on every re-evaluation of
// the module, which leaks connections against a connection-limited cluster.
interface CommunicationMongoGlobals {
	communicationMongoClient?: Promise<MongoClient> | null;
	communicationMongoIndexes?: Promise<void> | null;
}

const mongoGlobals = globalThis as typeof globalThis &
	CommunicationMongoGlobals;

/**
 * MONGODB_URI wins when present. Credentials already inside it are left alone;
 * otherwise MONGODB_USER / MONGODB_PASSWORD are injected, since supplying those
 * separately is a common deployment convention and silently ignoring them
 * produces an authentication failure that is hard to trace.
 */
const buildConnectionUri = (): string => {
	const raw =
		process.env.MONGODB_URI ??
		`mongodb://${process.env.MONGODB_HOST ?? "mongodb"}:${process.env.MONGODB_PORT ?? "27017"}`;
	const user = process.env.MONGODB_USER ?? process.env.MONGODB_USERNAME;
	const password = process.env.MONGODB_PASSWORD;
	if (!user || !password) return raw;
	const separator = raw.indexOf("://");
	if (separator === -1) return raw;
	const scheme = raw.slice(0, separator);
	const rest = raw.slice(separator + 3);
	// An "@" before the first "/" means the URI already carries credentials.
	const hostPart = rest.split("/")[0] ?? "";
	if (hostPart.includes("@")) return raw;
	return `${scheme}://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${rest}`;
};

const getCollection = async (): Promise<
	Collection<CommunicationMessageDocument>
> => {
	mongoGlobals.communicationMongoClient ??= new MongoClient(
		buildConnectionUri(),
	).connect();
	let client: MongoClient;
	try {
		client = await mongoGlobals.communicationMongoClient;
	} catch {
		mongoGlobals.communicationMongoClient = null;
		throw new CommunicationHttpError(
			503,
			"COMMUNICATION_STORAGE_UNAVAILABLE",
			"اتصال پیام‌رسانی برقرار نیست. دوباره تلاش کنید.",
		);
	}
	const collection = client
		.db(process.env.MONGODB_DB_NAME ?? "game_db")
		.collection<CommunicationMessageDocument>("communication_messages");
	mongoGlobals.communicationMongoIndexes ??= Promise.all([
		collection.createIndex({ game_id: 1, created_at: 1, id: 1 }),
		collection.createIndex({
			game_id: 1,
			"audience.type": 1,
			"audience.id": 1,
			created_at: 1,
		}),
		collection.createIndex({ id: 1 }, { unique: true }),
	]).then(() => undefined);
	try {
		await mongoGlobals.communicationMongoIndexes;
	} catch {
		mongoGlobals.communicationMongoIndexes = null;
		throw new CommunicationHttpError(
			503,
			"COMMUNICATION_STORAGE_UNAVAILABLE",
			"آماده‌سازی ذخیره‌ساز پیام‌رسانی ممکن نشد.",
		);
	}
	return collection;
};

const withoutMongoId = (
	document: WithId<CommunicationMessageDocument>,
): CommunicationMessage => {
	const { _id: _ignored, ...message } = document;
	return message;
};

const visibilityClauses = (
	query: CommunicationRepositoryQuery,
): Filter<CommunicationMessageDocument>[] => {
	const { viewer } = query;
	const clauses: Filter<CommunicationMessageDocument>[] = [
		{ sender_user_id: viewer.userId },
		{ "audience.type": "all" },
	];
	if (viewer.teamId !== null) {
		clauses.push({
			"audience.type": "team",
			"audience.id": { $in: [viewer.teamId, String(viewer.teamId)] },
		});
	}
	if (viewer.sideId !== null) {
		clauses.push({
			"audience.type": "side",
			"audience.id": { $in: [viewer.sideId, String(viewer.sideId)] },
		});
	}
	if (viewer.role === "GOVERNMENT" && viewer.teamId !== null) {
		clauses.push({
			"audience.type": "government",
			$or: [
				{ "audience.id": { $exists: false } },
				{ "audience.id": null },
				{ "audience.id": { $in: [viewer.teamId, String(viewer.teamId)] } },
			],
		});
	}
	return clauses;
};

export const createMongoCommunicationRepository =
	(): CommunicationRepository => ({
		async create(message) {
			const collection = await getCollection();
			try {
				await collection.insertOne(message);
				return message;
			} catch {
				throw new CommunicationHttpError(
					503,
					"COMMUNICATION_WRITE_FAILED",
					"ذخیره پیام ممکن نشد. دوباره تلاش کنید.",
				);
			}
		},
		async listVisible(query) {
			const collection = await getCollection();
			const filter: Filter<CommunicationMessageDocument> = {
				game_id: query.gameId,
				status: { $ne: "hidden" },
			};
			if (query.roomId) filter.room_id = query.roomId;
			if (query.since && !Number.isNaN(Date.parse(query.since))) {
				filter.created_at = { $gte: new Date(query.since).toISOString() };
			}
			if (query.viewer.role !== "ADMIN") {
				filter.$or = visibilityClauses(query);
			}
			try {
				const documents = await collection
					.find(filter)
					.sort({ created_at: 1, id: 1 })
					.limit(query.limit)
					.toArray();
				return documents.map(withoutMongoId);
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
