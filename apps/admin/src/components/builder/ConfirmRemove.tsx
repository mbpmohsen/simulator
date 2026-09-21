"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";

/**
 * Removal that says what it will take with it before it happens.
 *
 * `consequences` lists everything that goes too; `blockedReason` refuses the
 * removal outright when something outside the tree depends on the item.
 */
export function ConfirmRemove({
	title,
	consequences,
	warning,
	blockedReason,
	onConfirm,
	label = "حذف",
}: {
	title: string;
	consequences: string[];
	warning?: string | null;
	blockedReason?: string | null;
	onConfirm: () => void;
	label?: string;
}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => setOpen(true)}
				className="border-rose-400/30 text-rose-300 hover:bg-rose-500/10"
			>
				<Trash2 className="size-4" /> {label}
			</Button>
			<AlertDialog open={open} onOpenChange={setOpen}>
				<AlertDialogContent
					dir="rtl"
					className="border-white/10 bg-slate-950 text-slate-100"
				>
					<AlertDialogHeader className="text-right">
						<AlertDialogTitle>{title}</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-3 text-sm leading-7 text-slate-400">
								{blockedReason ? (
									<p className="text-orange-200">{blockedReason}</p>
								) : consequences.length > 0 ? (
									<>
										<p>همراه با این مورد، این‌ها هم حذف می‌شوند:</p>
										<ul className="list-inside list-disc space-y-1 text-slate-200">
											{consequences.map((line) => (
												<li key={line}>{line}</li>
											))}
										</ul>
									</>
								) : (
									<p>این مورد زیرمجموعه‌ای ندارد.</p>
								)}
								{warning && !blockedReason && (
									<p className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-500/[0.08] p-2.5 text-amber-100">
										<TriangleAlert className="mt-1 size-4 shrink-0" />
										{warning}
									</p>
								)}
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="gap-2 sm:justify-start">
						{!blockedReason && (
							<AlertDialogAction
								onClick={onConfirm}
								className="bg-rose-400 text-slate-950 hover:bg-rose-300"
							>
								حذف
							</AlertDialogAction>
						)}
						<AlertDialogCancel className="border-white/10 bg-transparent">
							{blockedReason ? "بستن" : "انصراف"}
						</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
