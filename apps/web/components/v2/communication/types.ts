import type {
	CommunicationAudience,
	CommunicationMessageType,
} from "@workspace/trpc";

export interface RelatedGameNodeSelection {
	subjectId: string;
	scenarioId: string;
	stepId: string;
	eventSeq: string;
}

export interface CommunicationDraft {
	type: CommunicationMessageType;
	audience: CommunicationAudience;
	body: string;
	related: RelatedGameNodeSelection;
}

export interface CommunicationTargetOption {
	teamId: number;
	label: string;
}

export type SubmitCommunicationDraft = (
	draft: CommunicationDraft,
) => Promise<boolean>;

export const EMPTY_RELATED_GAME_NODE: RelatedGameNodeSelection = {
	subjectId: "",
	scenarioId: "",
	stepId: "",
	eventSeq: "",
};
