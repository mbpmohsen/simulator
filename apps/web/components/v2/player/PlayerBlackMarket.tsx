"use client";

import type { BlackMarketItemView } from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { motion } from "framer-motion";
import {
	Ban,
	Coins,
	Gauge,
	LoaderCircle,
	ShoppingCart,
	Store,
	Target,
	Timer,
	TriangleAlert,
} from "lucide-react";
import type { BlackMarketStatus } from "@/hooks/usePlayerBlackMarket";
import { formatActionCodeFa, persianOrNull } from "@/lib/runtimeTranslationsFa";

interface PlayerBlackMarketProps {
	status: BlackMarketStatus;
	items: BlackMarketItemView[];
	message: string | null;
	busyCode: string | null;
	credits: number | null;
	/** Resolves an action code to its Persian name, same join the arena uses. */
	resolveActionName: (code: string) => string;
	onPurchase: (item: BlackMarketItemView) => Promise<boolean>;
	/** null when the numeric id for the v1 purchase call cannot be recovered. */
	resolveItemId: (item: BlackMarketItemView) => number | null;
}

const faNumber = (value: number): string => value.toLocaleString("fa-IR");

/** Same vocabulary as the move cards, so the two read as one system. */
const EFFECT_FA: Record<string, string> = {
	probability_increase: "افزایش شانس موفقیت",
	PROBABILITY_MODIFIER: "تغییر شانس موفقیت",
	cost_decrease: "کاهش هزینه",
	REDUCE_VISIBILITY: "کاهش ردپا",
	SKIP_STEP: "پرش از یک گام",
	REMOVE_ACTIVE_EFFECT: "حذف اثر فعال",
};

/**
 * The server returns a stable code, not display text, so the translation lives
 * here. An unknown code falls through to a neutral sentence rather than leaking
 * SCREAMING_SNAKE_CASE into a Persian interface.
 */
const UNAVAILABLE_FA: Record<string, string> = {
	NOT_YET_AVAILABLE: "هنوز در دسترس نیست؛ در نوبت‌های بعد باز می‌شود.",
	PER_TEAM_LIMIT_REACHED: "سقف خرید تیم شما برای این آیتم پر شده است.",
	OUT_OF_STOCK: "موجودی این آیتم تمام شده است.",
	INSUFFICIENT_CREDITS: "اعتبار کافی برای خرید این آیتم ندارید.",
	ALREADY_ACTIVE_NOT_STACKABLE:
		"این آیتم هم‌اکنون فعال است و روی خودش انباشته نمی‌شود.",
};

const unavailableLabel = (reason: string | null | undefined): string =>
	(reason ? UNAVAILABLE_FA[reason] : null) ??
	"این آیتم در حال حاضر قابل خرید نیست.";

const effectLabel = (item: BlackMarketItemView): string | null => {
	if (!item.effect_type) return null;
	const base = EFFECT_FA[item.effect_type] ?? item.effect_type;
	return item.effect_value === null || item.effect_value === undefined
		? base
		: `${base} ${faNumber(item.effect_value)}`;
};

