import { CommunicationMessageService } from "./service";
import type { CommunicationRepository } from "./types";
import { CommunicationHttpError } from "./types";

let servicePromise: Promise<CommunicationMessageService> | null = null;

type StorageBackend = "turso" | "mongodb" | "sqlite";

const isServerless = (): boolean =>
	Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";

/**
 * An explicit COMMUNICATION_STORAGE always wins. Otherwise the presence of a
 * connection string decides, so a deployment only has to set the credentials
 * for the store it actually uses. Local development falls through to SQLite.
 */
const selectBackend = (): StorageBackend => {
	const storage = process.env.COMMUNICATION_STORAGE?.toLowerCase();
	if (storage === "turso" || storage === "libsql") return "turso";
	if (storage === "mongodb") return "mongodb";
	if (storage === "sqlite") return "sqlite";
	if (process.env.TURSO_DATABASE_URL) return "turso";
	if (process.env.MONGODB_URI || process.env.MONGODB_HOST) return "mongodb";
	return "sqlite";
};

const createRepository = async (): Promise<CommunicationRepository> => {
	// Each backend is loaded lazily so a deployment never resolves a driver it
	// does not use - node:sqlite in particular does not exist on every runtime.
	switch (selectBackend()) {
		case "turso": {
			const { createTursoCommunicationRepository } = await import(
				"./tursoRepository"
			);
			return createTursoCommunicationRepository();
		}
		case "mongodb": {
			const { createMongoCommunicationRepository } = await import(
				"./mongoRepository"
			);
			return createMongoCommunicationRepository();
		}
		default:
			break;
	}

	// SQLite writes to the local filesystem and keeps state in the process. On a
	// serverless host every invocation gets a fresh, ephemeral container, so
	// messages would silently vanish between requests - and two concurrent
	// requests would not even share a file. Fail loudly instead.
	if (isServerless()) {
		console.error(
			"[communication] SQLite storage cannot be used on a serverless deployment. " +
				"Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (hosted libSQL - same SQL, " +
				"reached over HTTP), or MONGODB_URI, in the deployment environment.",
		);
		throw new CommunicationHttpError(
			503,
			"COMMUNICATION_STORAGE_UNAVAILABLE",
			"ذخیره‌ساز پیام‌رسانی برای این استقرار پیکربندی نشده است. با مدیر سامانه تماس بگیرید.",
		);
	}

	try {
		const { createSqliteCommunicationRepository } = await import(
			"./sqliteRepository"
		);
		return createSqliteCommunicationRepository();
	} catch (error) {
		console.error("[communication] failed to load the SQLite backend", error);
		throw new CommunicationHttpError(
			503,
			"COMMUNICATION_STORAGE_UNAVAILABLE",
			"ذخیره‌ساز محلی پیام‌رسانی در دسترس نیست. Node 22 به بالا لازم است یا TURSO_DATABASE_URL را تنظیم کنید.",
		);
	}
};

export const getCommunicationMessageService =
	async (): Promise<CommunicationMessageService> => {
		servicePromise ??= createRepository()
			.then((repository) => new CommunicationMessageService(repository))
			.catch((error) => {
				// Never cache a failed init - the next request should retry.
				servicePromise = null;
				throw error;
			});
		return servicePromise;
	};

export { resolveCommunicationActor } from "./auth";
export { CommunicationHttpError } from "./types";
