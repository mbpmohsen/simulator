import type { GameEvent } from "@workspace/trpc";

/**
 * What happened to a move when it resolved, read from the event stream.
 *
 * `SCENARIO_STEP_RESOLVED` is the only place that says which move ran, on which
 * site, and how it went - the steps endpoint only carries a status, and a
 * status that a later refresh overwrites. `TEAM_ACTION_RESOLVED` for the same
 * action fills in the turn number, the points it paid and the credits left.
 *
 * Both events are team-scoped, so this is the team's own result, never the
 * opponent's.
 */
export interface MoveResult {
	seq: number;
	turn: number | null;
	actionCode: string;
	stepId: string | null;
	/** The sub-subject the move ran against - a building on the map. */
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

/** How far apart the step event and its team event may sit in the stream. */
const PAIR_WINDOW = 8;

interface TeamActionRow {
	seq: number;
	actionCode: string;
	turn: number | null;
	points: number | null;
	creditsAfter: number | null;
}

const readTeamActions = (events: GameEvent[]): TeamActionRow[] => {
	const rows: TeamActionRow[] = [];
	for (const event of events) {
		if (event.type !== "TEAM_ACTION_RESOLVED") continue;
		const payload = asRecord(event.payload);
		// `actor` is this team's own move; `target` is the opponent's move
		// landing on us, which is not this team's result.
		if (text(payload.role) !== "actor") continue;
		const actionCode = text(payload.actionName) ?? text(payload.action_name);
		if (!actionCode) continue;
		rows.push({
			seq: event.seq,
			actionCode,
			turn: num(payload.turn),
			points: num(payload.pointsDelta),
			creditsAfter: num(payload.creditsAfter),
		});
	}
	return rows;
};

/** Every resolved move this team has played, oldest first. */
export const buildMoveResults = (events: GameEvent[]): MoveResult[] => {
	const teamActions = readTeamActions(events);
	const results: MoveResult[] = [];

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

		// The step event has no turn number; its team event, emitted beside it,
		// does. Pair them on the action code and how close they sit.
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
 * A move the opponent played against this team, as the server reports it.
 *
 * Only the defending team receives this today: `TEAM_ACTION_RESOLVED` with
 * `role: "target"`. The attacking team is told nothing about the defence, so
 * the reveal has to say plainly that the opponent's move is unknown rather
 * than guess one.
 */
export interface IncomingMove {
	seq: number;
	turn: number | null;
	actionCode: string;
	success: boolean;
	actorTeamName: string | null;
}

export const buildIncomingMoves = (events: GameEvent[]): IncomingMove[] => {
	const moves: IncomingMove[] = [];
	for (const event of events) {
		if (event.type !== "TEAM_ACTION_RESOLVED") continue;
		const payload = asRecord(event.payload);
		if (text(payload.role) !== "target") continue;
		const actionCode = text(payload.actionName) ?? text(payload.action_name);
		if (!actionCode) continue;
		moves.push({
			seq: event.seq,
			turn: num(payload.turn),
			actionCode,
			success: payload.success === true,
			actorTeamName: text(payload.actorTeamName),
		});
	}
	return moves.sort((left, right) => left.seq - right.seq);
};

/** The opponent's move in a given turn, when the server tells this team about it. */
export const incomingMoveForTurn = (
	events: GameEvent[],
	turn: number | null,
): IncomingMove | null => {
	const moves = buildIncomingMoves(events);
	const matches =
		turn === null ? moves : moves.filter((move) => move.turn === turn);
	return matches[matches.length - 1] ?? null;
};
