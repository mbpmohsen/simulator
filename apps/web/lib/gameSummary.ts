import type { GameEvent } from "@workspace/trpc";
import {
	buildIncomingMoves,
	buildMoveResults,
	type IncomingMove,
	type MoveResult,
} from "@/lib/moveResults";

/**
 * The whole game, rebuilt from its event history for the end screen.
 *
 * The scoreboard alone says who won. It does not say what anyone *did*, and for
 * a team that scored nothing it says "0" — which is false: a defender who
 * blocked three attacks and repaired two breaches had a good game and the
 * screen must be able to prove it. Everything here exists to make each turn,
 * and each thing a team achieved, legible after the fact.
 *
 * All of it is derived. Nothing is invented: a field the events did not carry
 * comes back null and the component leaves that space empty.
 *
 * Events are team-scoped, so this is always one team's view of the game: their
 * own moves in full, and the opponent's moves as the server chose to report
 * them (`target` for an attack that landed here, `counterparty` for what the
 * other side played elsewhere).
 */

const asRecord = (value: unknown): Record<string, unknown> =>
	value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

const text = (value: unknown): string | null =>
	typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

/** A government order as it reached this team. */
export interface TurnOrder {
	orderType: string | null;
	subjectId: string | null;
	actionCode: string | null;
	forced: boolean;
}

/** One turn of the game, from this team's vantage point. */
export interface TurnEntry {
	turn: number;
	/** This team's own resolved move, when it played one. */
	mine: MoveResult | null;
	/** The opponent's move, when the server reported one for this turn. */
	theirs: IncomingMove | null;
	/** Points this team gained in this turn. */
	pointsGained: number;
	/** Running total after this turn. */
	pointsTotal: number;
	/** Credits left after this turn, when a resolution reported them. */
	creditsAfter: number | null;
	orders: TurnOrder[];
}

/** What a team achieved, in the currency that fits what it was doing. */
export interface Scorecard {
	points: number;
	/** Every point, with the move and turn that earned it. */
	scoringMoves: Array<{
		turn: number | null;
		actionCode: string;
		siteId: string | null;
		points: number;
	}>;
	/** Moves played, with how they went. */
	movesPlayed: Array<{
		actionCode: string;
		played: number;
		succeeded: number;
		points: number;
	}>;
	/** Defensive value — the scoreboard the defender is actually playing for. */
	attacksAbsorbed: number;
	attacksBlocked: number;
	repairsMade: number;
	repairsMissed: number;
	guardTurns: number;
	/** Turns in which no attack landed on this team. */
	cleanTurns: number;
	turnsPlayed: number;
	/** How lopsided the move choice was, 0 (even) to 1 (always the same move). */
	predictability: number | null;
	/** The move played most often, when one stands out. */
	favourite: { actionCode: string; share: number } | null;
}

export interface DecisiveTurn {
	turn: number;
	pointsGained: number;
	entry: TurnEntry;
	/** Why this turn is being called out. */
	reason: "threshold" | "biggest-swing" | "only-score";
}

export interface GameSummary {
	turns: TurnEntry[];
	scorecard: Scorecard;
	decisive: DecisiveTurn | null;
	/** True when the history held no resolution at all. */
	empty: boolean;
}

const orderFromEvent = (event: GameEvent): TurnOrder | null => {
	if (event.type !== "GOVERNMENT_ORDER_ISSUED") return null;
	const payload = asRecord(event.payload);
	return {
		orderType: text(payload.order_type) ?? text(payload.orderType),
		subjectId: text(payload.subject_id) ?? text(payload.subjectId),
		actionCode: text(payload.action_code) ?? text(payload.actionCode),
		forced: payload.forced === true,
	};
};

/**
 * Turn numbers are on the resolution events, not on the orders, so an order is
 * attached to the turn of the nearest resolution that follows it. When no
 * resolution follows, it belongs to the last turn seen.
 */
const assignOrders = (
	events: GameEvent[],
	turnOfSeq: Array<{ seq: number; turn: number }>,
): Map<number, TurnOrder[]> => {
	const byTurn = new Map<number, TurnOrder[]>();
	const sorted = [...turnOfSeq].sort((left, right) => left.seq - right.seq);
	for (const event of events) {
		const order = orderFromEvent(event);
		if (!order) continue;
		const following = sorted.find((item) => item.seq >= event.seq);
		const turn = following?.turn ?? sorted[sorted.length - 1]?.turn ?? null;
		if (turn === null) continue;
		const bucket = byTurn.get(turn) ?? [];
		bucket.push(order);
		byTurn.set(turn, bucket);
	}
	return byTurn;
};

/** A defence that won its roll cleared a standing vulnerability. */
const isRepair = (move: { outcomeReason: string | null }): boolean =>
	move.outcomeReason === "PROBABILITY_SUCCESS";

