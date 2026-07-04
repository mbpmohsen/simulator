import type { GamePhase, GovernmentOrder } from "../game-server/types";

export const canSelectScenario = (phase: GamePhase): boolean =>
	phase === "SELECTION";
export const canVoteStep = (phase: GamePhase): boolean => phase === "VOTING";

export interface GovernmentOrderValidationResult {
	valid: boolean;
	message?: string;
}

export const validateGovernmentOrderPayload = (
	order: GovernmentOrder,
): GovernmentOrderValidationResult => {
	if (!Number.isInteger(order.target_team_id) || order.target_team_id <= 0) {
		return { valid: false, message: "تیم هدف معتبر نیست." };
	}
	switch (order.order_type) {
		case "ASSIGN_SUBJECT":
		case "FORCE_SUBJECT":
			return order.payload.subject_id.trim()
				? { valid: true }
				: { valid: false, message: "موضوع را انتخاب کنید." };
		case "ALLOCATE_CREDIT":
			return Number.isFinite(order.payload.amount)
				? { valid: true }
				: { valid: false, message: "مقدار اعتبار معتبر نیست." };
		case "BAN_ACTION":
		case "UNBAN_ACTION":
			return order.payload.action_code.trim()
				? { valid: true }
				: { valid: false, message: "کد کنش را وارد کنید." };
		case "DISABLE_TEAM":
		case "ENABLE_TEAM":
			return { valid: true };
	}
};
