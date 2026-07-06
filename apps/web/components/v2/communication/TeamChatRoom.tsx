"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Send, Users } from "lucide-react";
import { useState } from "react";
import { RelatedGameNodePicker } from "./RelatedGameNodePicker";
import type {
	RelatedGameNodeSelection,
	SubmitCommunicationDraft,
} from "./types";

export function TeamChatRoom({
	teamId,
	related,
	onRelatedChange,
	onSend,
	sending,
}: {
	teamId: number;
	related: RelatedGameNodeSelection;
	onRelatedChange: (value: RelatedGameNodeSelection) => void;
	onSend: SubmitCommunicationDraft;
	sending: boolean;
}) {
	const [body, setBody] = useState("");
	const submit = async (): Promise<void> => {
		const sent = await onSend({
			type: "TEAM_CHAT",
			audience: { type: "team", id: teamId },
			body,
			related,
		});
		if (sent) setBody("");
	};

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h3 className="text-sm font-semibold text-slate-100">اتاق تیم</h3>
					<p className="mt-1 text-xs text-slate-500">
						پیام فقط برای اعضای تیم خودی نمایش داده می‌شود.
					</p>
				</div>
				<Badge variant="secondary">
					<Users className="size-3" /> تیم {teamId}
				</Badge>
			</div>
			<Textarea
				value={body}
				onChange={(event) => setBody(event.target.value)}
				maxLength={1000}
				placeholder="پیام تیمی را بنویسید…"
				className="min-h-24 border-white/10 bg-slate-950"
			/>
			<RelatedGameNodePicker value={related} onChange={onRelatedChange} />
			<Button
				onClick={() => void submit()}
				disabled={sending || !body.trim()}
				className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300"
			>
				<Send className="size-4" /> ارسال به تیم خودی
			</Button>
		</div>
	);
}
