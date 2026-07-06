"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import {
	BookOpen,
	ChevronLeft,
	Gamepad2,
	Landmark,
	Search,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
	GAME_DOCS_QUICK_CARDS,
	GAME_DOCS_SECTIONS,
	type GameDocsRole,
} from "@/lib/gameDocsContent";

const ROLE_TABS: Array<{
	id: GameDocsRole;
	label: string;
	icon: typeof Gamepad2;
}> = [
	{ id: "player", label: "بازیکن", icon: Gamepad2 },
	{ id: "government", label: "دولت", icon: Landmark },
	{ id: "coach", label: "مدیر / مربی", icon: ShieldCheck },
];

export default function DocsPage() {
	const [role, setRole] = useState<GameDocsRole>("player");
	const [query, setQuery] = useState("");
	const sections = useMemo(() => {
		const needle = query.trim().toLocaleLowerCase("fa");
		return GAME_DOCS_SECTIONS.filter((section) =>
			section.roles.includes(role),
		).filter(
			(section) =>
				!needle ||
				[
					section.title,
					section.eyebrow,
					...section.paragraphs,
					...(section.items ?? []),
				]
					.join(" ")
					.toLocaleLowerCase("fa")
					.includes(needle),
		);
	}, [query, role]);

	return (
		<main dir="rtl" className="min-h-screen bg-[#060a14] text-slate-100">
			<header className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(6,182,212,.18),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(139,92,246,.14),transparent_28%)]">
				<div className="mx-auto max-w-[1500px] px-4 py-10 lg:px-8">
					<div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
						<div className="max-w-3xl">
							<div className="flex flex-wrap gap-2">
								<Badge className="bg-cyan-500/15 text-cyan-100">
									راهنمای فارسی v2
								</Badge>
								<Badge className="bg-emerald-500/15 text-emerald-100">
									شبیه‌سازی امن و آموزشی
								</Badge>
							</div>
							<h1 className="mt-5 text-3xl font-black md:text-5xl">
								مرکز راهنمای بازی
							</h1>
							<p className="mt-4 text-sm leading-8 text-slate-400 md:text-base">
								از هدف و موضوع تا سناریو، رأی‌گیری، اثرها، دولت و تحلیل نوبت—بدون
								زبان فنی API.
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button asChild variant="outline">
								<Link href="/player">داشبورد بازیکن</Link>
							</Button>
							<Button asChild variant="outline">
								<Link href="/government">مرکز دولت</Link>
							</Button>
						</div>
					</div>
					<div className="mt-8 grid gap-3 md:grid-cols-[auto_minmax(280px,1fr)]">
						<div className="flex gap-2 overflow-x-auto">
							{ROLE_TABS.map((tab) => {
								const Icon = tab.icon;
								return (
									<button
										key={tab.id}
										type="button"
										onClick={() => setRole(tab.id)}
										className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${role === tab.id ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-100" : "border-white/10 bg-white/[0.025] text-slate-500"}`}
									>
										<Icon className="size-4" />
										{tab.label}
									</button>
								);
							})}
						</div>
						<div className="relative">
							<Search className="absolute right-3 top-3 size-4 text-slate-500" />
							<Input
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="جست‌وجو در راهنما؛ مثلاً قفل، دولت یا سامانه آب…"
								className="border-white/10 bg-slate-950/70 pr-9"
							/>
						</div>
					</div>
				</div>
			</header>

			<div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
				<aside className="h-fit rounded-2xl border border-white/10 bg-slate-950/70 p-3 lg:sticky lg:top-5">
					<div className="px-3 py-2 text-xs font-bold text-slate-500">
						فهرست مطالب
					</div>
					<nav className="max-h-[72vh] space-y-1 overflow-y-auto">
						{sections.map((section, index) => (
							<a
								key={section.id}
								href={`#${section.id}`}
								className="flex items-center justify-between rounded-xl px-3 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-cyan-100"
							>
								<span>
									{index + 1}. {section.title}
								</span>
								<ChevronLeft className="size-3" />
							</a>
						))}
					</nav>
				</aside>

				<div className="min-w-0 space-y-8">
					<section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						{GAME_DOCS_QUICK_CARDS.map(([title, answer]) => (
							<Card
								key={title}
								className="border-cyan-400/10 bg-cyan-500/[0.045] text-slate-100"
							>
								<CardContent className="p-4">
									<div className="flex items-center gap-2 text-sm font-black">
										<Sparkles className="size-4 text-cyan-300" />
										{title}
									</div>
									<p className="mt-2 text-xs leading-6 text-slate-400">
										{answer}
									</p>
								</CardContent>
							</Card>
						))}
					</section>

					{sections.map((section) => (
						<section
							key={section.id}
							id={section.id}
							data-doc-section={section.id}
							className="scroll-mt-6 rounded-3xl border border-white/10 bg-slate-950/55 p-5 md:p-7"
						>
							<div className="flex items-start gap-3">
								<div className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">
									<BookOpen className="size-5" />
								</div>
								<div>
									<div className="text-xs text-cyan-300">{section.eyebrow}</div>
									<h2 className="mt-1 text-xl font-black md:text-2xl">
										{section.title}
									</h2>
								</div>
							</div>
							<div className="mt-5 space-y-3 text-sm leading-8 text-slate-300">
								{section.paragraphs.map((paragraph) => (
									<p
										key={paragraph}
										className={
											paragraph.includes("←")
												? "rounded-2xl border border-cyan-400/15 bg-cyan-500/5 p-4 text-center font-bold text-cyan-100"
												: ""
										}
									>
										{paragraph}
									</p>
								))}
							</div>
							{section.items && (
								<div className="mt-5 grid gap-2 md:grid-cols-2">
									{section.items.map((item) => (
										<div
											key={item}
											className="rounded-xl border border-white/8 bg-white/[0.025] p-3 text-sm leading-7 text-slate-300"
										>
											{item}
										</div>
									))}
								</div>
							)}
						</section>
					))}
					{sections.length === 0 && (
						<div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500">
							نتیجه‌ای برای این جست‌وجو پیدا نشد.
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
