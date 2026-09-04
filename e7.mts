import { readFileSync } from "node:fs";
import { buildEquilibrium } from "./packages/api/game-plan/equilibrium.ts";

const plan = JSON.parse(
	readFileSync("apps/admin/public/data/demo-game-plan.json", "utf8"),
);
const eq = buildEquilibrium(plan);
console.log("solvable:", eq.solvable, "value:", eq.value);
console.log("warnings:", JSON.stringify(eq.warnings ?? []));
for (const s of eq.attacks) console.log("ATK", s.move.code, (s.weight * 100).toFixed(1) + "%", "dominated:", s.dominated);
for (const s of eq.defenses) console.log("DEF", s.move.code, (s.weight * 100).toFixed(1) + "%", "dominated:", s.dominated);
