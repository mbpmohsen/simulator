import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import {
	Activity,
	AlertTriangle,
	BarChart3,
	BookOpen,
	CheckCircle2,
	ClipboardList,
	Database,
	Gamepad2,
	HelpCircle,
	Home,
	Layers,
	LifeBuoy,
	ListChecks,
	Lock,
	MessageSquareText,
	Rocket,
	Search,
	Shield,
	ShieldCheck,
	Sparkles,
	Swords,
	Target,
	Wrench,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
	title: "مستندات فارسی شبیه‌ساز عملیات سایبری",
	description:
		"راهنمای فارسی، ساده و آموزشی برای استفاده دفاعی از شبیه‌ساز عملیات سایبری مبتنی بر مفاهیم MITRE ATT&CK.",
};

const sectionIds = {
	intro: "intro",
	quickStart: "quick-start",
	concepts: "concepts",
	features: "features",
	sample: "sample",
	reading: "reading",
	faq: "faq",
	troubleshooting: "troubleshooting",
	glossary: "glossary",
	tips: "tips",
} as const;

const navItems = [
	{ href: `#${sectionIds.intro}`, label: "معرفی" },
	{ href: `#${sectionIds.quickStart}`, label: "شروع سریع" },
	{ href: `#${sectionIds.concepts}`, label: "مفاهیم" },
	{ href: `#${sectionIds.features}`, label: "بخش‌ها" },
	{ href: `#${sectionIds.sample}`, label: "سناریوی نمونه" },
	{ href: `#${sectionIds.reading}`, label: "داده‌ها و نتایج" },
	{ href: `#${sectionIds.faq}`, label: "سوالات متداول" },
	{ href: `#${sectionIds.troubleshooting}`, label: "مشکلات رایج" },
	{ href: `#${sectionIds.glossary}`, label: "واژه‌نامه" },
	{ href: `#${sectionIds.tips}`, label: "نکات بهتر" },
];

const quickStartSteps = [
	"اگر پروژه را محلی اجرا می‌کنید، از ریشه repo دستور `pnpm dev` را اجرا کنید. اپ بازیکن طبق اسکریپت پروژه روی `http://localhost:7009` و پنل ادمین روی `http://localhost:7008` اجرا می‌شود.",
	"برای ورود بازیکن، مسیر `/login` را باز کنید و حساب بسازید یا با حساب قبلی وارد شوید.",
	"اگر بازی هنوز آماده نیست، ادمین باید در مسیر `/configuration` بازی، تیم‌ها، اکشن‌ها و تنظیمات نوبت‌ها را آماده کند.",
	"بعد از ورود، صفحه اصلی `/` را ببینید: وضعیت بازی، نوبت، اعتبار تیم، عملیات‌ها، هدف‌ها، رویدادهای زنده و چت تیمی در همین صفحه هستند.",
	"در فاز درست، هدف یا عملیات آموزشی را انتخاب کنید و با دکمه ثبت، رأی تیمی خود را ارسال کنید.",
];

const sampleScenarioSteps = [
	"ادمین در پنل `/configuration` وارد مرحله اکشن‌ها می‌شود و حالت «آماده» را انتخاب می‌کند.",
	"از کاتالوگ آماده، یک تکنیک آموزشی را با توجه به نام، شناسه، تاکتیک‌ها، راهبرد تشخیص و کاهنده‌ها مرور می‌کند.",
	"با گزینه «اعمال سریع»، قالب حمله/دفاع/بازار سیاه به بازی اضافه می‌شود و در مرحله مرور، تنظیمات نهایی بررسی می‌شود.",
	"بازیکن‌ها از `/login` وارد می‌شوند. وقتی همه بازیکن‌های لازم حاضر باشند، ادمین بازی را از `/monitoring` شروع می‌کند.",
	"در فاز انتخاب هدف، بازیکن فقط تیم هدف را انتخاب می‌کند. در فاز رأی‌گیری، عملیات دفاعی یا تهاجمی شبیه‌سازی‌شده را انتخاب می‌کند.",
	"اگر آیتم بازار سیاه فعال باشد، بازیکن می‌تواند آن را برای تغییر آموزشی هزینه/احتمال انتخاب کند؛ استفاده از آن اجباری نیست.",
	"بعد از ثبت رأی، رویدادهای زنده، امتیازها، اعتبارها و نتیجه نوبت را دنبال کنید.",
	"در پایان، نتیجه را از دید دفاعی بخوانید: چه رفتاری دیده شد، چه دفاعی اثر داشت و تیم در نوبت بعدی چه تصمیم امن‌تری می‌گیرد.",
];

