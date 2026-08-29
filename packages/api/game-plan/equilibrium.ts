import type {
	ActionConfigRequest,
	ConfigureAllRequestV2,
} from "../game-server/types";

/**
 * Mixed-strategy Nash equilibrium of the published game plan.
 *
 * The payoff matrix is a pure function of the plan: attack cost / success
 * probability / points, defence the same, and the counter effectiveness that
 * links them. Nothing here calls the server - the plan is the only input - so
 * the admin can solve a draft before it is ever published.
 *
 * Scoring follows the engine: `points_on_success` is awarded on an action's own
 * success roll regardless of what the other side played. A counter only reduces
 * the attacker's effective success probability.
 *
 * NOTE: this solves the plan as authored. In-game modifiers - active effects,
 * black-market items, government bans - are not reflected unless their action
 * codes are passed as `excludedActionCodes`.
 */

const WEIGHT_EPSILON = 1e-6;
const SIMPLEX_EPSILON = 1e-9;
const SIMPLEX_MAX_ITERATIONS = 500;

export interface EquilibriumMove {
	code: string;
	name: string;
	nameFa: string | null;
	cost: number;
	successProbability: number;
	points: number;
	expectedPoints: number;
	pointsPerCredit: number;
}

export interface EquilibriumCounter {
	attackCode: string;
	defenseCode: string;
	effectiveness: number;
}

export interface EquilibriumStrategy {
	move: EquilibriumMove;
	weight: number;
	dominated: boolean;
}

export type EquilibriumWarningCode =
	| "NO_ATTACK_ACTIONS"
	| "NO_DEFENSE_ACTIONS"
	| "ATTACK_HAS_NO_COUNTER"
	| "DEFENSE_COUNTERS_NOTHING"
	| "MOVE_SCORES_NOTHING"
	| "DOMINATED_MOVE"
	| "MORE_THAN_TWO_SIDES"
	| "SOLVER_FAILED";

export interface EquilibriumWarning {
	code: EquilibriumWarningCode;
	subject: string | null;
	message: string;
	messageFa: string;
}

export interface EquilibriumResult {
	solvable: boolean;
	attacks: EquilibriumStrategy[];
	defenses: EquilibriumStrategy[];
	counters: EquilibriumCounter[];
	attackPayoff: number[][];
	defensePayoff: number[][];
	netPayoff: number[][];
	value: number;
	attackerExpectedPoints: number;
	defenderExpectedPoints: number;
	attackerExpectedCost: number;
	defenderExpectedCost: number;
	excluded: string[];
	warnings: EquilibriumWarning[];
}

export interface EquilibriumOptions {
	/** Action codes to leave out - use for government bans and what-if toggles. */
	excludedActionCodes?: Iterable<string>;
}

interface SimplexSolution {
	primal: number[];
	dual: number[];
	value: number;
}

/**
 * maximize c.y subject to Ay <= b, y >= 0.
 * Bland's rule keeps it from cycling; these games are tiny so the cost is free.
 * Returns the primal solution plus the duals read off the slack columns.
 */
