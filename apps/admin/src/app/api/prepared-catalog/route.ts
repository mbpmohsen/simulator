import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

type Lang = "en" | "fa";

interface PreparedCatalogItem {
	id: string;
	external_id: string | null;
	name: string;
	name_fa?: string;
	description: string;
	description_fa?: string;
	detection_strategy: string;
	detection_strategy_fa?: string;
	procedure_examples: Array<{
		source_name: string;
		source_name_fa?: string;
		summary: string;
		summary_fa?: string;
	}>;
	mitigations: Array<{
		id: string;
		name: string;
		name_fa?: string;
		description: string;
		description_fa?: string;
	}>;
	tactics: string[];
	tactics_fa?: string[];
	templates: {
		actions: Array<Record<string, unknown>>;
		action_counters: Array<Record<string, unknown>>;
		black_market: Array<Record<string, unknown>>;
	};
}

interface PreparedCatalogRoot {
	version: string;
	source: string;
	generated_at: string;
	total_items: number;
	items: PreparedCatalogItem[];
}

let cachedCatalog: PreparedCatalogRoot | null = null;
const DEFAULT_COUNTER_EFFECTIVENESS = 80;

const pickLocalizedText = (
	lang: Lang,
	enValue: unknown,
	faValue: unknown,
): string => {
	const en = typeof enValue === "string" ? enValue : "";
	const fa = typeof faValue === "string" ? faValue : "";
	if (lang === "fa" && fa.trim().length > 0) return fa;
	return en;
};

const pickLocalizedArray = (
	lang: Lang,
	enValue: unknown,
	faValue: unknown,
): string[] => {
	const en = Array.isArray(enValue)
		? enValue.filter((entry): entry is string => typeof entry === "string")
		: [];
	const fa = Array.isArray(faValue)
		? faValue.filter((entry): entry is string => typeof entry === "string")
		: [];
	if (lang === "fa" && fa.length > 0) return fa;
	return en;
};

const normalizeEffectiveness = (value: unknown): number => {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return DEFAULT_COUNTER_EFFECTIVENESS;
	return Math.min(100, Math.max(0, parsed));
};

const localizeActionTemplate = (
	action: Record<string, unknown>,
	lang: Lang,
): Record<string, unknown> => {
	const mapping =
		action.mitre_mapping && typeof action.mitre_mapping === "object"
			? (action.mitre_mapping as Record<string, unknown>)
			: {};
	const techniquesRaw = Array.isArray(mapping.techniques)
		? (mapping.techniques as Array<Record<string, unknown>>)
		: [];
	const localizedTechniques = techniquesRaw.map((technique) => ({
		...technique,
		name: pickLocalizedText(lang, technique.name, technique.name_fa),
	}));

	return {
		...action,
		name: pickLocalizedText(lang, action.name, action.name_fa),
		description: pickLocalizedText(lang, action.description, action.description_fa),
		mitre_mapping: {
			...mapping,
			techniques: localizedTechniques,
			tactics: pickLocalizedArray(lang, mapping.tactics, mapping.tactics_fa),
		},
	};
};

const localizeCounterTemplate = (
	counter: Record<string, unknown>,
	lang: Lang,
): Record<string, unknown> => {
	const list = Array.isArray(counter.countered_by)
		? (counter.countered_by as Array<Record<string, unknown>>)
		: [];
	return {
		...counter,
		countered_by: list.map((entry) => ({
			...entry,
			effectiveness: normalizeEffectiveness(entry.effectiveness),
			description: pickLocalizedText(
				lang,
				entry.description,
				entry.description_fa,
			),
		})),
	};
};

const localizeBlackMarketTemplate = (
	item: Record<string, unknown>,
	lang: Lang,
): Record<string, unknown> => {
	const effect =
		item.effect && typeof item.effect === "object"
			? (item.effect as Record<string, unknown>)
			: {};
	return {
		...item,
		name: pickLocalizedText(lang, item.name, item.name_fa),
		description: pickLocalizedText(lang, item.description, item.description_fa),
		effect: {
			...effect,
			description: pickLocalizedText(
				lang,
				effect.description,
				effect.description_fa,
			),
		},
	};
};