const faqItems = [
	{
		question: "آیا این ابزار برای هک واقعی است؟",
		answer:
			"خیر. این ابزار برای آموزش، آگاهی، تمرین دفاعی و شبیه‌سازی مجاز ساخته شده است. مستندات و خود سناریوها نباید برای دسترسی غیرمجاز، سوءاستفاده یا اجرای حمله واقعی استفاده شوند.",
	},
	{
		question: "آیا برای افراد مبتدی مناسب است؟",
		answer:
			"بله، اگر از مسیر ساده شروع کنید: اول ورود، بعد مشاهده وضعیت تیم، سپس انتخاب هدف و رأی دادن. مفاهیم پیچیده‌تر مثل تحلیل نوبت، کاتالوگ آماده و دستور زنده (Directive) را می‌توانید بعداً یاد بگیرید.",
	},
	{
		question: "MITRE ATT&CK یعنی چه؟",
		answer:
			"MITRE ATT&CK یک پایگاه دانش برای دسته‌بندی رفتارهای شناخته‌شده مهاجمان است. در این برنامه از آن برای فهم مفهومی تاکتیک‌ها، تکنیک‌ها و راهکارهای دفاعی استفاده می‌شود، نه برای آموزش اجرای حمله واقعی.",
	},
	{
		question: "از کجا شروع کنم؟",
		answer:
			"اگر بازیکن هستید، از `/login` شروع کنید و بعد صفحه اصلی `/` را دنبال کنید. اگر ادمین هستید، اول `/configuration` را کامل کنید، سپس از `/monitoring` بازی را شروع و کنترل کنید.",
	},
	{
		question: "چرا بعضی تکنیک‌ها سخت هستند؟",
		answer:
			"چون بعضی رفتارها چند مرحله دارند یا با چند تاکتیک مرتبط هستند. در بازی، هزینه، احتمال موفقیت، ضدعملیات و نیاز به انتخاب هدف می‌تواند سختی تصمیم را نشان دهد.",
	},
	{
		question: "آیا می‌توانم سناریوی خودم را بسازم؟",
		answer:
			"در نقش ادمین، بله. صفحه `/configuration` هم حالت آماده دارد و هم حالت دستی برای ساخت اکشن حمله، اکشن دفاع، رابطه کانتر و آیتم بازار سیاه. بازیکن عادی از صفحه بازی سناریو نمی‌سازد.",
	},
	{
		question: "آیا داده‌ها به‌روز هستند؟",
		answer:
			"در وضعیت فعلی repo، کاتالوگ آماده از `MITRE ATT&CK Enterprise 17.1 (Translated)` ساخته شده و فایل آماده ۶۷۹ آیتم دارد. زمان تولید فایل آماده در داده repo برابر با ۲۰۲۶-۰۲-۱۹ است. این جمله ادعا نمی‌کند که این نسخه آخرین نسخه منتشرشده MITRE است.",
	},
];

const glossaryItems = [
	{
		term: "حمله (Attack)",
		description:
			"یک اقدام شبیه‌سازی‌شده در بازی که رفتار مهاجم را به شکل مفهومی نشان می‌دهد.",
	},
	{
		term: "دفاع (Defense)",
		description:
			"اقدامی برای کاهش اثر حمله، تشخیص رفتار مشکوک یا محدود کردن ریسک در سناریوی آموزشی.",
	},
	{
		term: "تاکتیک (Tactic)",
		description: "هدف کلی یک رفتار؛ مثلا اکتشاف، دسترسی اولیه یا اثرگذاری.",
	},
	{
		term: "تکنیک (Technique)",
		description:
			"روش کلی رسیدن به یک تاکتیک. در این برنامه تکنیک‌ها به اکشن‌های آموزشی وصل می‌شوند.",
	},
	{
		term: "شبیه‌سازی (Simulation)",
		description:
			"اجرای کنترل‌شده و امن یک وضعیت آموزشی، بدون دستور واقعی یا دسترسی غیرمجاز.",
	},
	{
		term: "سناریو (Scenario)",
		description:
			"چیدمان بازی شامل تیم‌ها، اکشن‌ها، هدف‌ها، نوبت‌ها، امتیاز و قوانین.",
	},
	{
		term: "عامل تهدید (Threat Actor)",
		description:
			"شخص یا گروه فرضی که در دنیای واقعی می‌تواند رفتار مهاجمانه داشته باشد؛ در اینجا فقط برای فهم الگوها مطرح می‌شود.",
	},
	{
		term: "تشخیص (Detection)",
		description:
			"نشانه‌ها و فکر دفاعی برای فهمیدن اینکه یک رفتار مشکوک رخ داده یا نه.",
	},
	{
		term: "کاهش تهدید (Mitigation)",
		description:
			"اقدام یا کنترل دفاعی که احتمال یا اثر یک رفتار خطرناک را کم می‌کند.",
	},
	{
		term: "ریسک (Risk)",
		description:
			"ترکیبی از احتمال رخداد و اثر آن. در بازی، هزینه، احتمال موفقیت و امتیاز می‌توانند نشانه‌های آموزشی ریسک باشند.",
	},
];

function DocSection({
	id,
	eyebrow,
	title,
	children,
}: {
	id: string;
	eyebrow: string;
	title: string;
	children: ReactNode;
}) {
	return (
		<section id={id} className="scroll-mt-24">
			<div className="mb-4">
				<div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
					{eyebrow}
				</div>
				<h2 className="mt-2 text-2xl font-black text-white md:text-3xl">
					{title}
				</h2>
			</div>
			{children}
		</section>
	);
}

function DocCard({
	title,
	icon,
	children,
}: {
	title: string;
	icon: ReactNode;
	children: ReactNode;
}) {
	return (
		<Card className="border-slate-800 bg-slate-950/72 text-slate-100 shadow-none">
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-base text-slate-50">
					<span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-cyan-500/35 bg-cyan-950/35 text-cyan-200">
						{icon}
					</span>
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3 text-sm leading-7 text-slate-300">
				{children}
			</CardContent>
		</Card>
	);
}

