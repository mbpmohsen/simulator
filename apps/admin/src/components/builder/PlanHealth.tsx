"use client";

import type { ClientValidationIssue } from "@workspace/trpc";
import { CheckCircle2, ChevronLeft, TriangleAlert } from "lucide-react";
import { faNum } from "./fields";

/**
 * The plan's readiness, always on screen while editing.
 *
 * It re-runs on every change, so a broken link shows up the moment it is made
 * rather than when the admin finally presses "validate".
 */

const GROUP_FA: Record<string, string> = {
	goals: "اهداف",
	subjects: "موضوع‌ها",
	sub_subjects: "زیرموضوع‌ها",
	scenarios: "سناریوها",
	steps: "گام‌ها",
	actions: "کنش‌ها",
	effects: "اثرها",
	members: "اعضا",
	visibility: "نمایش رویدادها",
	general: "عمومی",
};

export function PlanHealth({
	issues,
	serverValidated,
	onOpen,
}: {
	issues: ClientValidationIssue[];
	serverValidated: boolean;
	onOpen: () => void;
}) {
	const groups = new Map<string, number>();
	for (const issue of issues) {
		groups.set(issue.group, (groups.get(issue.group) ?? 0) + 1);
	}
	const clean = issues.length === 0;

	return (
		<button
			type="button"
			onClick={onOpen}
			className={`mb-5 flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border px-4 py-3 text-right text-sm transition hover:brightness-110 ${clean ? "border-emerald-400/20 bg-emerald-500/[0.06]" : "border-amber-400/25 bg-amber-500/[0.06]"}`}
		>
			<span
				className={`flex items-center gap-2 font-black ${clean ? "text-emerald-200" : "text-amber-100"}`}
			>
				{clean ? (
					<CheckCircle2 className="size-4" />
				) : (
					<TriangleAlert className="size-4" />
				)}
				{clean
					? serverValidated
						? "بدون مشکل — سرور هم تأیید کرده"
						: "بدون مشکل — آمادهٔ بررسی سرور"
					: `${faNum(issues.length)} مشکل`}
			</span>
			{!clean && (
				<span className="flex flex-wrap gap-1.5">
					{[...groups.entries()].map(([group, count]) => (
						<span
							key={group}
							className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] tabular-nums text-slate-300"
						>
							{GROUP_FA[group] ?? group} {faNum(count)}
						</span>
					))}
				</span>
			)}
			<span className="mr-auto flex items-center gap-1 text-xs text-slate-400">
				بررسی و انتشار <ChevronLeft className="size-3.5" />
			</span>
		</button>
	);
}