const simplexMaximize = (
	A: number[][],
	b: number[],
	c: number[],
): SimplexSolution | null => {
	const rows = A.length;
	const cols = c.length;
	if (rows === 0 || cols === 0) return null;
	const width = cols + rows + 1;
	const rhs = width - 1;

	const tableau: number[][] = [];
	for (let i = 0; i < rows; i += 1) {
		const row = new Array<number>(width).fill(0);
		for (let j = 0; j < cols; j += 1) row[j] = A[i]?.[j] ?? 0;
		row[cols + i] = 1;
		row[rhs] = b[i] ?? 0;
		tableau.push(row);
	}
	const objective = new Array<number>(width).fill(0);
	for (let j = 0; j < cols; j += 1) objective[j] = -(c[j] ?? 0);
	tableau.push(objective);

	const basis: number[] = [];
	for (let i = 0; i < rows; i += 1) basis.push(cols + i);

	for (let iteration = 0; iteration < SIMPLEX_MAX_ITERATIONS; iteration += 1) {
		const objectiveRow = tableau[rows];
		if (!objectiveRow) return null;

		let entering = -1;
		for (let j = 0; j < cols + rows; j += 1) {
			if ((objectiveRow[j] ?? 0) < -SIMPLEX_EPSILON) {
				entering = j;
				break;
			}
		}
		if (entering === -1) break;

		let leaving = -1;
		let bestRatio = Number.POSITIVE_INFINITY;
		for (let i = 0; i < rows; i += 1) {
			const row = tableau[i];
			if (!row) continue;
			const coefficient = row[entering] ?? 0;
			if (coefficient <= SIMPLEX_EPSILON) continue;
			const ratio = (row[rhs] ?? 0) / coefficient;
			if (ratio < bestRatio - 1e-12) {
				bestRatio = ratio;
				leaving = i;
				continue;
			}
			if (
				leaving !== -1 &&
				Math.abs(ratio - bestRatio) <= 1e-12 &&
				(basis[i] ?? 0) < (basis[leaving] ?? Number.POSITIVE_INFINITY)
			) {
				bestRatio = ratio;
				leaving = i;
			}
		}
		if (leaving === -1) return null;

		const pivotRow = tableau[leaving];
		if (!pivotRow) return null;
		const pivot = pivotRow[entering] ?? 0;
		if (Math.abs(pivot) < SIMPLEX_EPSILON) return null;
		for (let j = 0; j < width; j += 1) pivotRow[j] = (pivotRow[j] ?? 0) / pivot;
		for (let i = 0; i <= rows; i += 1) {
			if (i === leaving) continue;
			const row = tableau[i];
			if (!row) continue;
			const factor = row[entering] ?? 0;
			if (Math.abs(factor) < 1e-15) continue;
			for (let j = 0; j < width; j += 1) {
				row[j] = (row[j] ?? 0) - factor * (pivotRow[j] ?? 0);
			}
		}
		basis[leaving] = entering;
	}

	const objectiveRow = tableau[rows];
	if (!objectiveRow) return null;
	const primal = new Array<number>(cols).fill(0);
	for (let i = 0; i < rows; i += 1) {
		const column = basis[i];
		if (column !== undefined && column < cols) {
			primal[column] = tableau[i]?.[rhs] ?? 0;
		}
	}
	const dual = new Array<number>(rows).fill(0);
	for (let i = 0; i < rows; i += 1) dual[i] = objectiveRow[cols + i] ?? 0;
	return { primal, dual, value: objectiveRow[rhs] ?? 0 };
};

const normalize = (weights: number[]): number[] => {
	const total = weights.reduce((sum, weight) => sum + Math.max(weight, 0), 0);
	if (total <= 0) {
		const share = weights.length > 0 ? 1 / weights.length : 0;
		return weights.map(() => share);
	}
	return weights.map((weight) => Math.max(weight, 0) / total);
};

/**
 * Solves a zero-sum matrix game. `matrix[i][j]` is the row player's payoff.
 * Returns both mixed strategies and the value of the game.
 */
export const solveZeroSumGame = (
	matrix: number[][],
): { value: number; row: number[]; column: number[] } | null => {
	const rows = matrix.length;
	const cols = matrix[0]?.length ?? 0;
	if (rows === 0 || cols === 0) return null;

	let minimum = Number.POSITIVE_INFINITY;
	for (const row of matrix) {
		for (const cell of row) minimum = Math.min(minimum, cell);
	}
	if (!Number.isFinite(minimum)) return null;
	const shift = minimum <= 0 ? -minimum + 1 : 0;
	const shifted = matrix.map((row) => row.map((cell) => cell + shift));

	const solution = simplexMaximize(
		shifted,
		new Array<number>(rows).fill(1),
		new Array<number>(cols).fill(1),
	);
	if (!solution || solution.value <= SIMPLEX_EPSILON) return null;

	const shiftedValue = 1 / solution.value;
	return {
		value: shiftedValue - shift,
		row: normalize(solution.dual),
		column: normalize(solution.primal),
	};
};

const toMove = (action: ActionConfigRequest): EquilibriumMove => {
	const cost = Number(action.base_stats?.cost ?? 0);
	const successProbability = Number(
		action.base_stats?.success_probability ?? 0,
	);
	const points = Number(action.base_stats?.points_on_success ?? 0);
	const expectedPoints = (successProbability / 100) * points;
	return {
		code: action.code,
		name: action.name?.trim() || action.code,
		nameFa: action.name_fa?.trim() || null,
		cost,
		successProbability,
		points,
		expectedPoints,
		pointsPerCredit: cost > 0 ? expectedPoints / cost : 0,
	};
};

