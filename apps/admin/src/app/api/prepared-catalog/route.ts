import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

interface PreparedCatalogItem {
	id: string;
	external_id: string | null;
	name: string;
	description: string;
	detection_strategy: string;
	procedure_examples: Array<{ source_name: string; summary: string }>;
	mitigations: Array<{ id: string; name: string; description: string }>;
	tactics: string[];
	templates: {
		actions: unknown[];
		action_counters: unknown[];
		black_market: unknown[];
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
			return NextResponse.json(found);
		}

		let filtered = items;
		if (query.length > 0) {
			filtered = items.filter((item) => {
				const haystack = [
					item.name,
					item.external_id ?? "",
					item.description,
					item.tactics.join(" "),
					item.mitigations.map((mitigation) => mitigation.name).join(" "),
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
				name: item.name,
				tactics: item.tactics,
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
			items: limited,
		});
	} catch (error) {
		console.error("Prepared catalog route error:", error);
		return NextResponse.json(
			{ error: "Failed to load prepared attack catalog" },
			{ status: 500 },
		);
	}
}
