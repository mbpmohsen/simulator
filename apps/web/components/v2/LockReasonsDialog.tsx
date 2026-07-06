"use client";

import type { LockReason } from "@workspace/trpc";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import { CheckCircle2, LoaderCircle, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { formatLockReasonsForDisplay } from "@/lib/runtimeTranslationsFa";

export function LockReasonList({ reasons }: { reasons: LockReason[] }) {
	const items = formatLockReasonsForDisplay(reasons);
	if (items.length === 0) {
		return (
			<div className="rounded-xl border border-emerald-400/15 bg-emerald-500/5 p-4 text-sm text-emerald-100">
				<CheckCircle2 className="ml-2 inline size-4" /> مانع فعالی ثبت نشده است.
			</div>
		);
	}
	return (
		<div className="space-y-3">
			{items.map((reason, index) => (
				<div
					key={`${reason.code}-${reason.source ?? "none"}-${index}`}
					className="rounded-xl border border-orange-400/15 bg-orange-500/5 p-4"
				>
					<div className="font-mono text-xs text-orange-300">{reason.code}</div>
					<p className="mt-2 text-sm leading-7">{reason.message}</p>
					{reason.source && (
						<div className="mt-2 text-[10px] text-slate-500">
							منبع: {reason.source}
						</div>
					)}
				</div>
			))}
		</div>
	);
}

export function LockReasonsDialog({
	open,
	nodeId,
	reasons,
	loading,
	error,
	onClose,
	title,
}: {
	open: boolean;
	nodeId: string | null;
	reasons: LockReason[] | null;
	loading: boolean;
	error: string | null;
	onClose: () => void;
	title?: string;
}) {
	return (
		<Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
			<DialogContent
				dir="rtl"
				className="border-white/10 bg-slate-950 text-slate-100"
			>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<LockKeyhole className="size-5 text-orange-300" />
						{title ?? "دلایل قفل"}
					</DialogTitle>
					{nodeId && (
						<div
							dir="ltr"
							className="text-left font-mono text-xs text-slate-500"
						>
							{nodeId}
						</div>
					)}
				</DialogHeader>
				{loading ? (
					<div className="grid min-h-32 place-items-center">
						<LoaderCircle className="size-7 animate-spin text-orange-300" />
					</div>
				) : error ? (
					<div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
						{error}
					</div>
				) : (
					<LockReasonList reasons={reasons ?? []} />
				)}
				<Link
					href="/docs#locks"
					className="text-xs text-cyan-300 hover:text-cyan-200"
				>
					کمک می‌خواهید؟ راهنمای دلایل قفل را بخوانید.
				</Link>
			</DialogContent>
		</Dialog>
	);
}
