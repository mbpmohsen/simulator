"use client";

import type { GameEvent, GameStateData } from "@workspace/trpc";
import { useEffect, useMemo, useState } from "react";

/**
 * Seconds left in the current phase.
 *
 * Two sources, both from the server, in order of precision:
 *
 *   1. `VOTING_STARTED` carries `votingDeadline`, an absolute timestamp.
 *   2. `/client/game_state` carries `phaseTimeRemaining`, a duration, which is
 *      anchored to the moment that state arrived.
 *
 * If neither is there, this returns null and the screen shows no clock. A
 * made-up countdown is worse than none: players would trust it.
 */

export interface PhaseCountdown {
	secondsLeft: number | null;
	totalSeconds: number | null;
}

const num = (value: unknown): number | null =>
	typeof value === "number" && Number.isFinite(value) ? value : null;

export const usePhaseCountdown = (
	phase: string,
	turn: number | null,
	gameState: GameStateData | null | undefined,
	events: GameEvent[],
	/** The newest GAME_STATE_SNAPSHOT payload, which carries the phase clock. */
	snapshot?: Record<string, unknown> | null,
): PhaseCountdown => {
	const key = `${phase}-${turn ?? "?"}`;
	const [anchor, setAnchor] = useState<{
		key: string;
		endsAt: number;
		total: number | null;
	} | null>(null);
	const [now, setNow] = useState(() => Date.now());

	const votingDeadline = useMemo(() => {
		if (phase !== "VOTING") return null;
		for (let index = events.length - 1; index >= 0; index -= 1) {
			const event = events[index];
			if (!event || event.type !== "VOTING_STARTED") continue;
			const payload = event.payload as Record<string, unknown>;
			if (turn !== null && num(payload.turnNumber) !== turn) continue;
			const deadline = num(payload.votingDeadline);
			const remaining = num(payload.timeRemaining);
			if (deadline !== null) return { endsAt: deadline, total: remaining };
			if (remaining !== null) {
				return { endsAt: Date.now() + remaining, total: remaining };
			}
			break;
		}
		return null;
	}, [events, phase, turn]);

	const stateRemaining = useMemo(() => {
		const snapshotGame = snapshot?.game as Record<string, unknown> | undefined;
		const fromSnapshot = num(snapshotGame?.phaseTimeRemaining);
		if (fromSnapshot !== null) return fromSnapshot;
		const game = gameState?.game as Record<string, unknown> | undefined;
		return num(game?.phaseTimeRemaining);
	}, [gameState, snapshot]);

	// The anchor is set once per phase, from whichever source the server gave.
	useEffect(() => {
		if (anchor?.key === key) return;
		if (votingDeadline) {
			setAnchor({
				key,
				endsAt: votingDeadline.endsAt,
				total: votingDeadline.total,
			});
			return;
		}
		if (stateRemaining !== null) {
			setAnchor({
				key,
				endsAt: Date.now() + stateRemaining,
				total: stateRemaining,
			});
			return;
		}
		setAnchor(null);
	}, [anchor?.key, key, stateRemaining, votingDeadline]);

	useEffect(() => {
		if (!anchor) return;
		const timer = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, [anchor]);

	if (!anchor || anchor.key !== key) {
		return { secondsLeft: null, totalSeconds: null };
	}
	return {
		secondsLeft: Math.max(0, Math.round((anchor.endsAt - now) / 1000)),
		totalSeconds:
			anchor.total !== null && anchor.total > 0
				? Math.round(anchor.total / 1000)
				: null,
	};
};