function StepList({ items }: { items: string[] }) {
	return (
		<ol className="space-y-3">
			{items.map((item, index) => (
				<li
					key={item}
					className="grid grid-cols-[2.25rem_1fr] gap-3 rounded-lg border border-slate-800 bg-slate-950/65 p-3 text-sm leading-7 text-slate-300"
				>
					<span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/15 font-mono text-sm font-bold text-cyan-200">
						{index + 1}
					</span>
					<span>{item}</span>
				</li>
			))}
		</ol>
	);
}

function WarningBox({ children }: { children: ReactNode }) {
	return (
		<div className="rounded-lg border border-amber-500/45 bg-amber-950/30 p-4 text-sm leading-7 text-amber-100">
			<div className="mb-2 flex items-center gap-2 font-semibold text-amber-200">
				<AlertTriangle className="h-4 w-4" />
				تذکر مهم استفاده امن
			</div>
			{children}
		</div>
	);
}

function GlossaryItem({
	term,
	description,
}: {
	term: string;
	description: string;
}) {
	return (
		<div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
			<div className="font-semibold text-cyan-100">{term}</div>
			<p className="mt-2 text-sm leading-7 text-slate-300">{description}</p>
		</div>
	);
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
	return (
		<details className="group rounded-lg border border-slate-800 bg-slate-950/70 p-4">
			<summary className="cursor-pointer list-none font-semibold text-slate-100 marker:hidden">
				<span className="inline-flex items-center gap-2">
					<HelpCircle className="h-4 w-4 text-cyan-300" />
					{question}
				</span>
			</summary>
			<p className="mt-3 text-sm leading-7 text-slate-300">{answer}</p>
		</details>
	);
}