export default function PlayerBlackMarket({
	status,
	items,
	message,
	busyCode,
	credits,
	resolveActionName,
	onPurchase,
	resolveItemId,
}: PlayerBlackMarketProps) {
	// The endpoint does not exist yet on some deployments. Render nothing rather
	// than showing a broken panel during a live game.
	if (status === "unavailable" || status === "idle") return null;

	return (
		<Card className="border-white/10 bg-slate-950/55 text-slate-100">
			<CardHeader className="pb-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<CardTitle className="flex items-center gap-2 text-base font-black">
						<Store className="size-4 text-amber-300" /> بازار سیاه
					</CardTitle>
					{credits !== null && (
						<Badge className="border border-amber-400/20 bg-amber-400/10 text-amber-100">
							<Coins className="size-3" /> {faNumber(credits)} اعتبار
						</Badge>
					)}
				</div>
			</CardHeader>

			<CardContent className="space-y-3">
				<p className="text-xs leading-6 text-slate-400">
					هر اعتباری که اینجا خرج کنید، یک حرکت کمتر در نوبت‌های بعد است.
				</p>

				{status === "loading" && (
					<div className="grid min-h-24 place-items-center">
						<LoaderCircle className="size-6 animate-spin text-amber-300" />
					</div>
				)}

				{status === "error" && (
					<div className="flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">
						<TriangleAlert className="size-4 shrink-0" />
						دریافت فهرست بازار سیاه ممکن نشد.
					</div>
				)}

				{message && (
					<div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-500/[0.08] p-3 text-sm leading-6 text-amber-100">
						<TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />
						{message}
					</div>
				)}

				{status === "ready" && items.length === 0 && (
					<div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-slate-500">
						در این بازی آیتمی برای خرید تعریف نشده است.
					</div>
				)}

				{items.map((item, index) => {
					// `name` is the identity key and is often the raw code
					// (BM_RED_RECON_DOSSIER): purchases and effects are stored
					// against it, so the server keeps it and sends the readable
					// text alongside. Never render the key itself.
					const raw = item as unknown as Record<string, unknown>;
					const readable = (key: string): string | null => {
						const value = raw[key];
						return typeof value === "string" && value.trim()
							? value.trim()
							: null;
					};
					const name =
						persianOrNull(item.name_fa) ??
						persianOrNull(readable("displayName_fa")) ??
						persianOrNull(readable("display_name_fa")) ??
						persianOrNull(readable("displayName")) ??
						persianOrNull(item.name) ??
						readable("displayName") ??
						formatActionCodeFa(item.name);
					const description =
						item.description_fa?.trim() || item.description?.trim() || null;
					const effect = effectLabel(item);
					const target = item.target_action_code
						? resolveActionName(item.target_action_code)
						: null;
					const affordable = credits === null || credits >= item.cost;
					const blocked = item.available === false;
					const busy = busyCode === item.code;
					const idKnown = resolveItemId(item) !== null;
					const canBuy = !blocked && affordable && idKnown && busyCode === null;
					const remaining =
						typeof item.max_purchases === "number"
							? item.max_purchases - (item.purchases_used ?? 0)
							: null;

					return (
						<motion.article
							key={item.code}
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: blocked ? 0.6 : 1, y: 0 }}
							transition={{ delay: index * 0.04 }}
							className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5"
						>
							<div className="flex flex-wrap items-start justify-between gap-2">
								<div className="min-w-0">
									<h3 className="break-words text-sm font-black text-slate-100">
										{name}
									</h3>
									{item.item_type_fa && (
										<span className="mt-0.5 block text-[10px] text-slate-500">
											{item.item_type_fa}
										</span>
									)}
								</div>
								<Badge className="shrink-0 border border-amber-400/20 bg-amber-400/10 text-amber-100">
									<Coins className="size-3" /> {faNumber(item.cost)}
								</Badge>
							</div>

							{description && (
								<p className="mt-2 line-clamp-2 text-[11px] leading-6 text-slate-400">
									{description}
								</p>
							)}

							<div className="mt-2.5 flex flex-wrap gap-1.5">
								{effect && (
									<span className="inline-flex items-center gap-1 rounded-md border border-violet-400/15 bg-violet-400/[0.07] px-1.5 py-0.5 text-[10px] tabular-nums text-violet-100">
										<Gauge className="size-3" /> {effect}
									</span>
								)}
								{target && (
									<span className="inline-flex max-w-full items-center gap-1 truncate rounded-md border border-cyan-400/15 bg-cyan-400/[0.07] px-1.5 py-0.5 text-[10px] text-cyan-100">
										<Target className="size-3 shrink-0" />
										<span className="truncate">روی «{target}»</span>
									</span>
								)}
								{typeof item.duration_turns === "number" && (
									<span className="inline-flex items-center gap-1 rounded-md border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[10px] tabular-nums text-slate-300">
										<Timer className="size-3" /> {faNumber(item.duration_turns)}{" "}
										نوبت
									</span>
								)}
								{remaining !== null && (
									<span className="inline-flex items-center gap-1 rounded-md border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[10px] tabular-nums text-slate-400">
										{faNumber(Math.max(remaining, 0))} خرید باقی‌مانده
									</span>
								)}
							</div>

							{blocked && (
								<p className="mt-2 flex items-start gap-1.5 text-[11px] leading-6 text-orange-200/80">
									<Ban className="mt-1 size-3 shrink-0" />
									{unavailableLabel(item.unavailable_reason)}
								</p>
							)}

							{/* The server already reports INSUFFICIENT_CREDITS through
							    `available`, so only say it when the server has not. */}
							{!blocked && !affordable && (
								<p className="mt-2 text-[11px] leading-6 text-slate-500">
									اعتبار کافی ندارید.
								</p>
							)}

							{!blocked && affordable && !idKnown && (
								<p className="mt-2 flex items-start gap-1.5 text-[11px] leading-6 text-amber-200/80">
									<TriangleAlert className="mt-1 size-3 shrink-0" />
									شناسهٔ این آیتم در وضعیت بازی یافت نشد؛ تا رفع این مورد خرید
									غیرفعال است.
								</p>
							)}

							<Button
								onClick={() => void onPurchase(item)}
								disabled={!canBuy}
								className="mt-3 w-full bg-amber-400 text-slate-950 hover:bg-amber-300 disabled:opacity-40"
							>
								{busy ? (
									<LoaderCircle className="size-4 animate-spin" />
								) : (
									<ShoppingCart className="size-4" />
								)}
								خرید
							</Button>
						</motion.article>
					);
				})}
			</CardContent>
		</Card>
	);
}
