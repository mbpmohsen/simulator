import type { GameEvent } from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import {
	Activity,
	CheckCircle2,
	Radio,
	ScrollText,
	ShieldAlert,
} from "lucide-react";

const EVENT_LABEL: Record<string, string> = {
	SCENARIO_STEP_RESOLVED: "نتیجه گام سناریو",
	GOVERNMENT_ORDER_ISSUED: "دستور جدید دولت",
	CREDITS_UPDATED: "تغییر اعتبار",
	POINTS_UPDATED: "تغییر امتیاز",
	BLACK_MARKET_ITEM_PURCHASED: "خرید بازار سیاه",
	ACTION_REJECTED: "رد کنش",
	REDUCE_VISIBILITY: "کاهش سطح نمایش",
	STALL_SUBJECT: "توقف موضوع",
	DISABLE_ACTION: "غیرفعال‌شدن کنش",
};

const payloadMessage = (event: GameEvent): string => {
	const message = event.payload.message;
	return typeof message === "string"
		? message
		: "رویداد تازه‌ای در بازی ثبت شد.";
};

export function GameEventFeed({
	events,
	status,
}: {
	events: GameEvent[];
	status: "idle" | "connecting" | "live" | "polling" | "error";
}) {
	return (
		<Card className="border-white/10 bg-slate-950/55 text-slate-100">
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-base">
						<ScrollText className="size-5 text-violet-300" /> رویدادهای بازی
					</CardTitle>
					<Badge
						className={
							status === "live"
								? "bg-emerald-500/15 text-emerald-200"
								: status === "polling"
									? "bg-amber-500/15 text-amber-200"
									: "bg-white/5 text-slate-400"
						}
					>
						<Radio
							className={`size-3 ${status === "live" ? "animate-pulse" : ""}`}
						/>{" "}
						{status === "live"
							? "زنده"
							: status === "polling"
								? "بازیابی دوره‌ای"
								: "در انتظار"}
					</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<div className="max-h-[430px] space-y-3 overflow-y-auto pl-1">
					{events.length === 0 && (
						<div className="rounded-2xl border border-dashed border-white/10 p-9 text-center text-sm text-slate-500">
							<Activity className="mx-auto mb-3 size-8 text-slate-700" />
							هنوز رویدادی برای نقش شما منتشر نشده است.
						</div>
					)}
					{events.map((event) => {
						const payload = event.payload as Record<string, unknown>;
						const success =
							event.type.includes("RESOLVED") && payload.result === "success";
						const rejected =
							event.type.includes("REJECTED") || payload.result === "failed";
						return (
							<article
								key={`${event.seq}-${event.type}`}
								className="rounded-2xl border border-white/8 bg-white/[0.035] p-4"
							>
								<div className="flex items-start gap-3">
									<div
										className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${rejected ? "bg-rose-500/10 text-rose-300" : success ? "bg-emerald-500/10 text-emerald-300" : "bg-violet-500/10 text-violet-300"}`}
									>
										{rejected ? (
											<ShieldAlert className="size-4" />
										) : success ? (
											<CheckCircle2 className="size-4" />
										) : (
											<Activity className="size-4" />
										)}
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<h3 className="text-sm font-bold">
												{EVENT_LABEL[event.type] ?? event.type}
											</h3>
											<span className="font-mono text-[10px] text-slate-600">
												#{event.seq}
											</span>
										</div>
										<p className="mt-1 text-sm leading-7 text-slate-400">
											{payloadMessage(event)}
										</p>
									</div>
								</div>
							</article>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
