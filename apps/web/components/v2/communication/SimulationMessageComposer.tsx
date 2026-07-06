"use client";

import type { CommunicationMessageType } from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { Radio, Send, ShieldAlert } from "lucide-react";
import { useState } from "react";
import {
	COMMUNICATION_MESSAGE_LABELS,
	SAFE_SIMULATION_TEMPLATES,
} from "@/lib/communicationTranslationsFa";
import { RelatedGameNodePicker } from "./RelatedGameNodePicker";
import type {
	RelatedGameNodeSelection,
	SubmitCommunicationDraft,
} from "./types";

type SimulationType = "FAKE_NEWS_SIMULATION" | "THREAT_SIMULATION";

export function SimulationMessageComposer({
	related,
	onRelatedChange,
	onSend,
	sending,
}: {
	related: RelatedGameNodeSelection;
	onRelatedChange: (value: RelatedGameNodeSelection) => void;
	onSend: SubmitCommunicationDraft;
	sending: boolean;
}) {
	const [type, setType] = useState<SimulationType>("FAKE_NEWS_SIMULATION");
	const [body, setBody] = useState("");
	const changeType = (value: CommunicationMessageType): void => {
		if (value !== "FAKE_NEWS_SIMULATION" && value !== "THREAT_SIMULATION") {
			return;
		}
		setType(value);
		setBody("");
	};
	const submit = async (): Promise<void> => {
		const sent = await onSend({
			type,
			audience: { type: "all" },
			body,
			related,
		});
		if (sent) setBody("");
	};

	return (
		<div className="space-y-3">
			<div className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-3">
				<div className="flex flex-wrap items-center gap-2">
					<ShieldAlert className="size-4 text-rose-300" />
					<Badge className="bg-rose-500/15 text-rose-100">
						<Radio className="size-3" /> شبیه‌سازی درون‌بازی
					</Badge>
				</div>
				<p className="mt-2 text-xs leading-6 text-rose-100/70">
					این پیام فقط بخشی از شبیه‌سازی بازی است و نباید برای تهدید یا آزار
					واقعی استفاده شود. نفرت‌پراکنی و توهین شخصی پشتیبانی نمی‌شود؛ تنها یکی
					از الگوهای امن را انتخاب کنید.
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
					<SelectItem value="FAKE_NEWS_SIMULATION">
						{COMMUNICATION_MESSAGE_LABELS.FAKE_NEWS_SIMULATION}
					</SelectItem>
					<SelectItem value="THREAT_SIMULATION">
						{COMMUNICATION_MESSAGE_LABELS.THREAT_SIMULATION}
					</SelectItem>
				</SelectContent>
			</Select>
			<div className="grid gap-2">
				{SAFE_SIMULATION_TEMPLATES[type].map((template) => (
					<button
						key={template}
						type="button"
						onClick={() => setBody(template)}
						className={`rounded-xl border p-3 text-right text-xs leading-6 transition ${
							body === template
								? "border-rose-300/40 bg-rose-500/10 text-rose-50"
								: "border-white/10 bg-white/[0.025] text-slate-400 hover:border-rose-300/25"
						}`}
					>
						{template}
					</button>
				))}
			</div>
			<RelatedGameNodePicker value={related} onChange={onRelatedChange} />
			<Button
				onClick={() => void submit()}
				disabled={sending || !body}
				className="w-full bg-rose-300 text-slate-950 hover:bg-rose-200"
			>
				<Send className="size-4" /> انتشار با برچسب شبیه‌سازی
			</Button>
		</div>
	);
}
