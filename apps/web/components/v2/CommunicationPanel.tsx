"use client";

import type {
	CommunicationMessage,
	CommunicationMessageType,
	CommunicationRoom,
	CommunicationService,
	GamePhase,
	TeamRoleType,
} from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import {
	AlertTriangle,
	Landmark,
	MessageSquareText,
	Radio,
	ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	COMMUNICATION_BACKEND_NOTICE,
	COMMUNICATION_CONNECTION_ERROR,
} from "@/lib/communicationService";
import { formatCommunicationTypeFa } from "@/lib/communicationTranslationsFa";
import { playNotificationSound } from "@/lib/playNotificationSound";
import { AnnouncementComposer } from "./communication/AnnouncementComposer";
import { GovernmentChannel } from "./communication/GovernmentChannel";
import { MessageInbox } from "./communication/MessageInbox";
import { MessageTimeline } from "./communication/MessageTimeline";
import { SimulationMessageComposer } from "./communication/SimulationMessageComposer";
import { TeamChatRoom } from "./communication/TeamChatRoom";
import {
	type CommunicationDraft,
	type CommunicationTargetOption,
	EMPTY_RELATED_GAME_NODE,
	type RelatedGameNodeSelection,
} from "./communication/types";

const ALL_MESSAGE_TYPES: CommunicationMessageType[] = [
	"TEAM_CHAT",
	"GOVERNMENT_TO_OWN_TEAM",
	"GOVERNMENT_TO_ALLIED_SIDE",
	"GOVERNMENT_TO_ENEMY_GOVERNMENT",
	"GOVERNMENT_TO_ENEMY_TEAM",
	"PUBLIC_ANNOUNCEMENT",
	"FAKE_NEWS_SIMULATION",
	"THREAT_SIMULATION",
	"COACH_ADVICE",
	"SYSTEM_EVENT_REFERENCE",
];

const playerRooms: CommunicationRoom[] = [
	{
		id: "all",
		title: "All messages",
		title_fa: "همه",
		audience: { type: "team" },
		message_types: ALL_MESSAGE_TYPES,
	},
	{
		id: "team",
		title: "Team chat",
		title_fa: "تیم",
		audience: { type: "team" },
		message_types: ["TEAM_CHAT"],
	},
	{
		id: "government",
		title: "Government messages",
		title_fa: "دولت",
		audience: { type: "team" },
		message_types: ["GOVERNMENT_TO_OWN_TEAM", "GOVERNMENT_TO_ALLIED_SIDE"],
		read_only: true,
	},
	{
		id: "public",
		title: "Public and system",
		title_fa: "عمومی",
		audience: { type: "all" },
		message_types: [
			"PUBLIC_ANNOUNCEMENT",
			"FAKE_NEWS_SIMULATION",
			"THREAT_SIMULATION",
			"COACH_ADVICE",
			"SYSTEM_EVENT_REFERENCE",
		],
		read_only: true,
	},
];

const governmentRooms: CommunicationRoom[] = [
	{
		id: "all",
		title: "All messages",
		title_fa: "همه",
		audience: { type: "government" },
		message_types: ALL_MESSAGE_TYPES,
	},
	{
		id: "channels",
		title: "Government channels",
		title_fa: "کانال‌های دولت",
		audience: { type: "government" },
		message_types: [
			"GOVERNMENT_TO_OWN_TEAM",
			"GOVERNMENT_TO_ALLIED_SIDE",
			"GOVERNMENT_TO_ENEMY_GOVERNMENT",
			"GOVERNMENT_TO_ENEMY_TEAM",
		],
	},
	{
		id: "announcements",
		title: "Announcements",
		title_fa: "اطلاعیه‌ها",
		audience: { type: "all" },
		message_types: ["PUBLIC_ANNOUNCEMENT"],
	},
	{
		id: "simulation",
		title: "Simulation",
		title_fa: "شبیه‌سازی",
		audience: { type: "all" },
		message_types: ["FAKE_NEWS_SIMULATION", "THREAT_SIMULATION"],
	},
];

const mergeMessage = (
	messages: CommunicationMessage[],
	message: CommunicationMessage,
): CommunicationMessage[] =>
	[...messages.filter((item) => item.id !== message.id), message]
		.sort(
			(first, second) =>
				Date.parse(first.created_at) - Date.parse(second.created_at),
		)
		.slice(-100);

