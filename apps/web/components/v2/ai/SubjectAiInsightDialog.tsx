"use client";

import type {
	GovernmentCatalogAction,
	GovernmentCatalogSubject,
} from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
	Bot,
	CheckCircle2,
	Clipboard,
	LoaderCircle,
	RefreshCw,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiInsightFactorList } from "@/components/v2/ai/AiInsightFactorList";
import { TypingText } from "@/components/v2/ai/TypingText";
import { getLocalized } from "@/lib/runtimeTranslationsFa";
import {
	formatSubjectAiInsightText,
	RuleBasedAiInsightProvider,
	type SubjectAiInsight,
	type SubjectRuntimeProgress,
} from "@/lib/subjectAiInsightGenerator";

interface SubjectAiInsightDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	aiLevel: number;
	subject: GovernmentCatalogSubject | null;
	runtimeProgress?: SubjectRuntimeProgress;
	actionsByCode: Record<string, GovernmentCatalogAction>;
	currentTurn?: number | null;
	currentPhase?: string | null;
}

const insightProvider = new RuleBasedAiInsightProvider();

const levelLabel = (level: number): string => {
	if (level >= 3) return "تحلیل استراتژیک";
	if (level >= 2) return "تحلیل پیشرفته";
	return "تحلیل سطح پایه";
};

const formatProgress = (value: number | undefined): string =>
	typeof value === "number" && Number.isFinite(value)
		? `${value.toLocaleString("fa-IR")}٪`
		: "هنوز پیشرفتی ثبت نشده";

const formatCriticality = (value: number | null | undefined): string =>
	typeof value === "number" && Number.isFinite(value)
		? value.toLocaleString("fa-IR")
		: "بدون شاخص عددی";

const formatSubjectStatus = (
	status: NonNullable<SubjectRuntimeProgress>["status"],
): string => {
	if (status === "completed") return "تکمیل‌شده";
	if (status === "stalled") return "متوقف‌شده";
	if (status === "active" || !status) return "فعال";
	return String(status);
};

export const SubjectAiInsightDialog = memo(function SubjectAiInsightDialog({
	open,
	onOpenChange,
	aiLevel,
	subject,
	runtimeProgress,
	actionsByCode,
	currentTurn,
	currentPhase,
}: SubjectAiInsightDialogProps) {
	const [insight, setInsight] = useState<SubjectAiInsight | null>(null);
	const [loading, setLoading] = useState(false);
	const [copied, setCopied] = useState(false);
	const [generation, setGeneration] = useState(0);
	const generatedKeyRef = useRef<string | null>(null);
	const subjectTitle = subject
		? getLocalized(subject.title, subject.title_fa)
		: "—";
	const insightText = useMemo(
		() => (insight ? formatSubjectAiInsightText(insight) : ""),
		[insight],
	);

	const generate = useCallback(async () => {
		if (!subject || aiLevel < 1) return;
		setLoading(true);
		setCopied(false);
		try {
			const nextInsight = await insightProvider.generateSubjectInsight({
				aiLevel,
				subject,
				runtimeProgress,
				actionsByCode,
				currentTurn,
				currentPhase,
			});
			setInsight(nextInsight);
			setGeneration((current) => current + 1);
		} finally {
			setLoading(false);
		}
	}, [
		actionsByCode,
		aiLevel,
		currentPhase,
		currentTurn,
		runtimeProgress,
		subject,
	]);

	useEffect(() => {
		if (!open) {
			generatedKeyRef.current = null;
			setInsight(null);
			setLoading(false);
			setCopied(false);
			setGeneration(0);
			return;
		}
		if (!subject || aiLevel < 1) return;
		const generationKey = `${subject.id}:${aiLevel}`;
		if (generatedKeyRef.current === generationKey) return;
		generatedKeyRef.current = generationKey;
		void generate();
	}, [aiLevel, generate, open, subject]);

	const copyInsight = async () => {
		if (!insightText) return;
		await navigator.clipboard.writeText(insightText);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1800);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				dir="rtl"
				className="max-h-[92vh] max-w-4xl overflow-hidden border-cyan-400/20 bg-slate-950 text-slate-100"
			>
				<DialogHeader className="text-right sm:text-right">
					<div className="flex flex-wrap items-center gap-2">
						<Badge className="bg-cyan-500/15 text-cyan-100">
							<Bot className="size-3.5" /> سطح AI{" "}
							{aiLevel.toLocaleString("fa-IR")}
						</Badge>
						<Badge className="bg-violet-500/15 text-violet-100">
							{levelLabel(aiLevel)}
						</Badge>
					</div>
					<DialogTitle className="text-xl font-black">تحلیل AI</DialogTitle>
					<DialogDescription className="text-right text-slate-400">
						{subjectTitle}
					</DialogDescription>
				</DialogHeader>
				<ScrollArea className="max-h-[68vh] pr-1">
					<div className="space-y-4 pl-3">
						<div className="grid gap-3 sm:grid-cols-3">
							<div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3">
								<div className="text-xs text-cyan-100">پیشرفت</div>
								<div className="mt-2 text-xl font-black">
									{formatProgress(runtimeProgress?.progress_percent)}
								</div>
							</div>
							<div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
								<div className="text-xs text-amber-100">ریسک/اهمیت</div>
								<div className="mt-2 text-xl font-black">
									{formatCriticality(subject?.criticality)}
								</div>
							</div>
							<div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3">
								<div className="text-xs text-violet-100">وضعیت</div>
								<div className="mt-2 text-xl font-black">
									{formatSubjectStatus(runtimeProgress?.status)}
								</div>
							</div>
						</div>
						<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
							{loading && !insight ? (
								<div className="flex items-center gap-2 text-sm text-cyan-100">
									<LoaderCircle className="size-4 animate-spin" />
									در حال تولید تحلیل…
								</div>
							) : insight ? (
								<TypingText
									text={insightText}
									resetKey={generation}
									className="whitespace-pre-line text-sm leading-8 text-slate-200"
								/>
							) : (
								<p className="text-sm text-slate-500">
									داده کافی برای تحلیل این موضوع وجود ندارد.
								</p>
							)}
						</div>
						{insight && <AiInsightFactorList insight={insight} />}
					</div>
				</ScrollArea>
				<div className="flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:justify-between">
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							onClick={() => void generate()}
							disabled={loading || !subject || aiLevel < 1}
							className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
						>
							{loading ? (
								<LoaderCircle className="size-4 animate-spin" />
							) : (
								<RefreshCw className="size-4" />
							)}
							بازتولید تحلیل
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => void copyInsight()}
							disabled={!insightText}
							className="border-white/10 bg-white/5"
						>
							{copied ? (
								<CheckCircle2 className="size-4 text-emerald-300" />
							) : (
								<Clipboard className="size-4" />
							)}
							کپی تحلیل
						</Button>
					</div>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						className="border-white/10 bg-white/5"
					>
						بستن
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
});