const localizeItem = (
	item: PreparedCatalogItem,
	lang: Lang,
): PreparedCatalogItem => ({
	...item,
	name: pickLocalizedText(lang, item.name, item.name_fa),
	description: pickLocalizedText(lang, item.description, item.description_fa),
	detection_strategy: pickLocalizedText(
		lang,
		item.detection_strategy,
		item.detection_strategy_fa,
	),
	tactics: pickLocalizedArray(lang, item.tactics, item.tactics_fa),
	procedure_examples: item.procedure_examples.map((example) => ({
		source_name: pickLocalizedText(
			lang,
			example.source_name,
			example.source_name_fa,
		),
		summary: pickLocalizedText(lang, example.summary, example.summary_fa),
	})),
	mitigations: item.mitigations.map((mitigation) => ({
		id: mitigation.id,
		name: pickLocalizedText(lang, mitigation.name, mitigation.name_fa),
		description: pickLocalizedText(
			lang,
			mitigation.description,
			mitigation.description_fa,
		),
	})),
	templates: {
		actions: item.templates.actions.map((action) =>
			localizeActionTemplate(action, lang),
		),
		action_counters: item.templates.action_counters.map((counter) =>
			localizeCounterTemplate(counter, lang),
		),
		black_market: item.templates.black_market.map((marketItem) =>
			localizeBlackMarketTemplate(marketItem, lang),
		),
	},
});

const loadCatalog = async (): Promise<PreparedCatalogRoot> => {
	if (cachedCatalog) {
		return cachedCatalog;
	}

	const filePath = path.join(process.cwd(), "data", "attack-prepared-catalog.json");
	const raw = await fs.readFile(filePath, "utf8");
	cachedCatalog = JSON.parse(raw) as PreparedCatalogRoot;
	return cachedCatalog;
};

export async function GET(request: Request) {
	try {
		const url = new URL(request.url);
		const id = url.searchParams.get("id");
		const query = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
		const lang: Lang = url.searchParams.get("lang") === "fa" ? "fa" : "en";
		const summaryOnly = url.searchParams.get("summary") === "true";
		const limit = Math.max(
			1,
			Math.min(500, Number(url.searchParams.get("limit") ?? 80) || 80),
		);

		const catalog = await loadCatalog();
		const items = catalog.items;

		if (id) {
			const found = items.find((item) => item.id === id);
			if (!found) {
				return NextResponse.json(
					{ error: "Prepared catalog item not found" },
					{ status: 404 },
				);
			}
			return NextResponse.json(localizeItem(found, lang));
		}

		let filtered = items;
		if (query.length > 0) {
			filtered = items.filter((item) => {
				const haystack = [
					item.name,
					item.name_fa ?? "",
					item.external_id ?? "",
					item.description,
					item.description_fa ?? "",
					item.detection_strategy,
					item.detection_strategy_fa ?? "",
					item.tactics.join(" "),
					(item.tactics_fa ?? []).join(" "),
					item.mitigations.map((mitigation) => mitigation.name).join(" "),
					item.mitigations.map((mitigation) => mitigation.name_fa ?? "").join(" "),
				]
					.join(" ")
					.toLowerCase();
				return haystack.includes(query);
			});
		}

		const limited = filtered.slice(0, limit);

		if (summaryOnly) {
			const summary = limited.map((item) => ({
				id: item.id,
				external_id: item.external_id,
				name: pickLocalizedText(lang, item.name, item.name_fa),
				tactics: pickLocalizedArray(lang, item.tactics, item.tactics_fa),
				mitigations_count: item.mitigations.length,
			}));

			return NextResponse.json({
				version: catalog.version,
				source: catalog.source,
				total_items: catalog.total_items,
				filtered_count: filtered.length,
				items: summary,
			});
		}

		return NextResponse.json({
			version: catalog.version,
			source: catalog.source,
			total_items: catalog.total_items,
			filtered_count: filtered.length,
			items: limited.map((item) => localizeItem(item, lang)),
		});
	} catch (error) {
		console.error("Prepared catalog route error:", error);
		return NextResponse.json(
			{ error: "Failed to load prepared attack catalog" },
			{ status: 500 },
		);
	}
}