export function CommunicationPanel({
	service,
	gameId,
	senderUserId,
	senderRole,
	senderTeamId,
	senderSideId,
	phase,
	ownSideTeams = [],
	canSendPublicAnnouncements = false,
	relatedScenarioId,
}: {
	service: CommunicationService;
	gameId: string;
	senderUserId: number;
	senderRole: TeamRoleType | "ADMIN";
	senderTeamId: number;
	senderSideId?: number;
	phase?: GamePhase;
	ownSideTeams?: CommunicationTargetOption[];
	canSendPublicAnnouncements?: boolean;
	relatedScenarioId?: string | null;
}) {
	const isGovernment = senderRole === "GOVERNMENT";
	const rooms = isGovernment ? governmentRooms : playerRooms;
	const [messages, setMessages] = useState<CommunicationMessage[]>([]);
	const [selectedRoomId, setSelectedRoomId] = useState("all");
	const [composer, setComposer] = useState<
		"channel" | "announcement" | "simulation"
	>("channel");
	const [sending, setSending] = useState(false);
	const [connectionError, setConnectionError] = useState<string | null>(null);
	const [related, setRelated] = useState<RelatedGameNodeSelection>({
		...EMPTY_RELATED_GAME_NODE,
		scenarioId: relatedScenarioId ?? "",
	});

	useEffect(() => {
		setRelated((current) => ({
			...current,
			scenarioId: relatedScenarioId ?? current.scenarioId,
		}));
	}, [relatedScenarioId]);

	useEffect(() => {
		let active = true;
		void service
			.listMessages({ gameId, limit: 100 })
			.then((items) => {
				if (active) {
					setMessages(items);
					setConnectionError(null);
				}
			})
			.catch(() => {
				if (active) {
					setConnectionError(COMMUNICATION_CONNECTION_ERROR);
					toast.error(COMMUNICATION_CONNECTION_ERROR);
				}
			});
		const unsubscribe = service.subscribeMessages({
			gameId,
			onMessage: (message) => {
				setMessages((current) => mergeMessage(current, message));
				setConnectionError(null);
				if (message.sender_user_id !== senderUserId) {
					playNotificationSound();
					toast.info(formatCommunicationTypeFa(message.type), {
						description: message.body_fa ?? message.body,
					});
				}
			},
			onError: (error) =>
				setConnectionError(error.message || COMMUNICATION_CONNECTION_ERROR),
		});
		return () => {
			active = false;
			unsubscribe();
		};
	}, [gameId, senderUserId, service]);

	const selectedRoom =
		rooms.find((room) => room.id === selectedRoomId) ?? rooms[0];
	const visibleMessages = useMemo(
		() =>
			selectedRoom
				? messages.filter((message) =>
						selectedRoom.message_types.includes(message.type),
					)
				: messages,
		[messages, selectedRoom],
	);

	const sendDraft = async (draft: CommunicationDraft): Promise<boolean> => {
		setSending(true);
		try {
			const eventSeq = Number(draft.related.eventSeq);
			const message = await service.sendMessage({
				gameId,
				type: draft.type,
				audience: draft.audience,
				body: draft.body,
				related_subject_id: draft.related.subjectId || undefined,
				related_scenario_id: draft.related.scenarioId || undefined,
				related_step_id: draft.related.stepId || undefined,
				related_event_seq:
					Number.isInteger(eventSeq) && eventSeq > 0 ? eventSeq : undefined,
			});
			setConnectionError(null);
			setMessages((current) => mergeMessage(current, message));
			if (service.mode === "mock") {
				toast.warning("پیام فقط در همین مرورگر ذخیره شد.", {
					description:
						"برای ارسال به دستگاه دیگر، API پیام‌رسانی backend لازم است.",
				});
			} else {
				toast.success("پیام ارسال شد.");
			}
			return true;
		} catch (error) {
			const message =
				error instanceof Error ? error.message : COMMUNICATION_CONNECTION_ERROR;
			setConnectionError(message);
			toast.error(message);
			return false;
		} finally {
			setSending(false);
		}
	};

	const hideMessage = (messageId: string): void => {
		if (!service.hideMessage) return;
		void service.hideMessage(messageId).then(() => {
			setMessages((current) =>
				current.filter((message) => message.id !== messageId),
			);
			toast.success("پیام برای شما پنهان شد.");
		});
	};
	const reportMessage = (messageId: string): void => {
		if (!service.reportMessage) return;
		void service
			.reportMessage(messageId, "محتوای نامناسب یا خارج از فضای بازی")
			.then(() =>
				toast.success(
					service.mode === "mock"
						? "گزارش محلی ثبت شد؛ ارسال به ناظر نیازمند backend است."
						: "گزارش برای بررسی ثبت شد.",
				),
			);
	};

	return (
		<Card dir="rtl" className="border-white/10 bg-slate-950/55 text-slate-100">
			<CardHeader className="pb-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<MessageSquareText className="size-5 text-cyan-300" /> مرکز ارتباطات
					</CardTitle>
					<Badge
						className={
							connectionError
								? "border border-rose-400/20 bg-rose-500/10 text-rose-200"
								: service.mode === "mock"
									? "border border-amber-400/20 bg-amber-500/10 text-amber-200"
									: "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
						}
					>
						<Radio className="size-3" />
						{connectionError
							? "قطع"
							: service.mode === "mock"
								? "حالت محلی توسعه"
								: "متصل"}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{service.mode === "mock" && (
					<div className="flex gap-2 rounded-xl border border-amber-400/15 bg-amber-500/5 p-3 text-xs leading-6 text-amber-100/80">
						<AlertTriangle className="mt-1 size-4 shrink-0" />
						<span>{COMMUNICATION_BACKEND_NOTICE}</span>
					</div>
				)}
				{connectionError && (
					<div className="flex gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs leading-6 text-rose-100">
						<AlertTriangle className="mt-1 size-4 shrink-0" />
						<span>{connectionError}</span>
					</div>
				)}
				<MessageInbox
					rooms={rooms}
					messages={messages}
					selectedRoomId={selectedRoomId}
					onSelectRoom={setSelectedRoomId}
				/>
				<MessageTimeline
					messages={visibleMessages}
					canHide={service.capabilities.hide}
					canReport={service.capabilities.report}
					onHide={hideMessage}
					onReport={reportMessage}
				/>
				<div className="space-y-3 border-t border-white/8 pt-4">
					{isGovernment ? (
						<>
							<div className="grid grid-cols-3 gap-2">
								{(
									[
										["channel", "کانال‌ها", Landmark],
										["announcement", "اطلاعیه", MessageSquareText],
										["simulation", "شبیه‌سازی", ShieldAlert],
									] as const
								).map(([id, label, Icon]) => (
									<button
										key={id}
										type="button"
										onClick={() => setComposer(id)}
										className={`rounded-xl border px-2 py-2 text-[10px] transition sm:text-xs ${
											composer === id
												? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
												: "border-white/10 bg-white/[0.025] text-slate-500"
										}`}
									>
										<Icon className="mx-auto mb-1 size-3.5" /> {label}
									</button>
								))}
							</div>
							{composer === "channel" && (
								<GovernmentChannel
									ownTeamId={senderTeamId}
									ownSideId={senderSideId}
									ownSideTeams={ownSideTeams}
									related={related}
									onRelatedChange={setRelated}
									onSend={sendDraft}
									sending={sending}
								/>
							)}
							{composer === "announcement" && (
								<AnnouncementComposer
									allowed={canSendPublicAnnouncements}
									related={related}
									onRelatedChange={setRelated}
									onSend={sendDraft}
									sending={sending}
								/>
							)}
							{composer === "simulation" && (
								<SimulationMessageComposer
									related={related}
									onRelatedChange={setRelated}
									onSend={sendDraft}
									sending={sending}
								/>
							)}
						</>
					) : senderRole === "ADMIN" ? (
						<div className="rounded-xl border border-white/10 p-3 text-xs text-slate-500">
							ابزارهای مدیریت فقط در صورت وجود API moderation فعال می‌شوند.
						</div>
					) : (
						<TeamChatRoom
							teamId={senderTeamId}
							related={related}
							onRelatedChange={setRelated}
							onSend={sendDraft}
							sending={sending}
						/>
					)}
					<p className="text-[10px] leading-5 text-slate-600">
						نوبت {phase ? "و فاز فعال" : "فعال"} همراه پیام ثبت می‌شود. پیام‌های
						آزاد را می‌توانید گزارش یا برای خود پنهان کنید.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