export default function DocsPage() {
	return (
		<main
			lang="fa"
			dir="rtl"
			className="min-h-screen bg-[linear-gradient(145deg,#05070a_0%,#101827_45%,#05070a_100%)] text-slate-100"
		>
			<div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
				<header className="border-b border-slate-800 pb-6">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="max-w-3xl">
							<div className="flex flex-wrap items-center gap-2">
								<Badge
									variant="outline"
									className="border-cyan-500/55 bg-cyan-950/35 text-cyan-100"
								>
									راهنمای فارسی
								</Badge>
								<Badge
									variant="outline"
									className="border-emerald-500/55 bg-emerald-950/30 text-emerald-100"
								>
									آموزشی و دفاعی
								</Badge>
								<Badge
									variant="outline"
									className="border-slate-600 bg-slate-950/60 text-slate-200"
								>
									مسیر `/docs`
								</Badge>
							</div>
							<h1 className="mt-5 text-3xl font-black leading-tight text-white md:text-5xl">
								مستندات شبیه‌ساز عملیات سایبری
							</h1>
							<p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
								این صفحه برای کاربران تازه‌کار، بازیکن‌ها و مربی‌های امنیتی نوشته
								شده است تا مفاهیم حمله و دفاع را در محیط بازی، امن و قابل‌فهم یاد
								بگیرند.
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button
								asChild
								className="bg-cyan-700 text-white hover:bg-cyan-600"
							>
								<Link href="/">
									<Home className="h-4 w-4" />
									بازگشت به برنامه
								</Link>
							</Button>
							<Button
								asChild
								variant="outline"
								className="border-slate-600 bg-slate-950/30 text-slate-100 hover:bg-slate-900"
							>
								<Link href="/login">
									<Lock className="h-4 w-4" />
									ورود بازیکن
								</Link>
							</Button>
						</div>
					</div>

					<div className="mt-6 grid gap-3 md:grid-cols-3">
						<div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
							<div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
								<Gamepad2 className="h-4 w-4" />
								محیط بازی
							</div>
							<p className="mt-2 text-sm leading-7 text-slate-300">
								بازیکن‌ها هدف، عملیات، رأی تیمی، رویداد زنده و نتیجه را در یک
								صفحه دنبال می‌کنند.
							</p>
						</div>
						<div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
							<div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
								<ShieldCheck className="h-4 w-4" />
								تمرین دفاعی
							</div>
							<p className="mt-2 text-sm leading-7 text-slate-300">
								تمرکز روی شناخت رفتار، تشخیص، کاهش تهدید و تصمیم‌گیری امن است.
							</p>
						</div>
						<div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
							<div className="flex items-center gap-2 text-sm font-semibold text-violet-100">
								<Database className="h-4 w-4" />
								داده آماده
							</div>
							<p className="mt-2 text-sm leading-7 text-slate-300">
								کاتالوگ repo از داده ترجمه‌شده MITRE ATT&CK Enterprise 17.1 ساخته
								شده است.
							</p>
						</div>
					</div>
				</header>

				<nav
					aria-label="فهرست مستندات"
					className="sticky top-0 z-20 -mx-4 mb-10 overflow-x-auto border-b border-slate-800 bg-slate-950/92 px-4 py-3 backdrop-blur md:-mx-6 md:px-6"
				>
					<div className="flex min-w-max gap-2">
						{navItems.map((item) => (
							<a
								key={item.href}
								href={item.href}
								className="rounded-md border border-slate-800 bg-slate-900/75 px-3 py-2 text-sm text-slate-200 transition-colors hover:border-cyan-500/60 hover:text-cyan-100"
							>
								{item.label}
							</a>
						))}
					</div>
				</nav>

				<div className="space-y-14">
					<WarningBox>
						<p>
							این برنامه فقط برای یادگیری، پژوهش، آگاهی امنیتی و تمرین مجاز در
							محیط کنترل‌شده است. از این برنامه برای هک واقعی، دسترسی غیرمجاز،
							ساخت بدافزار، دور زدن کنترل‌ها یا اجرای دستورهای تهاجمی استفاده
							نکنید. مستندات عمداً فقط مفاهیم، مسیرهای شبیه‌سازی و نگاه دفاعی را
							توضیح می‌دهد.
						</p>
					</WarningBox>

					<DocSection
						id={sectionIds.intro}
						eyebrow="بخش ۱"
						title="معرفی برنامه"
					>
						<div className="grid gap-4 md:grid-cols-2">
							<DocCard
								title="این شبیه‌ساز چیست؟"
								icon={<BookOpen className="h-4 w-4" />}
							>
								<p>
									این برنامه یک بازی/شبیه‌ساز آموزشی برای فهم رفتارهای حمله و
									دفاع سایبری است. داده‌ها و قالب‌ها به مفاهیم MITRE ATT&CK وصل
									می‌شوند تا کاربر بفهمد هر عملیات در چه تاکتیک و تکنیکی قرار
									می‌گیرد.
								</p>
							</DocCard>
							<DocCard
								title="برای چه کسانی است؟"
								icon={<Target className="h-4 w-4" />}
							>
								<p>
									برای دانشجوها، تیم‌های آبی، مربی‌های امنیت، مدیران محصول امنیتی
									و افراد تازه‌کاری مناسب است که می‌خواهند بدون ورود به جزئیات
									خطرناک، رفتار مهاجم و واکنش دفاعی را تمرین کنند.
								</p>
							</DocCard>
							<DocCard
								title="چه مسئله‌ای را حل می‌کند؟"
								icon={<LifeBuoy className="h-4 w-4" />}
							>
								<p>
									یادگیری امنیت معمولاً پر از اصطلاح و جزئیات فنی است. این
									شبیه‌ساز مفاهیم را به تصمیم‌های ساده بازی تبدیل می‌کند: کدام
									عملیات؟ کدام هدف؟ چه هزینه‌ای؟ چه احتمالی؟ چه دفاعی؟
								</p>
							</DocCard>
							<DocCard
								title="چطور به یادگیری کمک می‌کند؟"
								icon={<Sparkles className="h-4 w-4" />}
							>
								<p>
									کاربر نتیجه هر تصمیم را در قالب امتیاز، اعتبار، وضعیت تیم،
									رویداد زنده و تحلیل نوبت می‌بیند. هدف حفظ کردن نام تکنیک‌ها
									نیست؛ هدف فهمیدن رفتار و فکر کردن مثل یک مدافع است.
								</p>
							</DocCard>
						</div>
					</DocSection>

					<DocSection
						id={sectionIds.quickStart}
						eyebrow="بخش ۲"
						title="شروع سریع"
					>
						<div className="grid gap-4 lg:grid-cols-[1fr_360px]">
							<StepList items={quickStartSteps} />
							<div className="rounded-lg border border-cyan-500/35 bg-cyan-950/20 p-4">
								<div className="flex items-center gap-2 font-semibold text-cyan-100">
									<Rocket className="h-4 w-4" />
									اولین کارهای پیشنهادی
								</div>
								<ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
									<li>اول وضعیت بازی و نوبت را بخوانید.</li>
									<li>بعد امتیاز و اعتبار تیم خودتان را بررسی کنید.</li>
									<li>عملیات‌ها را با هزینه و احتمال موفقیت مقایسه کنید.</li>
									<li>هدف را عجولانه انتخاب نکنید؛ وضعیت تیم‌ها را ببینید.</li>
									<li>بعد از هر رأی، رویدادهای زنده را مرور کنید.</li>
								</ul>
							</div>
						</div>
					</DocSection>

					<DocSection
						id={sectionIds.concepts}
						eyebrow="بخش ۳"
						title="مفاهیم اصلی"
					>
						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							<DocCard
								title="MITRE ATT&CK چیست؟"
								icon={<Layers className="h-4 w-4" />}
							>
								<p>
									MITRE ATT&CK یک مدل دانشی برای دسته‌بندی رفتارهای شناخته‌شده
									مهاجمان است. این برنامه از آن برای آموزش مفهومی استفاده می‌کند؛
									یعنی کمک می‌کند بفهمیم یک رفتار در کدام مرحله و با چه هدفی
									انجام می‌شود.
								</p>
							</DocCard>
							<DocCard
								title="تاکتیک (Tactic)"
								icon={<Target className="h-4 w-4" />}
							>
								<p>
									تاکتیک هدف کلی رفتار است. مثلا «اکتشاف» یعنی تلاش برای شناخت
									محیط، و «اثرگذاری» یعنی تلاش برای ایجاد اختلال یا اثر روی
									دارایی. تاکتیک به ما می‌گوید چرا یک رفتار انجام می‌شود.
								</p>
							</DocCard>
							<DocCard
								title="تکنیک (Technique)"
								icon={<Swords className="h-4 w-4" />}
							>
								<p>
									تکنیک روش کلی رسیدن به یک تاکتیک است. در بازی، تکنیک‌ها معمولاً
									به اکشن‌های آموزشی تبدیل می‌شوند؛ مثلا یک اکشن حمله و یک اکشن
									دفاعی مرتبط.
								</p>
							</DocCard>
							<DocCard
								title="زیرتکنیک (Sub-technique)"
								icon={<ListChecks className="h-4 w-4" />}
							>
								<p>
									زیرتکنیک نسخه دقیق‌تر یک تکنیک است. شناسه‌هایی مثل `T1055.011`
									نشان می‌دهند که این مورد زیرمجموعه یک تکنیک بزرگ‌تر است. در
									کاتالوگ آماده چنین شناسه‌هایی دیده می‌شوند.
								</p>
							</DocCard>
							<DocCard
								title="سناریو حمله (Attack Scenario)"
								icon={<ClipboardList className="h-4 w-4" />}
							>
								<p>
									سناریو یعنی چیدمان آموزشی بازی: تیم‌ها، نقش‌ها، اکشن‌ها، هدف‌ها،
									تعداد نوبت، امتیاز پیروزی، ضدعملیات و آیتم‌های بازار سیاه.
								</p>
							</DocCard>
							<DocCard
								title="شبیه‌سازی حمله (Attack Simulation)"
								icon={<Gamepad2 className="h-4 w-4" />}
							>
								<p>
									شبیه‌سازی یعنی اجرای کنترل‌شده یک ایده در بازی. اینجا دستور
									واقعی، بار اجرایی (Payload)، بهره‌برداری (Exploit) یا روش دور
									زدن دفاع آموزش داده نمی‌شود.
								</p>
							</DocCard>
							<DocCard
								title="مسیر حمله (Attack Path)"
								icon={<Activity className="h-4 w-4" />}
							>
								<p>
									مسیر حمله زنجیره تصمیم‌ها و وضعیت‌هاست: انتخاب هدف، انتخاب
									عملیات، اثر دفاع، هزینه، نتیجه نوبت و وضعیت امتیاز. در این
									برنامه مسیر حمله بیشتر به شکل تصمیم‌های مرحله‌ای بازی دیده
									می‌شود.
								</p>
							</DocCard>
							<DocCard
								title="تشخیص، دفاع و تحلیل"
								icon={<Shield className="h-4 w-4" />}
							>
								<p>
									کاتالوگ آماده فیلد راهبرد تشخیص و کاهنده‌ها را نشان می‌دهد. پنل
									بازی رویدادهای زنده را نمایش می‌دهد و پنل آنالیتیکس نتیجه
									نوبت‌ها، جریان اکشن‌ها و مقایسه تصمیم‌ها را بررسی می‌کند.
								</p>
							</DocCard>
						</div>
					</DocSection>

					<DocSection
						id={sectionIds.features}
						eyebrow="بخش ۴"
						title="راهنمای بخش‌های برنامه"
					>
						<div className="grid gap-4 lg:grid-cols-2">
							<DocCard
								title="ورود بازیکن: `/login`"
								icon={<Lock className="h-4 w-4" />}
							>
								<p>
									برای ساخت حساب یا ورود استفاده می‌شود. بعد از ورود موفق، توکن
									کاربر در مرورگر نگه داشته می‌شود و کاربر به صفحه اصلی بازی
									می‌رود.
								</p>
								<p>
									اشتباه رایج: اگر نام کاربری تکراری باشد، صفحه به حالت ورود کمک
									می‌کند. اگر ورود انجام نشد، آدرس سرویس پشتیبان (Backend) در
									`NEXT_PUBLIC_CLIENT_URL` یا وضعیت سرویس را بررسی کنید.
								</p>
							</DocCard>
							<DocCard
								title="صفحه اصلی بازیکن: `/`"
								icon={<Gamepad2 className="h-4 w-4" />}
							>
								<p>
									مرکز اصلی بازی است. وضعیت بازی، شناسه بازی، مرحله، نوبت،
									امتیاز پیروزی، اعتبار تیم، اتصال رویداد زنده، عملیات‌ها، هدف‌ها،
									بازار سیاه، تیم‌ها، چت و نتیجه در همین صفحه نمایش داده می‌شود.
								</p>
								<p>
									به مرحله فعلی دقت کنید. در بعضی فازها فقط انتخاب هدف مجاز است
									و در بعضی فازها ثبت عملیات انجام می‌شود.
								</p>
							</DocCard>
							<DocCard
								title="ثبت رأی تیم"
								icon={<CheckCircle2 className="h-4 w-4" />}
							>
								<p>
									این بخش انتخاب‌های شما را خلاصه می‌کند: عملیات، هدف و آیتم بازار
									سیاه. بعد با دکمه ثبت، رأی برای سرور ارسال می‌شود.
								</p>
								<p>
									اشتباه رایج: ثبت رأی بدون عملیات یا بدون هدف در فاز مناسب
									انجام نمی‌شود. پیام خطا را بخوانید و انتخاب ناقص را کامل کنید.
								</p>
							</DocCard>
							<DocCard
								title="عملیات‌های قابل انتخاب"
								icon={<Swords className="h-4 w-4" />}
							>
								<p>
									هر عملیات نام، دسته، هزینه، احتمال موفقیت و دفاع مقابل را نشان
									می‌دهد. عملیات می‌تواند حمله، دفاع یا در صورت فعال بودن قابلیت،
									اقدام حکومتی/مدیریتی باشد.
								</p>
								<p>
									فقط به احتمال بالا نگاه نکنید؛ هزینه، هدف و وضعیت تیم‌ها هم در
									تصمیم مهم هستند.
								</p>
							</DocCard>
							<DocCard
								title="اهداف قابل انتخاب"
								icon={<Target className="h-4 w-4" />}
							>
								<p>
									این بخش تیم‌های هدف را با نام، سمت، امتیاز و اعتبار نشان می‌دهد.
									هدف‌گذاری در بازی یک تصمیم آموزشی است و نباید با هدف‌گذاری واقعی
									اشتباه گرفته شود.
								</p>
								<p>
									اشتباه رایج: انتخاب هدف بدون توجه به امتیاز و اعتبار تیم‌ها
									ممکن است تصمیم تیمی را ضعیف کند.
								</p>
							</DocCard>
							<DocCard
								title="بازار سیاه"
								icon={<Sparkles className="h-4 w-4" />}
							>
								<p>
									اگر سناریو آیتم داشته باشد، این بخش آیتم‌هایی مثل افزایش احتمال
									یا کاهش هزینه را نشان می‌دهد. آیتم‌ها هزینه دارند و ممکن است مدت
									یا محدودیت مصرف داشته باشند.
								</p>
								<p>
									اشتباه رایج: بازار سیاه همیشه فعال نیست. اگر پیام «فعلاً آیتمی
									برای خرید وجود ندارد» دیدید، یعنی در سناریوی فعلی آیتمی برای
									شما تعریف نشده است.
								</p>
							</DocCard>
							<DocCard
								title="وضعیت تیم‌ها"
								icon={<ShieldCheck className="h-4 w-4" />}
							>
								<p>
									امتیاز، اعتبار و سمت هر تیم را نشان می‌دهد. تیم فعلی شما در UI
									مشخص‌تر نمایش داده می‌شود تا سریع‌تر وضعیت خودتان را تشخیص دهید.
								</p>
								<p>
									برای تصمیم بهتر، فقط وضعیت خودتان را نبینید؛ اختلاف امتیاز و
									اعتبار تیم‌های دیگر را هم مقایسه کنید.
								</p>
							</DocCard>
							<DocCard
								title="رویدادهای زنده"
								icon={<Activity className="h-4 w-4" />}
							>
								<p>
									رویدادها از جریان زنده (Stream) دریافت می‌شوند و وضعیت‌هایی مثل
									ثبت رأی، اجرای اکشن، پایان بازی یا خطا را نشان می‌دهند. اگر
									اتصال قطع شود، صفحه تلاش می‌کند دوباره وصل شود.
								</p>
								<p>
									بخش «جزئیات خام رویدادها» برای عیب‌یابی است. برای کاربر
									تازه‌کار، متن خلاصه رویداد معمولاً کافی است.
								</p>
							</DocCard>
							<DocCard
								title="چت خصوصی تیم"
								icon={<MessageSquareText className="h-4 w-4" />}
							>
								<p>
									چت برای هماهنگی داخل تیم است. پیام‌ها فقط برای اعضای تیم نمایش
									داده می‌شوند. اگر نقطه API (Endpoint) چت روی سرور فعال نباشد،
									برنامه تا حد امکان پیام را محلی نگه می‌دارد.
								</p>
								<p>بعد از پایان بازی، ارسال پیام جدید غیرفعال می‌شود.</p>
							</DocCard>
							<DocCard
								title="نتیجه نهایی"
								icon={<BarChart3 className="h-4 w-4" />}
							>
								<p>
									وقتی بازی تمام شود، صفحه بازیکن برنده، تیم‌ها، امتیاز و اعتبار
									را نشان می‌دهد و رویدادهای زنده متوقف می‌شوند.
								</p>
								<p>
									نتیجه را فقط برد/باخت نبینید؛ ببینید کدام دفاع‌ها اثر داشتند و
									چه تصمیمی در نوبت‌های بعدی بهتر بود.
								</p>
							</DocCard>
							<DocCard
								title="پنل ادمین: `/configuration`"
								icon={<Wrench className="h-4 w-4" />}
							>
								<p>
									جادوگر پیکربندی چهار مرحله دارد: پایه بازی، اکشن‌ها، کانتر و
									بازار سیاه، بررسی و ارسال. در مرحله اکشن‌ها می‌توان از کاتالوگ
									آماده یا ساخت دستی استفاده کرد.
								</p>
								<p>
									در حالت آماده، جستجو بر اساس نام، شناسه تکنیک و تاکتیک انجام
									می‌شود و جزئیات تشخیص و کاهنده‌ها نمایش داده می‌شود.
								</p>
							</DocCard>
							<DocCard
								title="پنل ادمین: `/monitoring`"
								icon={<Activity className="h-4 w-4" />}
							>
								<p>
									برای کنترل بازی، شروع، بازنشانی (Reset)، پاک کردن رویدادها،
									مشاهده آمادگی تیم‌ها، فیلتر رویدادها و مدیریت دستورهای زنده
									(Directive) استفاده می‌شود.
								</p>
								<p>
									اشتباه رایج: اگر تیم‌ها آماده نیستند، شروع بازی ممکن است رفتار
									مورد انتظار نداشته باشد. اول Readiness را بررسی کنید.
								</p>
							</DocCard>
							<DocCard
								title="پنل ادمین: `/analytics`"
								icon={<BarChart3 className="h-4 w-4" />}
							>
								<p>
									برای دیدن کاتالوگ بازی‌ها، گزارش نوبت‌ها، جزئیات ریاضی، جریان
									اکشن‌ها، مقایسه تصمیم‌ها، نمودارها و وضعیت خام گزارش است.
								</p>
								<p>
									اگر گزارشی نمی‌بینید، یعنی برای بازی یا نوبت انتخاب‌شده هنوز
									داده تحلیلی ذخیره نشده یا شناسه بازی درست انتخاب نشده است.
								</p>
							</DocCard>
						</div>
					</DocSection>

					<DocSection
						id={sectionIds.sample}
						eyebrow="بخش ۵"
						title="راهنمای اجرای یک سناریوی نمونه"
					>
						<div className="grid gap-4 lg:grid-cols-[1fr_360px]">
							<StepList items={sampleScenarioSteps} />
							<div className="rounded-lg border border-emerald-500/35 bg-emerald-950/20 p-4">
								<div className="flex items-center gap-2 font-semibold text-emerald-100">
									<Shield className="h-4 w-4" />
									برداشت دفاعی از سناریو
								</div>
								<p className="mt-3 text-sm leading-7 text-slate-300">
									بعد از سناریو بپرسید: چه نشانه‌ای قابل تشخیص بود؟ کدام دفاع
									ریسک را کم کرد؟ هزینه تصمیم‌ها چه اثری داشت؟ آیا تیم فقط به
									امتیاز فکر کرد یا به پایداری دفاع هم توجه کرد؟
								</p>
							</div>
						</div>
					</DocSection>

					<DocSection
						id={sectionIds.reading}
						eyebrow="بخش ۶"
						title="خواندن داده‌ها و نتایج"
					>
						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							<DocCard
								title="شناسه تکنیک‌ها"
								icon={<Database className="h-4 w-4" />}
							>
								<p>
									شناسه‌هایی مثل `T1498` یا `T1055.011` شناسه MITRE هستند. وجود
									نقطه معمولاً یعنی زیرتکنیک. این شناسه‌ها برای ردیابی و یادگیری
									مفهومی استفاده می‌شوند.
								</p>
							</DocCard>
							<DocCard
								title="نام و توضیح"
								icon={<BookOpen className="h-4 w-4" />}
							>
								<p>
									نام تکنیک یا اکشن را کنار توضیح بخوانید. اگر توضیح سنگین بود،
									اول از خودتان بپرسید: این رفتار چه هدفی دارد و مدافع چه
									نشانه‌ای از آن می‌بیند؟
								</p>
							</DocCard>
							<DocCard
								title="رابطه تاکتیک و تکنیک"
								icon={<Layers className="h-4 w-4" />}
							>
								<p>
									یک تکنیک می‌تواند به یک یا چند تاکتیک وصل باشد. در کاتالوگ
									آماده، تاکتیک‌ها در کنار شناسه و نام نمایش داده می‌شوند. صفحه
									ماتریس کامل ATT&CK در UI فعلی دیده نمی‌شود؛ اما رابطه از طریق
									همین فیلدها استفاده می‌شود.
								</p>
							</DocCard>
							<DocCard
								title="هزینه، احتمال و امتیاز"
								icon={<BarChart3 className="h-4 w-4" />}
							>
								<p>
									هزینه نشان می‌دهد یک تصمیم چقدر از اعتبار تیم مصرف می‌کند.
									احتمال موفقیت عدد آموزشی برای نتیجه احتمالی است. امتیاز نشان
									می‌دهد موفقیت چه اثری روی برد دارد.
								</p>
							</DocCard>
							<DocCard
								title="پیشرفت و وضعیت"
								icon={<Activity className="h-4 w-4" />}
							>
								<p>
									نوبت فعلی، کل نوبت‌ها، آستانه امتیاز، وضعیت بازی و اتصال زنده
									به شما می‌گوید بازی در چه مرحله‌ای است. در آنالیتیکس، پیشرفت
									(Progress) و شاخص‌هایی مثل EV یا SAS برای تحلیل تصمیم‌ها دیده
									می‌شوند.
								</p>
							</DocCard>
							<DocCard
								title="جستجو و فیلتر"
								icon={<Search className="h-4 w-4" />}
							>
								<p>
									در `/configuration` جستجوی تکنیک آماده بر نام، شناسه و تاکتیک
									کار می‌کند. در `/monitoring` فیلتر رویداد بر نوع رویداد، خلاصه
									متن و دامنه نمایش (Scope) اعمال می‌شود. در `/analytics` ابتدا
									بازی و بعد نوبت را انتخاب کنید.
								</p>
							</DocCard>
						</div>
					</DocSection>

					<DocSection id={sectionIds.faq} eyebrow="بخش ۷" title="سوالات متداول">
						<div className="grid gap-3 lg:grid-cols-2">
							{faqItems.map((item) => (
								<FaqItem
									key={item.question}
									question={item.question}
									answer={item.answer}
								/>
							))}
						</div>
					</DocSection>

					<DocSection
						id={sectionIds.troubleshooting}
						eyebrow="بخش ۸"
						title="خطاها و مشکلات رایج"
					>
						<div className="grid gap-4 md:grid-cols-2">
							<DocCard
								title="صفحه باز نمی‌شود"
								icon={<AlertTriangle className="h-4 w-4" />}
							>
								<p>
									مطمئن شوید سرور توسعه (Dev Server) روشن است. اپ بازیکن با
									اسکریپت موجود روی پورت ۷۰۰۹ و پنل ادمین روی پورت ۷۰۰۸ اجرا
									می‌شود. اگر پورت اشغال باشد، خروجی ترمینال مسیر درست را نشان
									می‌دهد.
								</p>
							</DocCard>
							<DocCard
								title="داده بازی نمایش داده نمی‌شود"
								icon={<Database className="h-4 w-4" />}
							>
								<p>
									اگر صفحه اصلی روی «در حال دریافت اطلاعات بازی» می‌ماند یا خطا
									نشان می‌دهد، احتمالاً سرویس پشتیبان (Backend) در
									`NEXT_PUBLIC_CLIENT_URL` در دسترس نیست، توکن منقضی شده، یا
									بازی هنوز پیکربندی نشده است.
								</p>
							</DocCard>
							<DocCard
								title="جستجو یا فیلتر نتیجه نمی‌دهد"
								icon={<Search className="h-4 w-4" />}
							>
								<p>
									در کاتالوگ آماده، مسیر API فعلی حداکثر ۵۰۰ آیتم را در یک پاسخ
									برمی‌گرداند. جستجو را دقیق‌تر کنید؛ مثلا شناسه تکنیک، بخشی از
									نام یا نام تاکتیک را وارد کنید.
								</p>
							</DocCard>
							<DocCard
								title="وضعیت خالی می‌بینم"
								icon={<ClipboardList className="h-4 w-4" />}
							>
								<p>
									پیام‌هایی مثل «عملیاتی برای شما فعال نشده است»، «فعلاً هدفی فعال
									نیست» یا «هنوز رویدادی دریافت نشده است» معمولاً یعنی سناریو
									هنوز آن داده را برای تیم شما فعال نکرده یا بازی هنوز به آن فاز
									نرسیده است.
								</p>
							</DocCard>
							<DocCard
								title="مشکل مرورگر"
								icon={<Wrench className="h-4 w-4" />}
							>
								<p>
									برنامه به قابلیت‌هایی مثل `localStorage`، `sessionStorage`،
									Fetch، Server-Sent Events و پخش صدا وابسته است. مرورگر مدرن
									استفاده کنید و اگر در حالت خصوصی هستید، محدودیت ذخیره‌سازی را
									در نظر بگیرید.
								</p>
							</DocCard>
							<DocCard
								title="مشکل API یا داده محلی"
								icon={<LifeBuoy className="h-4 w-4" />}
							>
								<p>
									پنل ادمین برای کاتالوگ آماده به فایل
									`apps/admin/data/attack-prepared-catalog.json` وابسته است. اگر
									این فایل حذف یا ناقص شود، بخش تکنیک‌های آماده درست کار نمی‌کند.
								</p>
							</DocCard>
						</div>
					</DocSection>

					<DocSection
						id={sectionIds.glossary}
						eyebrow="بخش ۹"
						title="واژه‌نامه کوتاه"
					>
						<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
							{glossaryItems.map((item) => (
								<GlossaryItem
									key={item.term}
									term={item.term}
									description={item.description}
								/>
							))}
						</div>
					</DocSection>

					<DocSection
						id={sectionIds.tips}
						eyebrow="بخش ۱۰"
						title="نکات استفاده بهتر"
					>
						<div className="grid gap-4 md:grid-cols-2">
							<DocCard
								title="یادگیری را ساده شروع کنید"
								icon={<Rocket className="h-4 w-4" />}
							>
								<ul className="space-y-2">
									<li>
										از تاکتیک‌های پایه شروع کنید و بعد سراغ موارد پیچیده‌تر بروید.
									</li>
									<li>تکنیک‌های مرتبط را کنار هم مقایسه کنید.</li>
									<li>
										به جای حفظ کردن نام‌ها، رفتار و هدف هر تکنیک را بفهمید.
									</li>
								</ul>
							</DocCard>
							<DocCard
								title="مثل مدافع فکر کنید"
								icon={<ShieldCheck className="h-4 w-4" />}
							>
								<ul className="space-y-2">
									<li>بعد از هر نوبت، رویدادها و نتیجه را مرور کنید.</li>
									<li>
										از خودتان بپرسید چه چیزی قابل تشخیص بود و چه دفاعی کمک کرد.
									</li>
									<li>
										تصمیم تیمی را با هزینه، احتمال، امتیاز و ریسک آموزشی بسنجید.
									</li>
								</ul>
							</DocCard>
						</div>
					</DocSection>
				</div>
			</div>
		</main>
	);
}
