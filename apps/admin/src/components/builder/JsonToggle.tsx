"use client";

import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Braces, Check, X } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Raw JSON editing, hidden until asked for.
 *
 * The forms cover the fields that matter for play. Everything else in the v2
 * contract - effects, mitre mappings, visuals - is still reachable here, but
 * it stays out of sight unless the admin opens it on purpose.
 */
export function JsonToggle<T>({
	value,
	onApply,
	label = "ویرایش JSON",
	validate,
}: {
	value: T;
	onApply: (next: T) => void;
	label?: string;
	/** Returns an error message, or null when the parsed value is acceptable. */
	validate?: (parsed: unknown) => string | null;
}) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState("");
	const [error, setError] = useState<string | null>(null);

	// Whenever the value changes underneath - a form edit, another selection -
	// the draft follows it, so the editor never shows a stale copy.
	useEffect(() => {
		setDraft(JSON.stringify(value, null, 2));
		setError(null);
	}, [value]);

	const apply = () => {
		try {
			const parsed: unknown = JSON.parse(draft);
			const problem = validate
				? validate(parsed)
				: parsed === null || typeof parsed !== "object"
					? "مقدار باید یک شیء یا آرایهٔ JSON باشد."
					: null;
			if (problem) {
				setError(problem);
				return;
			}
			onApply(parsed as T);
			setError(null);
		} catch (parseError) {
			setError(
				parseError instanceof Error
					? `JSON معتبر نیست: ${parseError.message}`
					: "JSON معتبر نیست.",
			);
		}
	};

	if (!open) {
		return (
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => setOpen(true)}
				className="border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-100"
			>
				<Braces className="size-4" /> {label}
			</Button>
		);
	}

	return (
		<div className="w-full space-y-3 rounded-2xl border border-violet-400/20 bg-violet-500/[0.04] p-4">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 text-sm font-bold text-violet-100">
					<Braces className="size-4" /> {label}
				</div>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => {
						setOpen(false);
						setDraft(JSON.stringify(value, null, 2));
						setError(null);
					}}
					className="text-slate-400"
				>
					<X className="size-4" /> بستن
				</Button>
			</div>
			<p className="text-[11px] leading-5 text-slate-500">
				همهٔ فیلدها، حتی آن‌هایی که در فرم نیستند. اگر شناسه را اینجا عوض کنید،
				ارجاع‌های دیگر به‌روز نمی‌شوند؛ برای این کار از فرم استفاده کنید.
			</p>
			<Textarea
				dir="ltr"
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				className="min-h-[280px] border-white/10 bg-slate-950 font-mono text-xs leading-6 text-slate-200"
			/>
			{error && (
				<div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">
					{error}
				</div>
			)}
			<Button
				type="button"
				onClick={apply}
				className="bg-violet-400 text-slate-950 hover:bg-violet-300"
			>
				<Check className="size-4" /> اعمال JSON
			</Button>
		</div>
	);
}
