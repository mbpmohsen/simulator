import type { ConfigureAllRequestV2, TeamRequest } from "@workspace/trpc";
import { getLocalized } from "@workspace/trpc";
import type { SelectOption } from "./fields";

/** Persian labels and select options shared by the builder's inspectors. */

export const SUBJECT_TYPE_FA: Record<string, string> = {
	critical_infrastructure: "زیرساخت حیاتی",
	asset: "دارایی",
	mitre_technique: "تکنیک MITRE",
};

export const SCENARIO_TYPE_FA: Record<string, string> = {
	attack_path: "مسیر تهاجمی",
	defense_path: "مسیر دفاعی",
};

export const EXECUTION_MODE_FA: Record<string, string> = {
	checklist: "آزاد — هر کنش چند بار",
	ordered: "ترتیبی — گام‌ها پشت سر هم",
	branching: "شاخه‌ای — با پیش‌نیاز",
};

export const RISK_FA: Record<string, string> = {
	low: "کم",
	medium: "متوسط",
	high: "زیاد",
};

export const ACTION_TYPE_FA: Record<string, string> = {
	attack: "تهاجمی",
	defense: "دفاعی",
};

export const optionsOf = (labels: Record<string, string>): SelectOption[] =>
	Object.entries(labels).map(([value, label]) => ({ value, label }));

const roleType = (team: TeamRequest): string =>
	typeof team.role === "string" ? team.role : team.role.type;

export const teamName = (team: TeamRequest): string =>
	getLocalized(
		team.display_name ?? team.name,
		team.display_name_fa ?? team.name_fa ?? undefined,
	);

export const sideName = (
	plan: ConfigureAllRequestV2,
	sideId: number,
): string => {
	const team = plan.teams.find((item) => item.side_id === sideId);
	return (
		team?.side_name_fa?.trim() ||
		team?.side_name?.trim() ||
		`سمت ${sideId.toLocaleString("fa-IR")}`
	);
};

export const sideOptions = (plan: ConfigureAllRequestV2): SelectOption[] => {
	const ids = [
		...new Set(
			plan.teams.flatMap((team) =>
				team.side_id === undefined ? [] : [team.side_id],
			),
		),
	];
	return ids.map((id) => ({ value: String(id), label: sideName(plan, id) }));
};

export const playerTeamOptions = (
	plan: ConfigureAllRequestV2,
): SelectOption[] =>
	plan.teams
		.filter((team) => team.id !== undefined && roleType(team) !== "GOVERNMENT")
		.map((team) => ({
			value: String(team.id),
			label: teamName(team),
			hint:
				team.side_id !== undefined ? sideName(plan, team.side_id) : undefined,
		}));

/** Persian title of any titled plan entity, never a raw id if a title exists. */
export const titleFa = (item: {
	title?: string | null;
	title_fa?: string | null;
	id?: string;
}): string => item.title_fa?.trim() || item.title?.trim() || item.id || "—";

export const actionNameFa = (
	plan: ConfigureAllRequestV2,
	code: string,
): string => {
	const action = plan.actions.find((item) => item.code === code);
	return action
		? getLocalized(action.name ?? action.code, action.name_fa ?? undefined)
		: code;
};
