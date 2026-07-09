"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@workspace/ui/components/accordion";
import type { SubjectAiInsight } from "@/lib/subjectAiInsightGenerator";

interface AiInsightFactorListProps {
	insight: SubjectAiInsight;
}

const formatMetric = (value: number | null, suffix = ""): string =>
	value === null
		? "داده‌ای ثبت نشده"
		: `${value.toLocaleString("fa-IR")}${suffix}`;

export function AiInsightFactorList({ insight }: AiInsightFactorListProps) {
	const numbers = insight.key_numbers;
	const factors = [
		{
			label: "تعداد زیرموضوع",
			value: numbers.sub_subject_count.toLocaleString("fa-IR"),
		},
		{
			label: "تعداد سناریو",
			value: numbers.scenario_count.toLocaleString("fa-IR"),
		},
		{ label: "تعداد گام", value: numbers.step_count.toLocaleString("fa-IR") },
		{ label: "میانگین هزینه", value: formatMetric(numbers.average_cost) },
		{
			label: "میانگین احتمال موفقیت",
			value: formatMetric(numbers.average_success_probability, "٪"),
		},
		{
			label: "بیشترین امتیاز موفقیت",
			value: formatMetric(numbers.max_points_on_success),
		},
		{
			label: "میانگین وقفه بین کنش‌ها",
			value: formatMetric(numbers.average_cooldown_turns),
		},
		{ label: "اعتماد تحلیل", value: insight.confidence_label_fa },
	];

	return (
		<Accordion
			type="single"
			collapsible
			dir="rtl"
			className="rounded-xl border border-white/10 bg-white/[0.03] px-3 text-right"
		>
			<AccordionItem value="factors" className="border-none">
				<AccordionTrigger className="text-right text-sm text-slate-300 hover:no-underline">
					عوامل خام تحلیل
				</AccordionTrigger>
				<AccordionContent>
					<div className="grid gap-2 sm:grid-cols-2">
						{factors.map((factor) => (
							<div
								key={factor.label}
								className="rounded-lg border border-white/8 bg-slate-950/50 p-3"
							>
								<div className="text-[10px] text-slate-500">{factor.label}</div>
								<div className="mt-1 text-sm font-black text-slate-100">
									{factor.value}
								</div>
							</div>
						))}
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
