"use client";

import type {
	CommunicationAudience,
	CommunicationMessageType,
} from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { Users } from "lucide-react";
import type { CommunicationTargetOption } from "./types";

export function MessageTargetSelector({
	type,
	value,
	onChange,
	ownTeamId,
	ownSideId,
	ownSideTeams,
}: {
	type: CommunicationMessageType;
	value: CommunicationAudience;
	onChange: (value: CommunicationAudience) => void;
	ownTeamId: number;
	ownSideId?: number;
	ownSideTeams: CommunicationTargetOption[];
}) {
	if (type === "TEAM_CHAT") {
		return (
			<Badge variant="secondary" className="w-fit">
				<Users className="size-3" /> تیم خودی {ownTeamId}
			</Badge>
		);
	}
	if (type === "GOVERNMENT_TO_ALLIED_SIDE") {
		return (
			<Badge variant="secondary" className="w-fit">
				<Users className="size-3" /> همه تیم‌های سمت {ownSideId ?? "خودی"}
			</Badge>
		);
	}
	if (
		type === "PUBLIC_ANNOUNCEMENT" ||
		type === "FAKE_NEWS_SIMULATION" ||
		type === "THREAT_SIMULATION"
	) {
		return (
			<Badge variant="secondary" className="w-fit">
				<Users className="size-3" /> همه شرکت‌کنندگان بازی
			</Badge>
		);
	}
	if (type === "GOVERNMENT_TO_OWN_TEAM") {
		return (
			<Select
				value={value.id ? String(value.id) : ""}
				onValueChange={(teamId) =>
					onChange({ type: "team", id: Number(teamId) })
				}
			>
				<SelectTrigger className="border-white/10 bg-white/5">
					<SelectValue placeholder="تیم خودی مقصد" />
				</SelectTrigger>
				<SelectContent>
					{ownSideTeams.map((team) => (
						<SelectItem key={team.teamId} value={String(team.teamId)}>
							{team.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}
	const isGovernmentTarget = type === "GOVERNMENT_TO_ENEMY_GOVERNMENT";
	return (
		<Input
			value={value.id ? String(value.id) : ""}
			onChange={(event) => {
				const id = Number(event.target.value);
				onChange({
					type: isGovernmentTarget ? "government" : "team",
					id: Number.isInteger(id) && id > 0 ? id : undefined,
				});
			}}
			inputMode="numeric"
			placeholder={isGovernmentTarget ? "شناسه دولت حریف" : "شناسه تیم حریف"}
			className="border-white/10 bg-slate-950"
		/>
	);
}
