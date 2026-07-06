"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Megaphone, Send } from "lucide-react";
import { useState } from "react";
import { RelatedGameNodePicker } from "./RelatedGameNodePicker";
import type {
	RelatedGameNodeSelection,
	SubmitCommunicationDraft,
} from "./types";

export function AnnouncementComposer({
	allowed,
	related,
	onRelatedChange,
	onSend,
	sending,
}: {
	allowed: boolean;
	related: RelatedGameNodeSelection;
	onRelatedChange: (value: RelatedGameNodeSelection) => void;
	onSend: SubmitCommunicationDraft;
	sending: boolean;
}) {
	const [body, setBody] = useState("");
	const submit = async (): Promise<void> => {
		const sent = await onSend({
			type: "PUBLIC_ANNOUNCEMENT",
			audience: { type: "all" },
			body,
			related,
		});
		if (sent) setBody("");
	};

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h3 className="text-sm font-semibold text-slate-100">
						اطلاعیه عمومی
					</h3>
					<p className="mt-1 text-xs text-slate-500">
						این پیام برای همه شرکت‌کنندگان بازی قابل مشاهده است.
					</p>
				</div>
				<Badge variant="secondary">
					<Megaphone className="size-3" /> کانال عمومی
				</Badge>
			</div>
			{allowed ? (
				<>
					<Textarea
						value={body}
						onChange={(event) => setBody(event.target.value)}
						maxLength={1000}
						placeholder="متن اطلاعیه عمومی…"
						className="min-h-24 border-white/10 bg-slate-950"
					/>
					<RelatedGameNodePicker value={related} onChange={onRelatedChange} />
					<Button
						onClick={() => void submit()}
						disabled={sending || !body.trim()}
						className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300"
					>
						<Send className="size-4" /> انتشار اطلاعیه
					</Button>
				</>
			) : (
				<div className="rounded-xl border border-amber-400/15 bg-amber-500/5 p-3 text-xs leading-6 text-amber-100/80">
					مجوز انتشار عمومی در داده‌های حالت بازی موجود نیست؛ این کانال فقط
					خواندنی است.
				</div>
			)}
		</div>
	);
}
