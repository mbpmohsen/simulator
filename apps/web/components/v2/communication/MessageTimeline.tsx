"use client";

import type { CommunicationMessage } from "@workspace/trpc";
import { formatPhaseFa, formatRoleFa } from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { EyeOff, Flag, Link2, Radio, ShieldCheck } from "lucide-react";
import {
	formatCommunicationAudienceFa,
	formatCommunicationTypeFa,
} from "@/lib/communicationTranslationsFa";

const ReferenceBadge = ({ children }: { children: React.ReactNode }) => (
	<Badge
		variant="outline"
		className="border-cyan-400/15 text-[9px] text-cyan-200/70"
	>
		<Link2 className="size-2.5" /> {children}
	</Badge>
);

export function MessageTimeline({
	messages,
	canHide,
	canReport,
	onHide,
	onReport,
}: {
	messages: CommunicationMessage[];
	canHide: boolean;
	canReport: boolean;
	onHide: (messageId: string) => void;
	onReport: (messageId: string) => void;
}) {
	if (messages.length === 0) {
		return (
			<div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
				هنوز پیامی در این صندوق نیست.
			</div>
		);
	}

	return (
		<div className="max-h-[28rem] space-y-3 overflow-y-auto pl-1 overflow-x-hidden">
			{messages.map((message) => (
				<article
					key={message.id}
					className={`rounded-2xl border p-3 ${
						message.simulation_label
							? "border-rose-400/20 bg-rose-500/[0.055]"
							: "border-white/8 bg-white/[0.035]"
					}`}
				>
					<div className="flex flex-wrap items-center gap-2 text-[10px]">
						<Badge variant="secondary">
							{formatRoleFa(message.sender_role)}
						</Badge>
						{message.sender_team_id !== undefined &&
							message.sender_team_id !== null && (
								<Badge
									variant="outline"
									className="border-white/10 text-slate-400"
								>
									تیم {message.sender_team_id}
								</Badge>
							)}
						{message.sender_side_id !== undefined &&
							message.sender_side_id !== null && (
								<Badge
									variant="outline"
									className="border-white/10 text-slate-400"
								>
									سمت {message.sender_side_id}
								</Badge>
							)}
						{message.turn !== undefined && message.turn !== null && (
							<span className="text-slate-500">
								نوبت {message.turn.toLocaleString("fa-IR")}
								{message.phase ? ` · ${formatPhaseFa(message.phase)}` : ""}
							</span>
						)}
						{message.simulation_label && (
							<Badge className="bg-rose-500/15 text-rose-100">
								<Radio className="size-3" /> شبیه‌سازی درون‌بازی
							</Badge>
						)}
						<div className="mr-auto flex items-center gap-1">
							{canReport && (
								<button
									type="button"
									title="گزارش پیام"
									onClick={() => onReport(message.id)}
									className="rounded-md p-1.5 text-slate-600 transition hover:bg-rose-500/10 hover:text-rose-300"
								>
									<Flag className="size-3.5" />
								</button>
							)}
							{canHide && (
								<button
									type="button"
									title="پنهان‌کردن پیام"
									onClick={() => onHide(message.id)}
									className="rounded-md p-1.5 text-slate-600 transition hover:bg-white/5 hover:text-slate-300"
								>
									<EyeOff className="size-3.5" />
								</button>
							)}
						</div>
					</div>
					<div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
						<span>{formatCommunicationTypeFa(message.type)}</span>
						<span>·</span>
						<span>{formatCommunicationAudienceFa(message.audience)}</span>
						{message.status === "delivered" && (
							<ShieldCheck className="size-3 text-emerald-400" />
						)}
					</div>
					<p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-200">
						{message.body_fa ?? message.body}
					</p>
					<div className="mt-2 flex flex-wrap gap-1.5">
						{message.related_subject_id && (
							<ReferenceBadge>
								موضوع: {message.related_subject_id}
							</ReferenceBadge>
						)}
						{message.related_sub_subject_id && (
							<ReferenceBadge>
								زیرموضوع: {message.related_sub_subject_id}
							</ReferenceBadge>
						)}
						{message.related_scenario_id && (
							<ReferenceBadge>
								سناریو: {message.related_scenario_id}
							</ReferenceBadge>
						)}
						{message.related_step_id && (
							<ReferenceBadge>گام: {message.related_step_id}</ReferenceBadge>
						)}
						{message.related_event_seq !== undefined &&
							message.related_event_seq !== null && (
								<ReferenceBadge>
									رویداد: {message.related_event_seq.toLocaleString("fa-IR")}
								</ReferenceBadge>
							)}
					</div>
				</article>
			))}
		</div>
	);
}
