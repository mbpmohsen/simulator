import { CommunicationMessageService } from "./service";
import type { CommunicationRepository } from "./types";
import { CommunicationHttpError } from "./types";

let servicePromise: Promise<CommunicationMessageService> | null = null;

const isServerless = (): boolean =>
	Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";

const useMongo = (): boolean => {
	const storage = process.env.COMMUNICATION_STORAGE?.toLowerCase();
	if (storage === "mongodb") return true;
	if (storage === "sqlite") return false;
	return Boolean(process.env.MONGODB_URI || process.env.MONGODB_HOST);
};

const createRepository = async (): Promise<CommunicationRepository> => {
	if (useMongo()) {
		// Loaded lazily so the driver is only pulled in when it is the backend.
		const { createMongoCommunicationRepository } = await import(
			"./mongoRepository"
		);
		return createMongoCommunicationRepository();
	}

	// SQLite writes to the local filesystem and keeps state in the process. On a
	// serverless host every invocation gets a fresh, ephemeral container, so
	// messages would silently vanish between requests. Fail loudly instead.
	if (isServerless()) {
		console.error(
			"[communication] SQLite storage cannot be used on a serverless deployment. " +
				"Set MONGODB_URI (and optionally MONGODB_DB_NAME), or set " +
				"COMMUNICATION_STORAGE=mongodb, in the deployment environment.",
		);
		throw new CommunicationHttpError(
			503,
			"COMMUNICATION_STORAGE_UNAVAILABLE",
			"ذخیره‌ساز پیام‌رسانی برای این استقرار پیکربندی نشده است. با مدیر سامانه تماس بگیرید.",
		);
	}

	// `node:sqlite` does not exist on every Node runtime. Importing it lazily
	// keeps a Mongo-backed deployment from ever resolving the module.
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
			"ذخیره‌ساز محلی پیام‌رسانی در دسترس نیست. Node 22 به بالا لازم است یا MONGODB_URI را تنظیم کنید.",
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
