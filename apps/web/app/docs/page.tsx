"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@workspace/ui/components/accordion";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";
import {
	ArrowDown,
	BookOpen,
	ChartNoAxesCombined,
	ChevronLeft,
	CircleHelp,
	ClipboardList,
	Eye,
	FileCheck2,
	Gamepad2,
	GitBranch,
	Landmark,
	LayoutDashboard,
	LinkIcon,
	LockKeyhole,
	type LucideIcon,
	MessageSquareText,
	MonitorDot,
	Network,
	Route,
	Search,
	ShieldCheck,
	Sparkles,
	Target,
	Trophy,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
	ADMIN_LIFECYCLE_STEPS,
	ADMIN_PAGES,
	ANALYTICS_METRICS,
	type CalloutTone,
	CITY_WATER_EXAMPLE,
	CURRENT_FLOW_ITEMS,
	CURRENT_FLOW_USAGE,
	FAQ_ITEMS,
	GAME_DOCS_BADGES,
	GAME_DOCS_LINKS,
	GAME_DOCS_SECTIONS,
	GAME_DOCS_TABS,
	GAME_MODEL_NODES,
	GAME_PHASES,
	type GameDocsSection,
	type GameDocsTab,
	GLOSSARY_ITEMS,
	GOVERNMENT_ORDER_TYPES,
	LOCK_REASONS,
	MODEL_COMPARISON_ROWS,
	MONITORING_EVENTS,
	PLAYER_GUIDE_STEPS,
	PLAYER_QUICK_CARDS,
	ROLE_GUIDES,
} from "@/lib/gameDocsContent";

const TAB_ICONS: Record<GameDocsTab, LucideIcon> = {
	player: Gamepad2,
	government: Landmark,
	coach: ShieldCheck,
	quick: ClipboardList,
	glossary: BookOpen,
};

const SECTION_ICONS: Record<string, LucideIcon> = {
	intro: Sparkles,
	"old-vs-new": GitBranch,
	"core-model": Network,
	roles: ShieldCheck,
	phases: Trophy,
	"player-guide": Gamepad2,
	"government-guide": Landmark,
	"admin-guide": FileCheck2,
	"current-flow": Route,
	monitoring: MonitorDot,
	analytics: ChartNoAxesCombined,
	communication: MessageSquareText,
	"black-market": Sparkles,
	locks: LockKeyhole,
	"city-water-example": Target,
	faq: CircleHelp,
	glossary: BookOpen,
};

const CALLOUT_STYLES: Record<CalloutTone, string> = {
	tip: "border-emerald-300/25 bg-emerald-500/10 text-emerald-50",
	warning: "border-amber-300/30 bg-amber-500/10 text-amber-50",
	example: "border-cyan-300/25 bg-cyan-500/10 text-cyan-50",
	admin: "border-violet-300/25 bg-violet-500/10 text-violet-50",
	government: "border-rose-300/25 bg-rose-500/10 text-rose-50",
	player: "border-sky-300/25 bg-sky-500/10 text-sky-50",
};

const CALLOUT_ICONS: Record<CalloutTone, LucideIcon> = {
	tip: Sparkles,
	warning: ShieldCheck,
	example: Target,
	admin: FileCheck2,
	government: Landmark,
	player: Gamepad2,
};

const ADMIN_APP_URL =
	process.env.NEXT_PUBLIC_ADMIN_APP_URL ??
	(process.env.NODE_ENV === "development" ? "http://localhost:7008" : "");

const adminHref = (path: string) =>
	ADMIN_APP_URL ? `${ADMIN_APP_URL.replace(/\/$/, "")}${path}` : path;

const searchTextForSection = (section: GameDocsSection) =>
	[
		section.title,
		section.eyebrow,
		section.summary,
		...(section.bullets ?? []),
		...(section.steps ?? []),
		...(section.keywords ?? []),
		...(section.callouts?.flatMap((callout) => [callout.title, callout.body]) ??
			[]),
	].join(" ");

