"use client";

import type { CommunicationMessage, CommunicationRoom } from "@workspace/trpc";
import { Inbox } from "lucide-react";

export function MessageInbox({
	rooms,
	messages,
	selectedRoomId,
	onSelectRoom,
}: {
	rooms: CommunicationRoom[];
	messages: CommunicationMessage[];
	selectedRoomId: string;
	onSelectRoom: (roomId: string) => void;
}) {
	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2 text-xs font-medium text-slate-300">
				<Inbox className="size-4 text-cyan-300" /> صندوق پیام
			</div>
			<div className="flex gap-2 overflow-x-auto pb-1">
				{rooms.map((room) => {
					const count = messages.filter((message) =>
						room.message_types.includes(message.type),
					).length;
					return (
						<button
							key={room.id}
							type="button"
							onClick={() => onSelectRoom(room.id)}
							className={`shrink-0 rounded-xl border px-3 py-2 text-xs transition ${
								selectedRoomId === room.id
									? "border-cyan-300/35 bg-cyan-400/10 text-cyan-100"
									: "border-white/10 bg-white/[0.025] text-slate-500 hover:text-slate-300"
							}`}
						>
							{room.title_fa ?? room.title}
							<span className="mr-2 rounded-full bg-black/20 px-1.5 py-0.5 text-[9px]">
								{count.toLocaleString("fa-IR")}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
