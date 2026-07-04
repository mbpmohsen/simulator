"use client";

import type {
	CommunicationMessage,
	CommunicationMessageType,
	CommunicationService,
	TeamRoleType,
} from "@workspace/trpc";
import { canSendCommunication, formatRoleFa } from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import {
	AlertTriangle,
	Flag,
	MessageSquareText,
	Radio,
	Send,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { COMMUNICATION_BACKEND_NOTICE } from "@/lib/communicationService";

const MESSAGE_LABELS: Record<CommunicationMessageType, string> = {
	TEAM_CHAT: "گفت‌وگوی تیمی",
	GOVERNMENT_TO_OWN_TEAM: "پیام دولت به تیم خودی",
	GOVERNMENT_TO_ALLIED_SIDE: "پیام دولت به سمت خودی",
	GOVERNMENT_TO_ENEMY_GOVERNMENT: "پیام دولت به دولت حریف",
	GOVERNMENT_TO_ENEMY_TEAM: "پیام دولت به تیم حریف",
	PUBLIC_ANNOUNCEMENT: "اطلاعیه عمومی",
	FAKE_NEWS_SIMULATION: "شایعه / خبر جعلی درون‌بازی",
	THREAT_SIMULATION: "تهدید درون‌بازی",
	COACH_ADVICE: "توصیه مربی",
	SYSTEM_EVENT_REFERENCE: "ارجاع به رویداد سیستم",
};

const PLAYER_TYPES: CommunicationMessageType[] = ["TEAM_CHAT"];
const GOVERNMENT_TYPES: CommunicationMessageType[] = [
	"GOVERNMENT_TO_OWN_TEAM",
	"GOVERNMENT_TO_ALLIED_SIDE",
	"GOVERNMENT_TO_ENEMY_GOVERNMENT",
	"GOVERNMENT_TO_ENEMY_TEAM",
	"PUBLIC_ANNOUNCEMENT",
	"FAKE_NEWS_SIMULATION",
	"THREAT_SIMULATION",
];

const SAFE_THREAT_TEMPLATES = [
	"اگر این مسیر را ادامه دهید، در نوبت بعدی فشار بیشتری روی منابع شما اعمال می‌شود.",
	"دولت ما این اقدام را بی‌پاسخ نخواهد گذاشت.",
];

export function CommunicationPanel({
	service,
	gameId,
	senderRole,
	relatedScenarioId,
}: {
	service: CommunicationService;
	gameId: string;
	senderRole: TeamRoleType | "ADMIN";
	relatedScenarioId?: string | null;
}) {
	const allowedTypes =
		senderRole === "GOVERNMENT" || senderRole === "ADMIN"
			? GOVERNMENT_TYPES
			: PLAYER_TYPES;
	const [messages, setMessages] = useState<CommunicationMessage[]>([]);
	const [type, setType] = useState<CommunicationMessageType>(
		allowedTypes[0] ?? "TEAM_CHAT",
	);
	const [body, setBody] = useState("");
	const [sending, setSending] = useState(false);

	useEffect(() => {
		let active = true;
		void service.listMessages({ gameId, limit: 100 }).then((items) => {
			if (active) setMessages(items);
		});
		const unsubscribe = service.subscribeMessages({
			gameId,
			onMessage: (message) =>
				setMessages((current) => [...current, message].slice(-100)),
		});
		return () => {
			active = false;
			unsubscribe();
		};
	}, [gameId, service]);

	const audience = useMemo<CommunicationMessage["audience"]>(() => {
		if (type === "TEAM_CHAT" || type === "GOVERNMENT_TO_OWN_TEAM")
			return { type: "team" };
		if (type === "GOVERNMENT_TO_ALLIED_SIDE") return { type: "side" };
		if (type === "GOVERNMENT_TO_ENEMY_GOVERNMENT")
			return { type: "government" };
		if (type === "PUBLIC_ANNOUNCEMENT") return { type: "all" };
		return { type: "side" };
	}, [type]);

	const send = async () => {
		if (!body.trim() || !canSendCommunication(senderRole, type)) return;
		setSending(true);
		try {
			await service.sendMessage({
				gameId,
				type,
				audience,
				body: body.trim(),
				related_scenario_id: relatedScenarioId ?? undefined,
			});
			setBody("");
		} catch {
			toast.error("ارسال پیام ناموفق بود.");
		} finally {
			setSending(false);
		}
	};

	return (
		<Card className="border-white/10 bg-slate-950/55 text-slate-100">
			<CardHeader className="pb-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<MessageSquareText className="size-5 text-cyan-300" /> مرکز ارتباطات
					</CardTitle>
					<Badge className="border border-amber-400/20 bg-amber-500/10 text-amber-200">
						<Radio className="size-3" /> حالت محلی توسعه
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex gap-2 rounded-xl border border-amber-400/15 bg-amber-500/5 p-3 text-xs leading-6 text-amber-100/80">
					<AlertTriangle className="mt-1 size-4 shrink-0" />
					<span>{COMMUNICATION_BACKEND_NOTICE}</span>
				</div>
				<div className="max-h-72 space-y-3 overflow-y-auto pl-1">
					{messages.length === 0 && (
						<div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
							هنوز پیامی در این کانال نیست.
						</div>
					)}
					{messages.map((message) => (
						<div
							key={message.id}
							className="rounded-2xl border border-white/8 bg-white/[0.035] p-3"
						>
							<div className="flex flex-wrap items-center gap-2 text-[10px]">
								<Badge variant="secondary">
									{formatRoleFa(message.sender_role)}
								</Badge>
								<span className="text-slate-500">
									تیم {message.sender_team_id} · نوبت {message.turn}
								</span>
								{message.simulation_label && (
									<Badge className="bg-rose-500/15 text-rose-200">
										شبیه‌سازی درون‌بازی
									</Badge>
								)}
								<button
									type="button"
									title="گزارش پیام"
									onClick={() =>
										toast.info(
											"گزارش محلی ثبت شد؛ اتصال moderation نیازمند API backend است.",
										)
									}
									className="mr-auto text-slate-600 hover:text-rose-300"
								>
									<Flag className="size-3.5" />
								</button>
							</div>
							<p className="mt-2 text-sm leading-7 text-slate-200">
								{message.body_fa ?? message.body}
							</p>
							{message.related_scenario_id && (
								<div className="mt-2 text-[10px] text-cyan-400/70">
									پیوست سناریو: {message.related_scenario_id}
								</div>
							)}
						</div>
					))}
				</div>
				<div className="space-y-3 border-t border-white/8 pt-4">
					<Select
						value={type}
						onValueChange={(value) =>
							setType(value as CommunicationMessageType)
						}
					>
						<SelectTrigger className="border-white/10 bg-white/5">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{allowedTypes.map((item) => (
								<SelectItem key={item} value={item}>
									{MESSAGE_LABELS[item]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{type === "THREAT_SIMULATION" && (
						<div className="flex flex-wrap gap-2">
							{SAFE_THREAT_TEMPLATES.map((template) => (
								<button
									key={template}
									type="button"
									onClick={() => setBody(template)}
									className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-right text-[10px] text-slate-400 hover:border-cyan-400/30"
								>
									{template}
								</button>
							))}
						</div>
					)}
					<Textarea
						value={body}
						onChange={(event) => setBody(event.target.value)}
						placeholder="پیام درون‌بازی را بنویسید…"
						className="min-h-24 border-white/10 bg-slate-950"
					/>
					<Button
						onClick={() => void send()}
						disabled={sending || !body.trim()}
						className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300"
					>
						<Send className="size-4" /> ارسال پیام
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