export default function DocsPage() {
	const [activeTab, setActiveTab] = useState<GameDocsTab>("player");
	const [query, setQuery] = useState("");

	const sections = useMemo(() => {
		const needle = query.trim().toLocaleLowerCase("fa-IR");
		return GAME_DOCS_SECTIONS.filter((section) =>
			section.tabs.includes(activeTab),
		).filter((section) => {
			if (!needle) return true;
			return searchTextForSection(section)
				.toLocaleLowerCase("fa-IR")
				.includes(needle);
		});
	}, [activeTab, query]);

	const activeTabMeta = GAME_DOCS_TABS.find((tab) => tab.id === activeTab);

	return (
		<main dir="rtl" className="min-h-screen bg-zinc-950 text-zinc-100">
			<header className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(8,145,178,.18),rgba(24,24,27,.96)_40%,rgba(132,204,22,.12))]">
				<div className="mx-auto max-w-[1500px] px-4 py-10 lg:px-8">
					<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
						<div>
							<div className="flex flex-wrap gap-2">
								{GAME_DOCS_BADGES.map((badge) => (
									<Badge
										key={badge}
										className="rounded-md border border-white/10 bg-white/10 px-3 py-1 text-zinc-100"
									>
										{badge}
									</Badge>
								))}
							</div>
							<h1 className="mt-6 text-3xl font-black leading-tight text-white md:text-5xl">
								راهنمای شبیه‌ساز عملیات سایبری
							</h1>
							<p className="mt-4 max-w-4xl text-sm leading-8 text-zinc-300 md:text-base">
								یک بازی آموزشی نوبتی برای تمرین تصمیم‌گیری، دفاع، هماهنگی تیمی،
								مدیریت بحران و تحلیل اثرات عملیاتی.
							</p>
							<Alert className="mt-6 max-w-4xl rounded-lg border-amber-300/25 bg-amber-500/10 text-amber-50">
								<ShieldCheck className="size-4" />
								<AlertTitle className="text-sm font-bold">
									هشدار ایمنی
								</AlertTitle>
								<AlertDescription className="text-amber-100/85">
									این سامانه برای آموزش و شبیه‌سازی طراحی شده است و شامل
									دستورالعمل واقعی حمله یا سوءاستفاده عملیاتی نیست.
								</AlertDescription>
							</Alert>
						</div>
						<div className="grid gap-3">
							<div className="rounded-lg border border-white/10 bg-zinc-950/55 p-4">
								<div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
									<Network className="size-4 text-cyan-300" />
									مدل v2
								</div>
								<div className="mt-3 grid gap-2 text-sm text-zinc-300">
									{GAME_MODEL_NODES.map((node, index) => (
										<div
											key={node.en}
											className="grid grid-cols-[1fr_auto] items-center gap-3"
										>
											<span>{node.fa}</span>
											{index < GAME_MODEL_NODES.length - 1 ? (
												<ArrowDown className="size-4 text-cyan-300" />
											) : (
												<Trophy className="size-4 text-lime-300" />
											)}
										</div>
									))}
								</div>
							</div>
							<div className="grid grid-cols-2 gap-2">
								<Button
									asChild
									className="rounded-md bg-cyan-500 text-zinc-950 hover:bg-cyan-400"
								>
									<Link href="/player">داشبورد بازیکن</Link>
								</Button>
								<Button
									asChild
									variant="outline"
									className="rounded-md border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10"
								>
									<Link href="/government">مرکز دولت</Link>
								</Button>
							</div>
						</div>
					</div>

					<div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
						<Tabs
							value={activeTab}
							onValueChange={(value) => setActiveTab(value as GameDocsTab)}
							dir="rtl"
							className="min-w-0"
						>
							<TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-lg border border-white/10 bg-zinc-900/75 p-2">
								{GAME_DOCS_TABS.map((tab) => {
									const Icon = TAB_ICONS[tab.id];
									return (
										<TabsTrigger
											key={tab.id}
											value={tab.id}
											className="min-h-11 flex-auto rounded-md border border-transparent px-3 py-2 text-zinc-400 data-[state=active]:border-cyan-300/35 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-50"
										>
											<Icon className="size-4" />
											<span>{tab.label}</span>
										</TabsTrigger>
									);
								})}
							</TabsList>
							{GAME_DOCS_TABS.map((tab) => (
								<TabsContent key={tab.id} value={tab.id} className="mt-3">
									<p className="text-xs leading-6 text-zinc-400">
										{tab.description}
									</p>
								</TabsContent>
							))}
						</Tabs>
						<div className="relative">
							<Search className="absolute right-3 top-3.5 size-4 text-zinc-500" />
							<Input
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="جست‌وجو در راهنما؛ مثلا قفل، دولت یا آنالیتیکس"
								className="h-12 rounded-lg border-white/10 bg-zinc-950/80 pr-10 text-zinc-100 placeholder:text-zinc-500"
							/>
						</div>
					</div>
				</div>
			</header>

			<div className="mx-auto grid max-w-[1500px] gap-7 px-4 py-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
				<aside className="h-fit border-white/10 lg:sticky lg:top-5">
					<div className="rounded-lg border border-white/10 bg-zinc-950/80 p-3">
						<div className="px-2 py-2">
							<div className="text-xs font-bold text-cyan-200">
								{activeTabMeta?.label ?? "راهنما"}
							</div>
							<div className="mt-1 text-xs leading-6 text-zinc-500">
								{sections.length} بخش قابل مشاهده
							</div>
						</div>
						<nav className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
							{sections.map((section, index) => (
								<a
									key={section.id}
									href={`#${section.id}`}
									className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-cyan-100"
								>
									<span className="min-w-0 truncate">
										{index + 1}. {section.title}
									</span>
									<ChevronLeft className="size-3 shrink-0" />
								</a>
							))}
						</nav>
					</div>

					<div className="mt-3 rounded-lg border border-white/10 bg-zinc-950/60 p-3">
						<div className="flex items-center gap-2 px-2 text-xs font-bold text-zinc-300">
							<LinkIcon className="size-4 text-lime-300" />
							لینک‌های کاربردی
						</div>
						<div className="mt-3 grid gap-2">
							{GAME_DOCS_LINKS.map((item) => {
								const href =
									item.app === "admin" ? adminHref(item.href) : item.href;
								const external = href.startsWith("http");
								return (
									<Button
										key={item.label}
										asChild
										variant="outline"
										className="h-auto justify-between rounded-md border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
									>
										<Link
											href={href}
											target={external ? "_blank" : undefined}
											rel={external ? "noreferrer" : undefined}
										>
											<span>{item.labelFa}</span>
											<ChevronLeft className="size-3" />
										</Link>
									</Button>
								);
							})}
						</div>
					</div>
				</aside>

				<div className="min-w-0">
					{sections.length > 0 ? (
						<div className="space-y-12">
							{sections.map((section) => (
								<DocsSectionView key={section.id} section={section} />
							))}
						</div>
					) : (
						<div className="rounded-lg border border-dashed border-white/15 p-10 text-center text-zinc-500">
							نتیجه‌ای برای این جست‌وجو پیدا نشد.
						</div>
					)}
				</div>
			</div>
		</main>
	);
}

