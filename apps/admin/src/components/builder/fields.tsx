"use client";

import { Input } from "@workspace/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";

/**
 * Small form controls for the builder's inspectors.
 *
 * Text and number fields keep a local draft and commit on blur or Enter. A
 * commit rewrites the whole plan, re-runs validation and re-renders the tree;
 * doing that per keystroke makes typing in a large plan stutter.
 */

export const faNum = (value: number): string => value.toLocaleString("fa-IR");

export function Field({
	label,
	hint,
	children,
	htmlFor,
	className = "",
}: {
	label: string;
	hint?: ReactNode;
	children: ReactNode;
	htmlFor?: string;
	className?: string;
}) {
	return (
		<div className={`min-w-0 space-y-1.5 ${className}`}>
			<label
				htmlFor={htmlFor}
				className="block text-xs font-bold text-slate-400"
			>
				{label}
			</label>
			{children}
			{hint && (
				<div className="text-[11px] leading-5 text-slate-500">{hint}</div>
			)}
		</div>
	);
}

const INPUT_CLASS =
	"h-9 border-white/10 bg-white/[0.04] text-sm text-slate-100";

export function TextField({
	label,
	value,
	onCommit,
	hint,
	dir,
	mono = false,
	multiline = false,
	placeholder,
	error,
}: {
	label: string;
	value: string | null | undefined;
	onCommit: (value: string) => void;
	hint?: ReactNode;
	dir?: "ltr" | "rtl";
	mono?: boolean;
	multiline?: boolean;
	placeholder?: string;
	error?: string | null;
}) {
	const id = useId();
	const [draft, setDraft] = useState(value ?? "");
	useEffect(() => setDraft(value ?? ""), [value]);
	const commit = () => {
		if (draft !== (value ?? "")) onCommit(draft);
	};
	const className = `${INPUT_CLASS} ${mono ? "font-mono text-xs" : ""} ${error ? "border-orange-400/50" : ""}`;
	return (
		<Field
			label={label}
			htmlFor={id}
			hint={error ? <span className="text-orange-200">{error}</span> : hint}
		>
			{multiline ? (
				<Textarea
					id={id}
					dir={dir}
					value={draft}
					placeholder={placeholder}
					onChange={(event) => setDraft(event.target.value)}
					onBlur={commit}
					className={`min-h-20 ${className} h-auto leading-6`}
				/>
			) : (
				<Input
					id={id}
					dir={dir}
					value={draft}
					placeholder={placeholder}
					onChange={(event) => setDraft(event.target.value)}
					onBlur={commit}
					onKeyDown={(event) => {
						if (event.key === "Enter") commit();
						if (event.key === "Escape") setDraft(value ?? "");
					}}
					className={className}
				/>
			)}
		</Field>
	);
}

export function NumberField({
	label,
	value,
	onCommit,
	hint,
	min,
	max,
	suffix,
	allowEmpty = false,
}: {
	label: string;
	value: number | null | undefined;
	onCommit: (value: number | null) => void;
	hint?: ReactNode;
	min?: number;
	max?: number;
	suffix?: string;
	allowEmpty?: boolean;
}) {
	const id = useId();
	return (
		<Field label={label} htmlFor={id} hint={hint}>
			<NumberInput
				id={id}
				value={value}
				onCommit={onCommit}
				min={min}
				max={max}
				suffix={suffix}
				allowEmpty={allowEmpty}
			/>
		</Field>
	);
}

