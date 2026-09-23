"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

/**
 * The side rail as one panel with tabs, instead of five stacked cards.
 *
 * Stacked, the rail ran several screens tall: the chat and the market sat far
 * below the fold and the page itself scrolled past the decision. Here the rail
 * is exactly one screen tall, only one panel is open at a time, and a tab that
 * is not open counts what arrived while it was away - so nothing is missed by
 * being out of sight.
 */

export interface RailTab {
	key: string;
	label: string;
	icon: LucideIcon;
	/** A running total (events received, messages seen); the badge is the delta. */
	counter?: number;
	content: ReactNode;
}

const faNumber = (value: number): string => value.toLocaleString("fa-IR");

export function SideRail({ tabs }: { tabs: RailTab[] }) {
	const [active, setActive] = useState(tabs[0]?.key ?? "");
	const seen = useRef<Record<string, number>>({});

	// Whatever is on screen counts as read.
	useEffect(() => {
		const tab = tabs.find((item) => item.key === active);
		if (tab?.counter !== undefined) seen.current[tab.key] = tab.counter;
	}, [active, tabs]);

	const current = tabs.find((tab) => tab.key === active) ?? tabs[0];

	return (
		<div className="flex flex-col gap-3 xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)]">
			<div
				className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/70 p-1"
				role="tablist"
			>
				{tabs.map((tab) => {
					const Icon = tab.icon;
					const isActive = tab.key === current?.key;
					const unread =
						tab.counter !== undefined && !isActive
							? Math.max(0, tab.counter - (seen.current[tab.key] ?? 0))
							: 0;
					return (
						<button
							key={tab.key}
							type="button"
							role="tab"
							aria-selected={isActive}
							onClick={() => setActive(tab.key)}
							className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs transition ${
								isActive
									? "bg-cyan-400/15 font-black text-cyan-100"
									: "text-slate-400 hover:bg-white/5 hover:text-slate-200"
							}`}
						>
							<Icon className="size-4" />
							{tab.label}
							{unread > 0 && (
								<span className="rounded-full bg-amber-400/20 px-1.5 text-[10px] tabular-nums text-amber-100">
									{faNumber(unread)}
								</span>
							)}
						</button>
					);
				})}
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto pl-1" role="tabpanel">
				{current?.content}
			</div>
		</div>
	);
}