function DocsSectionView({ section }: { section: GameDocsSection }) {
	const Icon = SECTION_ICONS[section.id] ?? BookOpen;

	return (
		<section
			id={section.id}
			className="scroll-mt-6 border-b border-white/10 pb-12"
		>
			<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				<div className="min-w-0">
					<div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-cyan-200">
						<Icon className="size-4" />
						{section.eyebrow}
					</div>
					<h2 className="mt-3 text-2xl font-black leading-9 text-white md:text-3xl">
						{section.title}
					</h2>
					<p className="mt-3 max-w-4xl text-sm leading-8 text-zinc-300">
						{section.summary}
					</p>
				</div>
			</div>

			{section.callouts && (
				<div className="mt-5 grid gap-3 lg:grid-cols-2">
					{section.callouts.map((callout) => (
						<DocsCallout
							key={`${callout.title}-${callout.body}`}
							tone={callout.tone}
							title={callout.title}
							body={callout.body}
						/>
					))}
				</div>
			)}

			{section.bullets && (
				<div className="mt-6 grid gap-3 md:grid-cols-2">
					{section.bullets.map((bullet) => (
						<div
							key={bullet}
							className="rounded-lg border border-white/10 bg-zinc-900/40 p-4 text-sm leading-7 text-zinc-300"
						>
							{bullet}
						</div>
					))}
				</div>
			)}

			<SectionBody sectionId={section.id} />
		</section>
	);
}