/** A bare number input with the same commit rules, for tables and grids. */
export function NumberInput({
	id,
	value,
	onCommit,
	min,
	max,
	suffix,
	allowEmpty = false,
	className = "",
	ariaLabel,
	placeholder,
}: {
	id?: string;
	value: number | null | undefined;
	onCommit: (value: number | null) => void;
	min?: number;
	max?: number;
	suffix?: string;
	allowEmpty?: boolean;
	className?: string;
	ariaLabel?: string;
	placeholder?: string;
}) {
	const shown = typeof value === "number" ? String(value) : "";
	const [draft, setDraft] = useState(shown);
	useEffect(() => setDraft(shown), [shown]);
	const commit = () => {
		const trimmed = draft.trim();
		if (trimmed === "") {
			if (allowEmpty && value !== null && value !== undefined) onCommit(null);
			else setDraft(shown);
			return;
		}
		let parsed = Number(trimmed);
		if (!Number.isFinite(parsed)) {
			setDraft(shown);
			return;
		}
		if (min !== undefined) parsed = Math.max(min, parsed);
		if (max !== undefined) parsed = Math.min(max, parsed);
		if (parsed !== value) onCommit(parsed);
		setDraft(String(parsed));
	};
	return (
		<div className={`relative ${className}`}>
			<Input
				id={id}
				dir="ltr"
				inputMode="decimal"
				aria-label={ariaLabel}
				placeholder={placeholder}
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={commit}
				onKeyDown={(event) => {
					if (event.key === "Enter") commit();
					if (event.key === "Escape") setDraft(shown);
				}}
				className={`${INPUT_CLASS} text-left tabular-nums ${suffix ? "pl-8" : ""}`}
			/>
			{suffix && (
				<span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500">
					{suffix}
				</span>
			)}
		</div>
	);
}

export interface SelectOption {
	value: string;
	label: string;
	hint?: string;
}

/** Radix Select refuses an empty value; this stands in for "none". */
const NONE = "__none__";

export function SelectField({
	label,
	value,
	options,
	onChange,
	hint,
	placeholder = "انتخاب کنید",
	allowNone = false,
	noneLabel = "هیچ‌کدام",
	error,
}: {
	label: string;
	value: string | null | undefined;
	options: SelectOption[];
	onChange: (value: string | null) => void;
	hint?: ReactNode;
	placeholder?: string;
	allowNone?: boolean;
	noneLabel?: string;
	error?: string | null;
}) {
	const known = options.some((option) => option.value === value);
	// A value that is not among the options is a broken reference. Show it as
	// one instead of silently displaying the placeholder.
	const broken = Boolean(value) && !known;
	return (
		<Field
			label={label}
			hint={
				broken ? (
					<span className="text-orange-200">
						مقدار فعلی «{value}» در برنامه وجود ندارد؛ یک گزینهٔ معتبر انتخاب
						کنید.
					</span>
				) : error ? (
					<span className="text-orange-200">{error}</span>
				) : (
					hint
				)
			}
		>
			<Select
				dir="rtl"
				value={
					known ? (value as string) : allowNone && !value ? NONE : undefined
				}
				onValueChange={(next) => onChange(next === NONE ? null : next)}
			>
				<SelectTrigger
					className={`h-9 w-full border-white/10 bg-white/[0.04] text-right text-sm ${broken || error ? "border-orange-400/50" : ""}`}
				>
					<SelectValue
						placeholder={broken ? `«${value}» — نامعتبر` : placeholder}
					/>
				</SelectTrigger>
				<SelectContent className="max-h-80">
					{allowNone && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							<span>{option.label}</span>
							{option.hint && (
								<span className="mr-2 text-[10px] text-slate-500">
									{option.hint}
								</span>
							)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</Field>
	);
}

export function ToggleField({
	label,
	checked,
	onChange,
	hint,
}: {
	label: string;
	checked: boolean;
	onChange: (value: boolean) => void;
	hint?: ReactNode;
}) {
	return (
		<div className="space-y-1.5">
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				onClick={() => onChange(!checked)}
				className={`flex h-9 w-full items-center justify-between rounded-md border px-3 text-sm transition ${checked ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100" : "border-white/10 bg-white/[0.04] text-slate-400"}`}
			>
				<span>{label}</span>
				<span
					className={`relative h-4 w-7 rounded-full transition ${checked ? "bg-cyan-400" : "bg-slate-600"}`}
				>
					<span
						className={`absolute top-0.5 size-3 rounded-full bg-slate-950 transition-all ${checked ? "left-0.5" : "left-3.5"}`}
					/>
				</span>
			</button>
			{hint && (
				<div className="text-[11px] leading-5 text-slate-500">{hint}</div>
			)}
		</div>
	);
}

/** A titled group of fields inside an inspector. */
export function Section({
	title,
	icon,
	actions,
	children,
}: {
	title: string;
	icon?: ReactNode;
	actions?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
			<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
				<h3 className="flex items-center gap-2 text-sm font-black text-slate-200">
					{icon}
					{title}
				</h3>
				{actions && <div className="flex flex-wrap gap-2">{actions}</div>}
			</div>
			{children}
		</section>
	);
}
