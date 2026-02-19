import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const INPUT_PATH = path.join(ROOT, "data", "enterprise-attack-17.1-t.json");
const OUTPUT_PATH = path.join(ROOT, "data", "attack-prepared-catalog.json");

const readJson = async (filePath) => {
	const raw = await fs.readFile(filePath, "utf8");
	return JSON.parse(raw);
};

const writeJson = async (filePath, data) => {
	await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
};

const normalize = (value) =>
	String(value ?? "")
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 64);

const pickPrimaryReference = (refs = []) =>
	refs.find((ref) => ref?.external_id && String(ref.external_id).startsWith("T")) ??
	refs.find((ref) => ref?.url) ??
	null;

const cleanText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const buildCatalog = (bundle) => {
	const objects = Array.isArray(bundle?.objects) ? bundle.objects : [];

	const techniques = objects.filter(
		(obj) =>
			obj?.type === "attack-pattern" &&
			obj?.revoked !== true &&
			obj?.x_mitre_deprecated !== true,
	);
	const mitigations = objects.filter(
		(obj) =>
			obj?.type === "course-of-action" &&
			obj?.revoked !== true &&
			obj?.x_mitre_deprecated !== true,
	);
	const relationships = objects.filter((obj) => obj?.type === "relationship");

	const objectById = new Map(objects.map((obj) => [obj.id, obj]));
	const mitigationById = new Map(mitigations.map((obj) => [obj.id, obj]));

	const usesByTarget = new Map();
	const mitigatesByTarget = new Map();

	for (const relation of relationships) {
		if (!relation?.target_ref) continue;

		if (relation.relationship_type === "uses") {
			const list = usesByTarget.get(relation.target_ref) ?? [];
			list.push(relation);
			usesByTarget.set(relation.target_ref, list);
		}

		if (relation.relationship_type === "mitigates") {
			const list = mitigatesByTarget.get(relation.target_ref) ?? [];
			list.push(relation);
			mitigatesByTarget.set(relation.target_ref, list);
		}
	}

	const items = techniques.map((technique) => {
		const refs = Array.isArray(technique.external_references)
			? technique.external_references
			: [];
		const primaryReference = pickPrimaryReference(refs);
		const externalId =
			typeof primaryReference?.external_id === "string"
				? primaryReference.external_id
				: "";

		const attackUrl =
			typeof primaryReference?.url === "string" && primaryReference.url.length > 0
				? primaryReference.url
				: externalId
					? `https://attack.mitre.org/techniques/${externalId.replace(".", "/")}/`
					: "";

		const actionCode = normalize(externalId || technique.name || technique.id);
		const mitigationRelations = mitigatesByTarget.get(technique.id) ?? [];
		const mitigationObjects = mitigationRelations
			.map((relation) => mitigationById.get(relation.source_ref))
			.filter(Boolean)
			.slice(0, 4);
		const mainMitigation = mitigationObjects[0];
		const defenseCodeBase = normalize(
			mainMitigation?.external_references?.[0]?.external_id ||
				mainMitigation?.name ||
				`${actionCode}_DEFENSE`,
		);
		const defenseCode = defenseCodeBase.endsWith("_DEFENSE")
			? defenseCodeBase
			: `${defenseCodeBase}_DEFENSE`;

		const usesRelations = usesByTarget.get(technique.id) ?? [];
		const procedures = usesRelations
			.slice(0, 4)
			.map((relation) => {
				const source = objectById.get(relation.source_ref);
				return {
					source_name: cleanText(source?.name || relation.source_ref || "Unknown"),
					summary: cleanText(relation.description || ""),
				};
			})
			.filter((entry) => entry.summary.length > 0);

		const mitigationEntries = mitigationObjects.map((mitigation) => ({
			id: mitigation.id,
			name: cleanText(mitigation.name),
			description: cleanText(mitigation.description || ""),
		}));

		const tactics = (Array.isArray(technique.kill_chain_phases)
			? technique.kill_chain_phases
			: []
		)
			.filter((phase) => phase?.kill_chain_name === "mitre-attack")
			.map((phase) => String(phase.phase_name))
			.filter(Boolean);

		const attackAction = {
			code: actionCode,
			name: cleanText(technique.name || "Technique Action"),
			type: "attack",
			description: cleanText(technique.description || ""),
			mitre_mapping: {
				techniques: [
					{
						id: externalId || technique.id,
						name: cleanText(technique.name || "Technique"),
						url: attackUrl || undefined,
					},
				],
				tactics: tactics.map((item) => item.replace(/_/g, " ")),
			},
			base_stats: {
				cost: Math.min(220, Math.max(10, 10 + tactics.length * 10)),
				success_probability: 75,
				points_on_success: 1,
				cooldown_turns: 1,
			},
			requirements: {
				unlocked_by_default: true,
				prerequisites: [],
				min_credits: 0,
				allowed_team_roles: ["attack_only", "hybrid"],
			},
			effects: {
				on_success: [{ type: "points", target: "self", value: 1 }],
			},
			visual: {
				icon: "⚔️",
				color: "#EF4444",
				animation: "precision_strike",
			},
		};

		const defenseAction = {
			code: defenseCode,
			name: cleanText(mainMitigation?.name || `${technique.name} Defense`),
			type: "defense",
			description: cleanText(
				mainMitigation?.description ||
					`Defensive measure against ${technique.name || "attack"}.`,
			),
			mitre_mapping: {
				techniques: [
					{
						id:
							mainMitigation?.external_references?.[0]?.external_id ||
							mainMitigation?.id ||
							defenseCode,
						name: cleanText(mainMitigation?.name || "Mitigation"),
					},
				],
				tactics: ["Defense"],
			},
			base_stats: {
				cost: Math.max(8, Math.floor((10 + tactics.length * 8) * 0.8)),
				success_probability: 80,
				points_on_success: 0,
				cooldown_turns: 0,
			},
			requirements: {
				unlocked_by_default: true,
				prerequisites: [],
				min_credits: 0,
				allowed_team_roles: ["defense_only", "hybrid"],
			},
			effects: {
				on_success: [{ type: "block_attack" }],
			},
			visual: {
				icon: "🛡️",
				color: "#3B82F6",
				animation: "shield_block",
			},
		};

		const actionCounter = {
			attack_code: actionCode,
			countered_by: [
				{
					defense_code: defenseCode,
					effectiveness: 80,
					description: `Mitigates ${cleanText(technique.name || "attack")} impact.`,
				},
			],
		};

		const blackMarket = {
			code: `${actionCode}_BOOST`,
			name: `${cleanText(technique.name || "Technique")} Booster`,
			description: `Boost success probability for ${actionCode} for limited turns.`,
			item_type: "consumable",
			effect_type: "probability_increase",
			target: {
				action_code: actionCode,
				action_type: "attack",
			},
			effect: {
				modifier_type: "additive",
				value: 20,
				description: "+20 success probability",
			},
			cost: 35,
			duration_turns: 3,
			stackable: false,
			availability: {
				unlocked_by_default: true,
				stock_limit: 3,
				per_team_limit: 1,
				available_from_turn: 1,
			},
			visual: {
				icon: "⚡",
				color: "#FACC15",
			},
		};

		return {
			id: technique.id,
			external_id: externalId || null,
			name: cleanText(technique.name || "Unknown Technique"),
			description: cleanText(technique.description || ""),
			detection_strategy: cleanText(technique.x_mitre_detection || ""),
			procedure_examples: procedures,
			mitigations: mitigationEntries,
			tactics,
			templates: {
				actions: [attackAction, defenseAction],
				action_counters: [actionCounter],
				black_market: [blackMarket],
			},
		};
	});

	return {
		version: "1.0",
		source: "MITRE ATT&CK Enterprise 17.1",
		generated_at: new Date().toISOString(),
		total_items: items.length,
		items,
	};
};

const main = async () => {
	console.log(`Reading ATT&CK bundle from: ${INPUT_PATH}`);
	const bundle = await readJson(INPUT_PATH);
	const catalog = buildCatalog(bundle);
	await writeJson(OUTPUT_PATH, catalog);
	console.log(`Prepared catalog generated: ${OUTPUT_PATH}`);
	console.log(`Total prepared entries: ${catalog.total_items}`);
};

main().catch((error) => {
	console.error("Failed to build prepared catalog:", error);
	process.exit(1);
});