const buildScorecard = (
	mine: MoveResult[],
	theirs: IncomingMove[],
	turns: TurnEntry[],
): Scorecard => {
	const scoringMoves = mine
		.filter((move) => (move.points ?? 0) > 0)
		.map((move) => ({
			turn: move.turn,
			actionCode: move.actionCode,
			siteId: move.siteId,
			points: move.points ?? 0,
		}));

	const byCode = new Map<
		string,
		{ actionCode: string; played: number; succeeded: number; points: number }
	>();
	for (const move of mine) {
		const row = byCode.get(move.actionCode) ?? {
			actionCode: move.actionCode,
			played: 0,
			succeeded: 0,
			points: 0,
		};
		row.played += 1;
		if (move.success) row.succeeded += 1;
		row.points += move.points ?? 0;
		byCode.set(move.actionCode, row);
	}
	const movesPlayed = [...byCode.values()].sort(
		(left, right) => right.played - left.played,
	);

	// Attacks aimed at this team. `success` on a target copy is attacker-relative.
	const incomingAttacks = theirs.filter((move) => move.role === "target");
	const attacksAbsorbed = incomingAttacks.filter((move) => move.success).length;
	const attacksBlocked = incomingAttacks.filter(
		(move) =>
			move.blockedByCounter || move.outcomeReason === "BLOCKED_BY_COUNTER",
	).length;

	const defences = mine.filter((move) => move.guardActive);
	const repairsMade = defences.filter(isRepair).length;
	const repairsMissed = defences.filter(
		(move) => move.outcomeReason === "PROBABILITY_FAILURE",
	).length;

	const hitTurns = new Set(
		incomingAttacks
			.filter((move) => move.success)
			.map((move) => move.turn)
			.filter((turn): turn is number => turn !== null),
	);
	const cleanTurns = turns.filter((entry) => !hitTurns.has(entry.turn)).length;

	// One move played every turn is the only mistake an opponent can punish.
	const total = mine.length;
	const top = movesPlayed[0] ?? null;
	const predictability =
		total >= 3 && top ? Math.round((top.played / total) * 100) / 100 : null;

	return {
		points: mine.reduce((sum, move) => sum + (move.points ?? 0), 0),
		scoringMoves,
		movesPlayed,
		attacksAbsorbed,
		attacksBlocked,
		repairsMade,
		repairsMissed,
		guardTurns: defences.length,
		cleanTurns,
		turnsPlayed: turns.length,
		predictability,
		favourite:
			predictability !== null && top
				? { actionCode: top.actionCode, share: predictability }
				: null,
	};
};

const pickDecisive = (
	turns: TurnEntry[],
	pointThreshold: number | null,
): DecisiveTurn | null => {
	const scoring = turns.filter((entry) => entry.pointsGained > 0);
	if (scoring.length === 0) return null;

	// The turn the threshold was crossed decided the game outright.
	if (pointThreshold !== null && pointThreshold > 0) {
		const crossing = scoring.find(
			(entry) =>
				entry.pointsTotal >= pointThreshold &&
				entry.pointsTotal - entry.pointsGained < pointThreshold,
		);
		if (crossing) {
			return {
				turn: crossing.turn,
				pointsGained: crossing.pointsGained,
				entry: crossing,
				reason: "threshold",
			};
		}
	}

	const only = scoring.length === 1 ? scoring[0] : undefined;
	if (only) {
		return {
			turn: only.turn,
			pointsGained: only.pointsGained,
			entry: only,
			reason: "only-score",
		};
	}

	const biggest = scoring.reduce((best, entry) =>
		entry.pointsGained > best.pointsGained ? entry : best,
	);
	return {
		turn: biggest.turn,
		pointsGained: biggest.pointsGained,
		entry: biggest,
		reason: "biggest-swing",
	};
};

export const buildGameSummary = (
	events: GameEvent[],
	options: { totalTurns?: number | null; pointThreshold?: number | null } = {},
): GameSummary => {
	const mine = buildMoveResults(events);
	const theirs = buildIncomingMoves(events);

	const turnNumbers = new Set<number>();
	for (const move of mine) if (move.turn !== null) turnNumbers.add(move.turn);
	for (const move of theirs) if (move.turn !== null) turnNumbers.add(move.turn);

	const turnOfSeq = [
		...mine.flatMap((move) =>
			move.turn === null ? [] : [{ seq: move.seq, turn: move.turn }],
		),
		...theirs.flatMap((move) =>
			move.turn === null ? [] : [{ seq: move.seq, turn: move.turn }],
		),
	];
	const ordersByTurn = assignOrders(events, turnOfSeq);

	let running = 0;
	const turns: TurnEntry[] = [...turnNumbers]
		.sort((left, right) => left - right)
		.map((turn) => {
			const mineHere = mine.filter((move) => move.turn === turn);
			const theirsHere = theirs.filter((move) => move.turn === turn);
			const pointsGained = mineHere.reduce(
				(sum, move) => sum + (move.points ?? 0),
				0,
			);
			running += pointsGained;
			const credits = mineHere
				.map((move) => move.creditsAfter)
				.filter((value): value is number => value !== null);
			return {
				turn,
				// A team plays one move per turn; if the history somehow holds more,
				// the last one is the one that stood.
				mine: mineHere[mineHere.length - 1] ?? null,
				theirs: theirsHere[theirsHere.length - 1] ?? null,
				pointsGained,
				pointsTotal: running,
				creditsAfter: credits[credits.length - 1] ?? null,
				orders: ordersByTurn.get(turn) ?? [],
			};
		});

	return {
		turns,
		scorecard: buildScorecard(mine, theirs, turns),
		decisive: pickDecisive(turns, options.pointThreshold ?? null),
		empty: mine.length === 0 && theirs.length === 0,
	};
};

/** Attack codes a team is still open to, straight from the server's state. */
export const readVulnerabilities = (
	vulnerabilities: Record<string, string[]> | undefined,
): Array<{ actionCode: string; attackers: string[] }> =>
	Object.entries(vulnerabilities ?? {}).map(([actionCode, attackers]) => ({
		actionCode,
		attackers: Array.isArray(attackers) ? attackers : [],
	}));
