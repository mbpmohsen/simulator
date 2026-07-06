import { createMongoCommunicationRepository } from "./mongoRepository";
import { CommunicationMessageService } from "./service";
import { createSqliteCommunicationRepository } from "./sqliteRepository";

let service: CommunicationMessageService | null = null;

const createCommunicationRepository = () => {
	const storage = process.env.COMMUNICATION_STORAGE?.toLowerCase();
	const mongoConfigured = Boolean(
		process.env.MONGODB_URI || process.env.MONGODB_HOST,
	);
	if (storage === "mongodb" || (storage !== "sqlite" && mongoConfigured)) {
		return createMongoCommunicationRepository();
	}
	return createSqliteCommunicationRepository();
};

export const getCommunicationMessageService =
	(): CommunicationMessageService => {
		service ??= new CommunicationMessageService(
			createCommunicationRepository(),
		);
		return service;
	};

export { resolveCommunicationActor } from "./auth";
export { CommunicationHttpError } from "./types";
