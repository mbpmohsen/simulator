"use client";

import type { ConfigureAllRequestV2, TimeUnit } from "@workspace/trpc";
import { FALLBACK_TIME_UNITS } from "@workspace/trpc";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";
import { loadTimeUnits } from "@/lib/game-plan";
import { faNum, SelectField } from "./fields";

/**
 * Picks `game_config.time_unit` — the imaginary length of one turn.
 *
 * One turn is exactly one unit: with «ماه», turn 1 is month 1. This is a
 * narrative label only and has nothing to do with `turn_duration_seconds`,
 * which is the wall-clock budget for a phase; the two are deliberately kept
 * apart on screen so nobody reads «ماه» as a real countdown.
 *
 * The catalog comes from `GET /admin/time-units`: its labels are the only
 * names a unit has, and its order is meaningful (shortest to longest), so it
 * is never re-sorted. Only the `key` is ever sent back.
 */
export function TimeUnitField({
	plan,
	onChange,
	error,
}: {
	plan: ConfigureAllRequestV2;
	onChange: (plan: ConfigureAllRequestV2) => void;
	error?: string | null;
}) {
	const [units, setUnits] = useState<readonly TimeUnit[]>(FALLBACK_TIME_UNITS);
	const [offline, setOffline] = useState(false);

	useEffect(() => {
		let cancelled = false;
		loadTimeUnits()
			.then((catalog) => {
				if (cancelled || catalog.length === 0) return;
				setUnits(catalog);
				setOffline(false);
			})
			.catch(() => {
				if (!cancelled) setOffline(true);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const current = plan.game_config?.time_unit ?? null;
	const selected = units.find((unit) => unit.key === current) ?? null;
	const turns = Math.max(1, plan.game_config?.num_turns || 1);

	return (
		<Card className="border-white/10 bg-slate-950/55 text-slate-100">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<CalendarClock className="text-cyan-300" /> زمان در داستان بازی
				</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-4 lg:grid-cols-2">
				<SelectField
					label="هر نوبت در داستان چقدر طول می‌کشد؟"
					value={current}
					options={units.map((unit) => ({ value: unit.key, label: unit.name }))}
					onChange={(next) => {
						// The options are the catalog, so a value coming back from the
						// select is always one of its keys.
						const unit = units.find((item) => item.key === next);
						if (!unit) return;
						onChange({
							...plan,
							game_config: { ...plan.game_config, time_unit: unit.key },
						});
					}}
					error={error}
					hint={
						offline
							? "فهرست واحدها از سرور گرفته نشد؛ فهرست پیش‌فرض نمایش داده می‌شود."
							: "سرور این فیلد را الزامی می‌داند؛ بدون آن انتشار انجام نمی‌شود."
					}
				/>
				<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300">
					{selected ? (
						<>
							<div className="font-bold text-slate-100">
								هر نوبت = یک {selected.name}
							</div>
							<div className="text-slate-400">
								نوبت ۱ می‌شود {selected.name} اول، و کل بازی {faNum(turns)}{" "}
								{selected.name} طول می‌کشد.
							</div>
						</>
					) : (
						<div className="text-orange-200">هنوز واحدی انتخاب نشده است.</div>
					)}
					<div className="mt-3 border-t border-white/5 pt-3 text-[11px] leading-5 text-slate-500">
						این فقط یک برچسب روایی است و روی زمان واقعی نوبت‌ها اثری ندارد؛ فشار
						زمانی بازی با «مدت هر نوبت» و مدت فازها تنظیم می‌شود.
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
