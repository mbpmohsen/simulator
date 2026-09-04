import { readFileSync } from "node:fs";
import {
	normalizeDefaultGamePlan,
	validateDefaultGamePlanClientSide,
	validateSubjectShares,
} from "./packages/api/game-plan/validation.ts";

const raw = JSON.parse(
	readFileSync("apps/admin/public/data/demo-game-plan.json", "utf8"),
);
const plan = normalizeDefaultGamePlan(raw);
const result = validateDefaultGamePlanClientSide(plan as never);
console.log("valid:", (result as any).valid ?? JSON.stringify(Object.keys(result)));
console.log(JSON.stringify(result, null, 1).slice(0, 2500));
