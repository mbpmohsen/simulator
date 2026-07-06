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
import type { GameEventsStatus } from "@/hooks/useGameEvents";
import {
	eventMessageFa,
	translateEventTypeFa,
} from "@/lib/runtimeTranslationsFa";

const statusLabel: Record<GameEventsStatus, string> = {
	idle: "در انتظار بازی",
	connecting: "در حال اتصال",
	live: "زنده",
	polling: "بازیابی دوره‌ای",
	error: "خطای اتصال",
};

export function GameEventFeed({
	events,
	status,
	error,
}: {
	events: GameEvent[];
	status: GameEventsStatus;
	error?: string | null;
}) {
	return (
		<Card className="border-white/10 bg-slate-950/55 text-slate-100">
			<CardHeader>
				<div className="flex items-center justify-between gap-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<ScrollText className="size-5 text-violet-300" /> رویدادهای بازی
					</CardTitle>
					<Badge
						className={
							status === "live"
								? "bg-emerald-500/15 text-emerald-200"
								: status === "polling"
									? "bg-amber-500/15 text-amber-200"
									: status === "error"
										? "bg-rose-500/15 text-rose-200"
										: "bg-white/5 text-slate-400"
						}
					>
						<Radio
							className={`size-3 ${status === "live" ? "animate-pulse" : ""}`}
						/>
						{statusLabel[status]}
					</Badge>
				</div>
			</CardHeader>
			<CardContent>
				{error && status !== "live" && (
					<div className="mb-3 rounded-xl border border-amber-400/15 bg-amber-500/5 p-3 text-xs leading-6 text-amber-100">
						{error}
					</div>
				)}
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
							event.type === "SCENARIO_STEP_RESOLVED" &&
							payload.result === "success";
						const rejected =
							event.type.includes("REJECTED") || payload.result === "failed";
						return (
							<article
								key={`${event.seq}-${event.type}`}
								className={`rounded-2xl border p-4 ${event.type === "GOVERNMENT_ORDER_ISSUED" ? "border-amber-400/20 bg-amber-500/[0.06]" : event.type === "SCENARIO_STEP_RESOLVED" ? "border-cyan-400/15 bg-cyan-500/[0.05]" : "border-white/8 bg-white/[0.035]"}`}
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
												{translateEventTypeFa(event.type)}
											</h3>
											<span className="font-mono text-[10px] text-slate-600">
												#{event.seq}
											</span>
										</div>
										<p className="mt-1 text-sm leading-7 text-slate-300">
											{eventMessageFa(event)}
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
