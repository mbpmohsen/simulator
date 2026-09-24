import type { GameEvent } from "@workspace/trpc";

/**
 * What happened to a move when it resolved, read from the event stream.
 *
 * `SCENARIO_STEP_RESOLVED` says which move ran, on which site, and what it did
 * to progress. `TEAM_ACTION_RESOLVED` for the same action carries the turn
 * number, the points, the credits left and — since the 2026-09-24 server — the
 * whole story of the roll: the probability actually used, what came up, the
 * counter that gated it, and a machine-readable reason.
 *
 * The reason matters more than the `success` flag. A defence reporting
 * `success: false` with `NOTHING_TO_REPAIR` never rolled at all and was
 * guarding the whole turn; calling that "failed" on screen teaches the player
 * the opposite of the rule. See `docs/backend-requests.md` §5.
 */

/**
 * Why a resolution came out the way it did.
 *
 * Treat the list as open: the server may add values, so anything unknown falls
 * back to the `success` flag rather than rendering a raw code.
 */
export type OutcomeReason =
	| "PROBABILITY_SUCCESS"
	| "PROBABILITY_FAILURE"
	| "TARGET_VULNERABLE"
	| "BLOCKED_BY_COUNTER"
	| "NOTHING_TO_REPAIR"
	| "INSUFFICIENT_CREDITS"
	| "INVALID";

/** The dice half of a resolution, shared by every role. */
export interface RollDetail {
	outcomeReason: string | null;
	/** Configured chance, before any modifier. */
	baseProbability: number | null;
	/** Chance actually rolled against: 0 when a counter blocked, 100 on auto-success. */
	appliedProbability: number | null;
	/** What came up, 0-100. Null when no roll happened. */
	roll: number | null;
	/** The opposing action that gated this one, when one was in play. */
	counterActionCode: string | null;
	counterEffectiveness: number | null;
	counterRoll: number | null;
	blockedByCounter: boolean;
	/** Defence only: it was paid for, so it was guarding whatever its roll did. */
	guardActive: boolean;
	/** Defence only: the attack code this defence gates. */
	guardsAgainstActionCode: string | null;
}

export interface MoveResult extends RollDetail {
	seq: number;
	turn: number | null;
	actionCode: string;
	stepId: string | null;
	/** The sub-subject the move ran against. */
	siteId: string | null;
	success: boolean;
	/** Progress this move added to its site, from ADVANCE_PROGRESS. */
	progress: number | null;
	/** Where the whole subject stands afterwards, from SUBJECT_PROGRESS. */
	subjectProgress: number | null;
	/** Points this move earned, from the matching team event. */
	points: number | null;
	creditsAfter: number | null;
}

const asRecord = (value: unknown): Record<string, unknown> =>
	value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

const text = (value: unknown): string | null =>
	typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const num = (value: unknown): number | null =>
	typeof value === "number" && Number.isFinite(value) ? value : null;

/**
 * The action's code. The server still calls this `actionName` on resolution
 * events even though it holds a code; `actionCode` is the alias we asked for
 * and read first if it ever lands.
 */
const codeOf = (payload: Record<string, unknown>): string | null =>
	text(payload.actionCode) ??
	text(payload.actionName) ??
	text(payload.action_name);

const readRoll = (payload: Record<string, unknown>): RollDetail => ({
	outcomeReason: text(payload.outcomeReason),
	baseProbability: num(payload.baseProbability),
	appliedProbability: num(payload.appliedProbability),
	roll: num(payload.roll),
	counterActionCode: text(payload.counterActionCode),
	counterEffectiveness: num(payload.counterEffectiveness),
	counterRoll: num(payload.counterRoll),
	blockedByCounter: payload.blockedByCounter === true,
	guardActive: payload.guardActive === true,
	guardsAgainstActionCode: text(payload.guardsAgainstActionCode),
});

const EMPTY_ROLL: RollDetail = {
	outcomeReason: null,
	baseProbability: null,
	appliedProbability: null,
	roll: null,
	counterActionCode: null,
	counterEffectiveness: null,
	counterRoll: null,
	blockedByCounter: false,
	guardActive: false,
	guardsAgainstActionCode: null,
};

/** Keeps only the roll half of a wider row. */
const rollOf = (row: RollDetail): RollDetail => ({
	outcomeReason: row.outcomeReason,
	baseProbability: row.baseProbability,
	appliedProbability: row.appliedProbability,
	roll: row.roll,
	counterActionCode: row.counterActionCode,
	counterEffectiveness: row.counterEffectiveness,
	counterRoll: row.counterRoll,
	blockedByCounter: row.blockedByCounter,
	guardActive: row.guardActive,
	guardsAgainstActionCode: row.guardsAgainstActionCode,
});