function SectionBody({ sectionId }: { sectionId: string }) {
	switch (sectionId) {
		case "old-vs-new":
			return <ModelComparison />;
		case "core-model":
			return <CoreModel />;
		case "roles":
			return <RoleCards />;
		case "phases":
			return <PhaseGrid />;
		case "player-guide":
			return <PlayerGuide />;
		case "government-guide":
			return <GovernmentGuide />;
		case "admin-guide":
			return <AdminGuide />;
		case "current-flow":
			return <CurrentFlowGuide />;
		case "monitoring":
			return <MonitoringGuide />;
		case "analytics":
			return <AnalyticsGuide />;
		case "locks":
			return <LockReasonsTable />;
		case "city-water-example":
			return <CityWaterExample />;
		case "faq":
			return <FaqAccordion />;
		case "glossary":
			return <GlossaryTable />;
		default:
			return null;
	}
}

function DocsCallout({
	tone,
	title,
	body,
}: {
	tone: CalloutTone;
	title: string;
	body: string;
}) {
	const Icon = CALLOUT_ICONS[tone];

	return (
		<Alert className={cn("rounded-lg", CALLOUT_STYLES[tone])}>
			<Icon className="size-4" />
			<AlertTitle className="text-sm font-bold">{title}</AlertTitle>
			<AlertDescription className="text-current/85">{body}</AlertDescription>
		</Alert>
	);
}

