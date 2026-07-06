"use client";

import { Input } from "@workspace/ui/components/input";
import { Link2 } from "lucide-react";
import type { RelatedGameNodeSelection } from "./types";

export function RelatedGameNodePicker({
	value,
	onChange,
}: {
	value: RelatedGameNodeSelection;
	onChange: (value: RelatedGameNodeSelection) => void;
}) {
	return (
		<details className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
			<summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-cyan-200">
				<Link2 className="size-3.5" /> پیوند اختیاری به وضعیت بازی
			</summary>
			<div className="mt-3 grid gap-2 sm:grid-cols-2">
				<Input
					value={value.subjectId}
					onChange={(event) =>
						onChange({ ...value, subjectId: event.target.value })
					}
					placeholder="شناسه موضوع"
					className="border-white/10 bg-slate-950"
				/>
				<Input
					value={value.scenarioId}
					onChange={(event) =>
						onChange({ ...value, scenarioId: event.target.value })
					}
					placeholder="شناسه سناریو"
					className="border-white/10 bg-slate-950"
				/>
				<Input
					value={value.stepId}
					onChange={(event) =>
						onChange({ ...value, stepId: event.target.value })
					}
					placeholder="شناسه گام"
					className="border-white/10 bg-slate-950"
				/>
				<Input
					value={value.eventSeq}
					onChange={(event) =>
						onChange({ ...value, eventSeq: event.target.value })
					}
					inputMode="numeric"
					placeholder="شماره رویداد"
					className="border-white/10 bg-slate-950"
				/>
			</div>
		</details>
	);
}