const counterKey = (attackCode: string, defenseCode: string): string =>
	`${attackCode} ${defenseCode}`;

export const buildEquilibrium = (
	plan: ConfigureAllRequestV2,
	options: EquilibriumOptions = {},
): EquilibriumResult => {
	const excluded = new Set(options.excludedActionCodes ?? []);
	const warnings: EquilibriumWarning[] = [];
	const warn = (
		code: EquilibriumWarningCode,
		subject: string | null,
		message: string,
		messageFa: string,
	): void => {
		warnings.push({ code, subject, message, messageFa });
	};

	const sides = new Set(plan.teams.map((team) => team.side_id));
	if (sides.size > 2) {
		warn(
			"MORE_THAN_TWO_SIDES",
			null,
			`The plan has ${sides.size} sides. The equilibrium is solved as attackers against defenders, which merges every side into two.`,
			`این برنامه ${sides.size} سمت دارد. تعادل به‌صورت «مهاجمان در برابر مدافعان» حل می‌شود و همهٔ سمت‌ها در دو گروه ادغام می‌شوند.`,
		);
	}

	const usable = plan.actions.filter((action) => !excluded.has(action.code));
	const attacks = usable
		.filter((action) => action.type === "attack")
		.map(toMove);
	const defenses = usable
		.filter((action) => action.type === "defense")
		.map(toMove);

	const counterEffectiveness = new Map<string, number>();
	const counters: EquilibriumCounter[] = [];
	for (const entry of plan.action_counters ?? []) {
		for (const mapping of entry.countered_by ?? []) {
			if (excluded.has(entry.attack_code) || excluded.has(mapping.defense_code))
				continue;
			const effectiveness = Number(mapping.effectiveness ?? 0);
			counterEffectiveness.set(
				counterKey(entry.attack_code, mapping.defense_code),
				effectiveness,
			);
			counters.push({
				attackCode: entry.attack_code,
				defenseCode: mapping.defense_code,
				effectiveness,
			});
		}
	}

	const unsolved = (): EquilibriumResult => ({
		solvable: false,
		attacks: attacks.map((move) => ({ move, weight: 0, dominated: true })),
		defenses: defenses.map((move) => ({ move, weight: 0, dominated: true })),
		counters,
		attackPayoff: [],
		defensePayoff: [],
		netPayoff: [],
		value: 0,
		attackerExpectedPoints: 0,
		defenderExpectedPoints: 0,
		attackerExpectedCost: 0,
		defenderExpectedCost: 0,
		excluded: [...excluded],
		warnings,
	});

	if (attacks.length === 0) {
		warn(
			"NO_ATTACK_ACTIONS",
			null,
			"There are no attack actions to solve.",
			"هیچ کنش تهاجمی برای حل کردن وجود ندارد.",
		);
		return unsolved();
	}
	if (defenses.length === 0) {
		warn(
			"NO_DEFENSE_ACTIONS",
			null,
			"There are no defence actions to solve.",
			"هیچ کنش دفاعی برای حل کردن وجود ندارد.",
		);
		return unsolved();
	}

	for (const attack of attacks) {
		const blocked = defenses.some((defense) =>
			counterEffectiveness.has(counterKey(attack.code, defense.code)),
		);
		if (!blocked) {
			warn(
				"ATTACK_HAS_NO_COUNTER",
				attack.code,
				`"${attack.name}" has no counter, so no defence can reduce it.`,
				`«${attack.nameFa ?? attack.name}» ضدکنش ندارد و هیچ دفاعی نمی‌تواند آن را کاهش دهد.`,
			);
		}
	}
	for (const defense of defenses) {
		const blocks = attacks.some((attack) =>
			counterEffectiveness.has(counterKey(attack.code, defense.code)),
		);
		if (!blocks) {
			warn(
				"DEFENSE_COUNTERS_NOTHING",
				defense.code,
				`"${defense.name}" counters nothing, so it only scores on its own roll.`,
				`«${defense.nameFa ?? defense.name}» هیچ کنشی را خنثی نمی‌کند و فقط از شانس موفقیت خودش امتیاز می‌گیرد.`,
			);
		}
	}
	for (const move of [...attacks, ...defenses]) {
		if (move.points <= 0) {
			warn(
				"MOVE_SCORES_NOTHING",
				move.code,
				`"${move.name}" awards no points, so it will never appear in the equilibrium.`,
				`«${move.nameFa ?? move.name}» امتیازی نمی‌دهد و هرگز در تعادل ظاهر نمی‌شود.`,
			);
		}
	}

	const attackPayoff: number[][] = [];
	const defensePayoff: number[][] = [];
	const netPayoff: number[][] = [];
	for (const attack of attacks) {
		const attackRow: number[] = [];
		const defenseRow: number[] = [];
		const netRow: number[] = [];
		for (const defense of defenses) {
			const effectiveness =
				counterEffectiveness.get(counterKey(attack.code, defense.code)) ?? 0;
			const attackerValue =
				(attack.successProbability / 100) *
				(1 - effectiveness / 100) *
				attack.points;
			const defenderValue = (defense.successProbability / 100) * defense.points;
			attackRow.push(attackerValue);
			defenseRow.push(defenderValue);
			netRow.push(attackerValue - defenderValue);
		}
		attackPayoff.push(attackRow);
		defensePayoff.push(defenseRow);
		netPayoff.push(netRow);
	}

	const solution = solveZeroSumGame(netPayoff);
	if (!solution) {
		warn(
			"SOLVER_FAILED",
			null,
			"The equilibrium could not be solved for this plan.",
			"تعادل برای این برنامه قابل محاسبه نبود.",
		);
		return { ...unsolved(), attackPayoff, defensePayoff, netPayoff };
	}

	const attackStrategies: EquilibriumStrategy[] = attacks.map(
		(move, index) => ({
			move,
			weight: solution.row[index] ?? 0,
			dominated: (solution.row[index] ?? 0) < WEIGHT_EPSILON,
		}),
	);
	const defenseStrategies: EquilibriumStrategy[] = defenses.map(
		(move, index) => ({
			move,
			weight: solution.column[index] ?? 0,
			dominated: (solution.column[index] ?? 0) < WEIGHT_EPSILON,
		}),
	);

	for (const strategy of [...attackStrategies, ...defenseStrategies]) {
		if (strategy.dominated && strategy.move.points > 0) {
			warn(
				"DOMINATED_MOVE",
				strategy.move.code,
				`"${strategy.move.name}" is dominated - a rational team never plays it.`,
				`«${strategy.move.nameFa ?? strategy.move.name}» مغلوب است و یک تیم منطقی هرگز آن را انتخاب نمی‌کند.`,
			);
		}
	}

	let attackerExpectedPoints = 0;
	let defenderExpectedPoints = 0;
	for (let i = 0; i < attacks.length; i += 1) {
		for (let j = 0; j < defenses.length; j += 1) {
			const joint = (solution.row[i] ?? 0) * (solution.column[j] ?? 0);
			attackerExpectedPoints += joint * (attackPayoff[i]?.[j] ?? 0);
			defenderExpectedPoints += joint * (defensePayoff[i]?.[j] ?? 0);
		}
	}
	const attackerExpectedCost = attacks.reduce(
		(sum, move, index) => sum + (solution.row[index] ?? 0) * move.cost,
		0,
	);
	const defenderExpectedCost = defenses.reduce(
		(sum, move, index) => sum + (solution.column[index] ?? 0) * move.cost,
		0,
	);

	return {
		solvable: true,
		attacks: attackStrategies,
		defenses: defenseStrategies,
		counters,
		attackPayoff,
		defensePayoff,
		netPayoff,
		value: solution.value,
		attackerExpectedPoints,
		defenderExpectedPoints,
		attackerExpectedCost,
		defenderExpectedCost,
		excluded: [...excluded],
		warnings,
	};
};

/** Convenience: the equilibrium with one action banned, for what-if toggles. */
export const buildEquilibriumWithout = (
	plan: ConfigureAllRequestV2,
	actionCode: string,
): EquilibriumResult =>
	buildEquilibrium(plan, { excludedActionCodes: [actionCode] });