/** How far apart the step event and its team event may sit in the stream. */
const PAIR_WINDOW = 8;

interface TeamActionRow extends RollDetail {
	seq: number;
	actionCode: string;
	turn: number | null;
	points: number | null;
	creditsAfter: number | null;
	success: boolean;
	siteId: string | null;
}

const readTeamActions = (events: GameEvent[]): TeamActionRow[] => {
	const rows: TeamActionRow[] = [];
	for (const event of events) {
		if (event.type !== "TEAM_ACTION_RESOLVED") continue;
		const payload = asRecord(event.payload);
		// `actor` is this team's own move. `target` is the opponent's move
		// landing on us and `counterparty` is what they played elsewhere -
		// neither is this team's own result.
		if (text(payload.role) !== "actor") continue;
		const actionCode = codeOf(payload);
		if (!actionCode) continue;
		rows.push({
			seq: event.seq,
			actionCode,
			turn: num(payload.turn),
			points: num(payload.pointsDelta),
			creditsAfter: num(payload.creditsAfter),
			success: payload.success === true,
			siteId: text(payload.sub_subject_id),
			...readRoll(payload),
		});
	}
	return rows;
};

/** Every resolved move this team has played, oldest first. */
export const buildMoveResults = (events: GameEvent[]): MoveResult[] => {
	const teamActions = readTeamActions(events);
	const results: MoveResult[] = [];
	const pairedSeqs = new Set<number>();

	for (const event of events) {
		if (event.type !== "SCENARIO_STEP_RESOLVED") continue;
		const payload = asRecord(event.payload);
		const actionCode = text(payload.action_code);
		if (!actionCode) continue;

		const siteId = text(payload.sub_subject_id);
		let progress: number | null = null;
		let subjectProgress: number | null = null;
		const effects = Array.isArray(payload.effects) ? payload.effects : [];
		for (const raw of effects) {
			const effect = asRecord(raw);
			const type = text(effect.type);
			const value = num(effect.value);
			if (value === null) continue;
			if (
				type === "ADVANCE_PROGRESS" &&
				(!siteId || text(effect.target) === siteId)
			) {
				progress = value;
			}
			if (type === "SUBJECT_PROGRESS") subjectProgress = value;
		}

		// The step event has no turn number and no roll; its team event, emitted
		// beside it, has both. Pair them on the action code and how close they sit.
		const pair = teamActions
			.filter(
				(row) =>
					row.actionCode === actionCode &&
					Math.abs(row.seq - event.seq) <= PAIR_WINDOW,
			)
			.sort(
				(left, right) =>
					Math.abs(left.seq - event.seq) - Math.abs(right.seq - event.seq),
			)[0];
		if (pair) pairedSeqs.add(pair.seq);

		results.push({
			seq: event.seq,
			turn: pair?.turn ?? null,
			actionCode,
			stepId: text(payload.step_id),
			siteId,
			success: text(payload.result) === "success",
			progress,
			subjectProgress,
			points: pair?.points ?? null,
			creditsAfter: pair?.creditsAfter ?? null,
			...(pair ? rollOf(pair) : EMPTY_ROLL),
		});
	}

	// A move that never reached a scenario step - rejected before execution, or
	// an action outside the plan - still resolved and still has to be shown, or
	// the player sees nothing at all for the turn they just spent.
	for (const row of teamActions) {
		if (pairedSeqs.has(row.seq)) continue;
		results.push({
			seq: row.seq,
			turn: row.turn,
			actionCode: row.actionCode,
			stepId: null,
			siteId: row.siteId,
			success: row.success,
			progress: null,
			subjectProgress: null,
			points: row.points,
			creditsAfter: row.creditsAfter,
			...rollOf(row),
		});
	}

	return results.sort((left, right) => left.seq - right.seq);
};

/**
 * The result of each move in the turn being played, keyed by action code.
 *
 * A result whose turn could not be paired counts only while it is among the
 * newest events, so an old outcome never reappears on a later turn's card.
 */
export const resultsForTurn = (
	events: GameEvent[],
	currentTurn: number | null,
): Map<string, MoveResult> => {
	const results = buildMoveResults(events);
	const newestSeq = results.reduce((max, item) => Math.max(max, item.seq), 0);
	const map = new Map<string, MoveResult>();
	for (const result of results) {
		const belongs =
			result.turn !== null
				? result.turn === currentTurn
				: result.seq >= newestSeq - PAIR_WINDOW;
		if (belongs) map.set(result.actionCode, result);
	}
	return map;
};