function ModelComparison() {
	return (
		<div className="mt-6 overflow-x-auto rounded-lg border border-white/10">
			<table className="w-full min-w-[760px] border-collapse text-sm">
				<thead className="bg-zinc-900 text-zinc-200">
					<tr>
						<th className="border-b border-white/10 px-4 py-3 text-right">
							بخش
						</th>
						<th className="border-b border-white/10 px-4 py-3 text-right">
							نسخه قبلی
						</th>
						<th className="border-b border-white/10 px-4 py-3 text-right">
							نسخه v2
						</th>
					</tr>
				</thead>
				<tbody>
					{MODEL_COMPARISON_ROWS.map((row) => (
						<tr key={row.label} className="odd:bg-white/[0.025]">
							<td className="border-b border-white/10 px-4 py-3 font-bold text-cyan-100">
								{row.label}
							</td>
							<td className="border-b border-white/10 px-4 py-3 leading-7 text-zinc-400">
								{row.oldValue}
							</td>
							<td className="border-b border-white/10 px-4 py-3 leading-7 text-zinc-200">
								{row.newValue}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function CoreModel() {
	return (
		<div className="mt-6 space-y-5">
			<div className="rounded-lg border border-cyan-300/15 bg-cyan-500/5 p-4 text-center text-sm font-black leading-8 text-cyan-50 md:text-base">
				هدف
				<span className="px-3 text-cyan-300">↓</span>
				موضوع
				<span className="px-3 text-cyan-300">↓</span>
				زیرموضوع
				<span className="px-3 text-cyan-300">↓</span>
				سناریو
				<span className="px-3 text-cyan-300">↓</span>
				گام
				<span className="px-3 text-cyan-300">↓</span>
				کنش
				<span className="px-3 text-cyan-300">↓</span>
				اثر
			</div>
			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
				{GAME_MODEL_NODES.map((node) => (
					<Card
						key={node.en}
						className="rounded-lg border-white/10 bg-zinc-900/45 py-0 text-zinc-100"
					>
						<CardContent className="p-4">
							<div className="flex items-center justify-between gap-3">
								<div className="font-black text-white">{node.fa}</div>
								<Badge
									dir="ltr"
									className="rounded-md bg-white/10 font-mono text-xs text-zinc-300"
								>
									{node.en}
								</Badge>
							</div>
							<p className="mt-3 text-sm leading-7 text-zinc-400">
								{node.body}
							</p>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}

function RoleCards() {
	return (
		<div className="mt-6 grid gap-3 md:grid-cols-2">
			{ROLE_GUIDES.map((role) => (
				<Card
					key={role.title}
					className="rounded-lg border-white/10 bg-zinc-900/45 py-0 text-zinc-100"
				>
					<CardContent className="p-4">
						<div className="text-base font-black text-white">{role.title}</div>
						<p className="mt-3 text-sm leading-7 text-zinc-400">{role.body}</p>
						<div className="mt-4 flex flex-wrap gap-2">
							{role.tags.map((tag) => (
								<Badge
									key={tag}
									className="rounded-md bg-white/10 text-xs text-zinc-300"
								>
									{tag}
								</Badge>
							))}
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

function PhaseGrid() {
	return (
		<div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
			{GAME_PHASES.map((phase, index) => (
				<div
					key={phase.code}
					className="rounded-lg border border-white/10 bg-zinc-900/45 p-4"
				>
					<div className="flex items-start justify-between gap-3">
						<div className="grid size-8 place-items-center rounded-md bg-lime-400/15 text-sm font-black text-lime-200">
							{index + 1}
						</div>
						<Badge
							dir="ltr"
							className="max-w-full rounded-md bg-white/10 font-mono text-[11px] text-zinc-300"
						>
							{phase.code}
						</Badge>
					</div>
					<div className="mt-4 font-black text-white">{phase.fa}</div>
					<p className="mt-2 text-sm leading-7 text-zinc-400">{phase.body}</p>
				</div>
			))}
		</div>
	);
}

function PlayerGuide() {
	return (
		<div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
			<ol className="grid gap-3">
				{PLAYER_GUIDE_STEPS.map((step, index) => (
					<li
						key={step}
						className="grid grid-cols-[36px_minmax(0,1fr)] items-start gap-3 rounded-lg border border-white/10 bg-zinc-900/40 p-3"
					>
						<span className="grid size-9 place-items-center rounded-md bg-sky-400/15 text-sm font-black text-sky-200">
							{index + 1}
						</span>
						<span className="pt-1 text-sm leading-7 text-zinc-300">{step}</span>
					</li>
				))}
			</ol>
			<div className="grid gap-3">
				{PLAYER_QUICK_CARDS.map((card) => (
					<Card
						key={card.title}
						className="rounded-lg border-sky-300/15 bg-sky-500/5 py-0 text-zinc-100"
					>
						<CardContent className="p-4">
							<div className="flex items-center gap-2 text-sm font-black text-sky-100">
								<CircleHelp className="size-4" />
								{card.title}
							</div>
							<p className="mt-2 text-xs leading-6 text-zinc-400">
								{card.body}
							</p>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}

function GovernmentGuide() {
	return (
		<div className="mt-6 space-y-5">
			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
				{GOVERNMENT_ORDER_TYPES.map((order) => (
					<div
						key={order.code}
						className="rounded-lg border border-rose-300/15 bg-rose-500/5 p-4"
					>
						<Badge
							dir="ltr"
							className="rounded-md bg-white/10 font-mono text-[11px] text-rose-100"
						>
							{order.code}
						</Badge>
						<div className="mt-3 font-black text-white">{order.fa}</div>
						<p className="mt-2 text-sm leading-7 text-zinc-400">{order.body}</p>
					</div>
				))}
			</div>
			<Accordion
				type="single"
				collapsible
				className="rounded-lg border border-white/10 bg-zinc-900/40 px-4"
			>
				<AccordionItem value="government-advanced" className="border-white/10">
					<AccordionTrigger className="text-right text-sm font-bold text-zinc-100 hover:no-underline">
						جزئیات پیشرفته برای دولت و مربی
					</AccordionTrigger>
					<AccordionContent className="text-sm leading-8 text-zinc-400">
						دولت در نمای خود از کاتالوگ دولت برای دیدن هدف‌ها، موضوع‌ها، تیم‌ها،
						کنش‌های قابل دستور و گره‌های مربوط به سمت استفاده می‌کند. در مستندات
						فنی، این داده با مسیر <span dir="ltr">/government/catalog</span>{" "}
						شناخته می‌شود؛ بازیکن عادی نیازی به کار مستقیم با این مسیر ندارد.
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}

function AdminGuide() {
	return (
		<div className="mt-6 grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
			<div className="rounded-lg border border-violet-300/15 bg-violet-500/5 p-4">
				<div className="flex items-center gap-2 font-black text-violet-100">
					<FileCheck2 className="size-4" />
					چرخه انتشار
				</div>
				<ol className="mt-4 grid gap-2">
					{ADMIN_LIFECYCLE_STEPS.map((step, index) => (
						<li
							key={step}
							className="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3 text-sm leading-7 text-zinc-300"
						>
							<span className="grid size-8 place-items-center rounded-md bg-violet-400/15 text-xs font-black text-violet-100">
								{index + 1}
							</span>
							<span>{step}</span>
						</li>
					))}
				</ol>
			</div>
			<div className="rounded-lg border border-white/10 bg-zinc-900/40 p-4">
				<div className="flex items-center gap-2 font-black text-white">
					<LayoutDashboard className="size-4 text-cyan-300" />
					صفحه‌های مدیریتی
				</div>
				<div className="mt-4 grid gap-2 md:grid-cols-2">
					{ADMIN_PAGES.map((page) => (
						<div
							key={page}
							className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300"
						>
							{page}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function CurrentFlowGuide() {
	return (
		<div className="mt-6 grid gap-5 xl:grid-cols-2">
			<div className="rounded-lg border border-cyan-300/15 bg-cyan-500/5 p-4">
				<div className="flex items-center gap-2 font-black text-cyan-100">
					<Route className="size-4" />
					چه چیزهایی در نقشه دیده می‌شود؟
				</div>
				<div className="mt-4 grid gap-2 md:grid-cols-2">
					{CURRENT_FLOW_ITEMS.map((item) => (
						<div
							key={item}
							className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300"
						>
							{item}
						</div>
					))}
				</div>
			</div>
			<div className="rounded-lg border border-lime-300/15 bg-lime-500/5 p-4">
				<div className="flex items-center gap-2 font-black text-lime-100">
					<Eye className="size-4" />
					چطور استفاده می‌شود؟
				</div>
				<ul className="mt-4 grid gap-2">
					{CURRENT_FLOW_USAGE.map((item) => (
						<li key={item} className="text-sm leading-7 text-zinc-300">
							{item}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

function MonitoringGuide() {
	return (
		<div className="mt-6">
			<div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
				{MONITORING_EVENTS.map((event) => (
					<div
						key={event}
						dir="ltr"
						className="rounded-lg border border-white/10 bg-zinc-900/45 px-3 py-3 text-center font-mono text-xs text-zinc-300"
					>
						{event}
					</div>
				))}
			</div>
		</div>
	);
}

function AnalyticsGuide() {
	return (
		<div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
			{ANALYTICS_METRICS.map((metric) => (
				<div
					key={metric}
					className="rounded-lg border border-lime-300/15 bg-lime-500/5 p-4 text-sm font-bold text-lime-50"
				>
					{metric}
				</div>
			))}
		</div>
	);
}

function LockReasonsTable() {
	return (
		<div className="mt-6 overflow-x-auto rounded-lg border border-white/10">
			<table className="w-full min-w-[760px] border-collapse text-sm">
				<thead className="bg-zinc-900 text-zinc-200">
					<tr>
						<th className="border-b border-white/10 px-4 py-3 text-right">
							کد
						</th>
						<th className="border-b border-white/10 px-4 py-3 text-right">
							معنی فارسی
						</th>
					</tr>
				</thead>
				<tbody>
					{LOCK_REASONS.map((reason) => (
						<tr key={reason.code} className="odd:bg-white/[0.025]">
							<td
								dir="ltr"
								className="border-b border-white/10 px-4 py-3 font-mono text-xs text-amber-100"
							>
								{reason.code}
							</td>
							<td className="border-b border-white/10 px-4 py-3 leading-7 text-zinc-300">
								{reason.fa}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function CityWaterExample() {
	return (
		<ol className="mt-6 grid gap-3">
			{CITY_WATER_EXAMPLE.map((item, index) => (
				<li
					key={item}
					className="grid grid-cols-[36px_minmax(0,1fr)] items-start gap-3 rounded-lg border border-white/10 bg-zinc-900/40 p-3"
				>
					<span className="grid size-9 place-items-center rounded-md bg-cyan-400/15 text-sm font-black text-cyan-100">
						{index + 1}
					</span>
					<span className="pt-1 text-sm leading-7 text-zinc-300">{item}</span>
				</li>
			))}
		</ol>
	);
}

function FaqAccordion() {
	return (
		<Accordion
			type="single"
			collapsible
			className="mt-6 rounded-lg border border-white/10 bg-zinc-900/40 px-4"
		>
			{FAQ_ITEMS.map((item, index) => (
				<AccordionItem
					key={item.question}
					value={`faq-${index}`}
					className="border-white/10"
				>
					<AccordionTrigger className="text-right text-sm font-bold text-zinc-100 hover:no-underline">
						{item.question}
					</AccordionTrigger>
					<AccordionContent className="text-sm leading-8 text-zinc-400">
						{item.answer}
					</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	);
}

function GlossaryTable() {
	return (
		<div className="mt-6 overflow-x-auto rounded-lg border border-white/10">
			<table className="w-full min-w-[880px] border-collapse text-sm">
				<thead className="bg-zinc-900 text-zinc-200">
					<tr>
						<th className="border-b border-white/10 px-4 py-3 text-right">
							English term
						</th>
						<th className="border-b border-white/10 px-4 py-3 text-right">
							ترجمه فارسی
						</th>
						<th className="border-b border-white/10 px-4 py-3 text-right">
							توضیح ساده
						</th>
						<th className="border-b border-white/10 px-4 py-3 text-right">
							کاربر اصلی
						</th>
					</tr>
				</thead>
				<tbody>
					{GLOSSARY_ITEMS.map((item) => (
						<tr key={item.en} className="odd:bg-white/[0.025]">
							<td
								dir="ltr"
								className="border-b border-white/10 px-4 py-3 font-mono text-xs text-cyan-100"
							>
								{item.en}
							</td>
							<td className="border-b border-white/10 px-4 py-3 font-bold text-white">
								{item.fa}
							</td>
							<td className="border-b border-white/10 px-4 py-3 leading-7 text-zinc-300">
								{item.body}
							</td>
							<td className="border-b border-white/10 px-4 py-3 text-zinc-400">
								{item.who}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
