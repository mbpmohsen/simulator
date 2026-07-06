"use client";

import type {
	CommunicationAudience,
	CommunicationMessageType,
} from "@workspace/trpc";
import { Button } from "@workspace/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { Send } from "lucide-react";
import { useState } from "react";
import { COMMUNICATION_MESSAGE_LABELS } from "@/lib/communicationTranslationsFa";
import { MessageTargetSelector } from "./MessageTargetSelector";
import { RelatedGameNodePicker } from "./RelatedGameNodePicker";
import type {
	CommunicationTargetOption,
	RelatedGameNodeSelection,
	SubmitCommunicationDraft,
} from "./types";

const GOVERNMENT_CHANNEL_TYPES: CommunicationMessageType[] = [
	"GOVERNMENT_TO_OWN_TEAM",
	"GOVERNMENT_TO_ALLIED_SIDE",
	"GOVERNMENT_TO_ENEMY_GOVERNMENT",
	"GOVERNMENT_TO_ENEMY_TEAM",
];

const audienceForType = (
	type: CommunicationMessageType,
	ownSideId: number | undefined,
	ownSideTeams: CommunicationTargetOption[],
): CommunicationAudience => {
	if (type === "GOVERNMENT_TO_OWN_TEAM") {
		return { type: "team", id: ownSideTeams[0]?.teamId };
	}
	if (type === "GOVERNMENT_TO_ALLIED_SIDE") {
		return { type: "side", id: ownSideId };
	}
	if (type === "GOVERNMENT_TO_ENEMY_GOVERNMENT") {
		return { type: "government" };
	}
	return { type: "team" };
};

export function GovernmentChannel({
	ownTeamId,
	ownSideId,
	ownSideTeams,
	related,
	onRelatedChange,
	onSend,
	sending,
}: {
	ownTeamId: number;
	ownSideId?: number;
	ownSideTeams: CommunicationTargetOption[];
	related: RelatedGameNodeSelection;
	onRelatedChange: (value: RelatedGameNodeSelection) => void;
	onSend: SubmitCommunicationDraft;
	sending: boolean;
}) {
	const [type, setType] = useState<CommunicationMessageType>(
		"GOVERNMENT_TO_OWN_TEAM",
	);
	const [audience, setAudience] = useState<CommunicationAudience>(() =>
		audienceForType("GOVERNMENT_TO_OWN_TEAM", ownSideId, ownSideTeams),
	);
	const [body, setBody] = useState("");

	const changeType = (nextType: CommunicationMessageType): void => {
		setType(nextType);
		setAudience(audienceForType(nextType, ownSideId, ownSideTeams));
	};
	const submit = async (): Promise<void> => {
		const sent = await onSend({ type, audience, body, related });
		if (sent) setBody("");
	};

	return (
		<div className="space-y-3">
			<div>
				<h3 className="text-sm font-semibold text-slate-100">کانال دولت</h3>
				<p className="mt-1 text-xs text-slate-500">
					گیرنده بر اساس نوع کانال و سمت فعال کنترل می‌شود.
				</p>
			</div>
			<Select
				value={type}
				onValueChange={(value) => changeType(value as CommunicationMessageType)}
			>
				<SelectTrigger className="border-white/10 bg-white/5">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{GOVERNMENT_CHANNEL_TYPES.map((item) => (
						<SelectItem key={item} value={item}>
							{COMMUNICATION_MESSAGE_LABELS[item]}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<MessageTargetSelector
				type={type}
				value={audience}
				onChange={setAudience}
				ownTeamId={ownTeamId}
				ownSideId={ownSideId}
				ownSideTeams={ownSideTeams}
			/>
			<Textarea
				value={body}
				onChange={(event) => setBody(event.target.value)}
				maxLength={1000}
				placeholder="پیام عملیاتی درون‌بازی را بنویسید…"
				className="min-h-24 border-white/10 bg-slate-950"
			/>
			<RelatedGameNodePicker value={related} onChange={onRelatedChange} />
			<Button
				onClick={() => void submit()}
				disabled={sending || !body.trim() || !audience.id}
				className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300"
			>
				<Send className="size-4" /> ارسال پیام دولت
			</Button>
		</div>
	);
}