/**
 * A move the opponent played, as the server reports it.
 *
 * Two roles carry this, and only one of them arrives per turn:
 *
 * - `target` - the opponent's action landed on this team. Every field is
 *   attacker-relative: `success` means the attacker succeeded.
 * - `counterparty` - the opponent played something that did not target this
 *   team (a defence, typically). Sent only after the whole resolution loop has
 *   finished, so it cannot leak into a live vote.
 *
 * The server suppresses `counterparty` for a team that already received the
 * richer `target` copy, so never assume both arrive.
 */
export interface IncomingMove extends RollDetail {
	seq: number;
	turn: number | null;
	actionCode: string;
	/** Attacker-relative on `target`; the opponent's own outcome on `counterparty`. */
	success: boolean;
	role: "target" | "counterparty";
	opponentTeamName: string | null;
	/** Which of this team's sites was hit. Absent for v1 games. */
	siteId: string | null;
}

export const buildIncomingMoves = (events: GameEvent[]): IncomingMove[] => {
	const moves: IncomingMove[] = [];
	for (const event of events) {
		if (event.type !== "TEAM_ACTION_RESOLVED") continue;
		const payload = asRecord(event.payload);
		const role = text(payload.role);
		if (role !== "target" && role !== "counterparty") continue;
		const actionCode = codeOf(payload);
		if (!actionCode) continue;
		moves.push({
			seq: event.seq,
			turn: num(payload.turn),
			actionCode,
			success: payload.success === true,
			role,
			opponentTeamName: text(payload.actorTeamName),
			siteId: text(payload.sub_subject_id),
			...readRoll(payload),
		});
	}
	return moves.sort((left, right) => left.seq - right.seq);
};

/** The opponent's move in a given turn, whichever role reported it. */
export const incomingMoveForTurn = (
	events: GameEvent[],
	turn: number | null,
): IncomingMove | null => {
	const moves = buildIncomingMoves(events);
	const matches =
		turn === null ? moves : moves.filter((move) => move.turn === turn);
	return matches[matches.length - 1] ?? null;
};

/**
 * Standing vulnerabilities, the harshest rule in the game.
 *
 * A successful attack leaves its target open: the *same* attack from the same
 * attacker then succeeds automatically at 100 % until a defence that counters
 * it repairs the damage. Nothing on the server pushes this as state, so it is
 * folded out of the resolution stream in order.
 *
 * `exposedTo` is what can hit this team for free; `opponentExposedTo` is what
 * this team can land for free. Both are keyed by attack code.
 */
export interface Vulnerabilities {
	exposedTo: Map<string, { since: number; attackerName: string | null }>;
	opponentExposedTo: Map<string, { since: number }>;
}

/** A repair only clears the vulnerability when a roll actually won. */
const isRepair = (move: RollDetail): boolean =>
	move.outcomeReason === "PROBABILITY_SUCCESS" &&
	move.guardsAgainstActionCode !== null;

export const buildVulnerabilities = (events: GameEvent[]): Vulnerabilities => {
	const exposedTo = new Map<
		string,
		{ since: number; attackerName: string | null }
	>();
	const opponentExposedTo = new Map<string, { since: number }>();

	const ordered = [...events].sort((left, right) => left.seq - right.seq);
	for (const event of ordered) {
		if (event.type !== "TEAM_ACTION_RESOLVED") continue;
		const payload = asRecord(event.payload);
		const role = text(payload.role);
		const actionCode = codeOf(payload);
		if (!actionCode) continue;
		const detail = readRoll(payload);
		const succeeded = payload.success === true;
		const turn = num(payload.turn) ?? event.seq;

		if (role === "actor") {
			// Our own attack landing leaves them open to the same move again.
			if (succeeded && !detail.blockedByCounter && !detail.guardActive) {
				opponentExposedTo.set(actionCode, { since: turn });
			}
			// Our own defence repairing clears what it guards against.
			if (isRepair(detail) && detail.guardsAgainstActionCode) {
				exposedTo.delete(detail.guardsAgainstActionCode);
			}
			continue;
		}

		if (role === "target") {
			// Attacker-relative: their success is our exposure.
			if (succeeded) {
				exposedTo.set(actionCode, {
					since: turn,
					attackerName: text(payload.actorTeamName),
				});
			}
			continue;
		}

		if (role === "counterparty" && isRepair(detail)) {
			// They repaired: the free shot we had is gone.
			if (detail.guardsAgainstActionCode) {
				opponentExposedTo.delete(detail.guardsAgainstActionCode);
			}
		}
	}

	return { exposedTo, opponentExposedTo };
};
