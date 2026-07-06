"use client";

import type { GameEvent } from "@workspace/trpc";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { GameEventsStatus } from "@/hooks/useGameEvents";
import { playNotificationSound } from "@/lib/playNotificationSound";
import { eventMessageFa } from "@/lib/runtimeTranslationsFa";

export const getIncomingGovernmentOrders = (
	events: GameEvent[],
	knownSequences: ReadonlySet<number>,
	targetTeamId: number | null | undefined,
): GameEvent[] =>
	events.filter((event) => {
		if (
			event.type !== "GOVERNMENT_ORDER_ISSUED" ||
			knownSequences.has(event.seq)
		)
			return false;
		const eventTarget = event.payload.target_team_id;
		return (
			targetTeamId !== null &&
			targetTeamId !== undefined &&
			Number(eventTarget) === targetTeamId
		);
	});

export const useIncomingOrderNotifications = ({
	events,
	status,
	targetTeamId,
}: {
	events: GameEvent[];
	status: GameEventsStatus;
	targetTeamId: number | null | undefined;
}): void => {
	const knownSequences = useRef(new Set<number>());

	useEffect(() => {
		if (status === "idle" || status === "connecting") {
			for (const event of events) knownSequences.current.add(event.seq);
			return;
		}
		const incoming = getIncomingGovernmentOrders(
			events,
			knownSequences.current,
			targetTeamId,
		);
		for (const event of events) knownSequences.current.add(event.seq);
		for (const event of incoming) {
			playNotificationSound();
			toast.info("دستور تازه دولت", { description: eventMessageFa(event) });
		}
	}, [events, status, targetTeamId]);
};
