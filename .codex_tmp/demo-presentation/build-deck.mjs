import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const TMP_DIR = "/Users/mohsen/Projects/military/simulator/.codex_tmp/demo-presentation";
const FINAL_PPTX = "/Users/mohsen/Projects/military/simulator/cyber-simulator-approval-demo.pptx";
const OUT_DIR = path.join(TMP_DIR, "rendered");

const W = 1280;
const H = 720;
const M = 64;
const FONT = "Vazirmatn, Arial, sans-serif";
const C = {
	canvas: "#FFFFFF",
	ink: "#101114",
	muted: "#5A616D",
	panel: "#F1F3F5",
	line: "#B8BCC4",
	blue: "#2F80ED",
	cyan: "#14A6C8",
	green: "#18A058",
	amber: "#B7791F",
	red: "#C2413B",
	dark: "#151923",
};

function run(text, overrides = {}) {
	return { run: text, textStyle: overrides };
}

function rich(text, fontSize = 24, color = C.ink, bold = false) {
	return {
		runs: [run(text, { fontSize: `${fontSize}px`, typeface: FONT, color, bold })],
		paragraphStyle: { alignment: "right" },
	};
}

function addText(slide, text, x, y, w, h, opts = {}) {
	const box = slide.shapes.add({
		geometry: "textbox",
		name: opts.name,
		position: { left: x, top: y, width: w, height: h },
		fill: "none",
		line: { style: "solid", fill: "none", width: 0 },
	});
	box.text = text;
	box.text.style = {
		fontSize: opts.size ?? 24,
		typeface: opts.font ?? FONT,
		bold: opts.bold ?? false,
		color: opts.color ?? C.ink,
		alignment: opts.align ?? "right",
		verticalAlignment: opts.valign ?? "top",
		autoFit: opts.autoFit ?? "shrinkText",
		insets: { top: 0, right: 0, bottom: 0, left: 0 },
	};
	return box;
}

function addBox(slide, x, y, w, h, fill = C.panel, line = C.line) {
	return slide.shapes.add({
		geometry: "roundRect",
		position: { left: x, top: y, width: w, height: h },
		fill,
		line: { style: "solid", fill: line, width: 1 },
		borderRadius: 10,
	});
}

function addRule(slide, x, y, w, color = C.line, weight = 2) {
	slide.shapes.add({
		geometry: "line",
		position: { left: x, top: y, width: w, height: 0 },
		fill: "none",
		line: { style: "solid", fill: color, width: weight },
	});
}

function addHeader(slide, title, kicker, slideNo) {
	addText(slide, kicker, M, 34, W - 2 * M, 30, {
		size: 18,
		bold: true,
		color: C.blue,
	});
	addText(slide, title, M, 72, W - 2 * M, 76, {
		size: 48,
		bold: true,
		color: C.ink,
	});
	addRule(slide, M, 158, W - 2 * M, C.line, 1);
	addText(slide, String(slideNo).padStart(2, "0"), M, 664, 60, 24, {
		size: 16,
		color: C.muted,
		align: "left",
	});
}

function addNotes(slide, source = "apps/web/app/docs/page.tsx; apps/web/lib/gameDocsContent.ts") {
	slide.speakerNotes.textFrame.setText([
		"[Sources]",
		source,
		"Content adapted for an approval/demo audience from the project documentation.",
	]);
	slide.speakerNotes.setVisible(true);
}

function bullets(slide, items, x, y, w, gap = 66, opts = {}) {
	items.forEach((item, i) => {
		const top = y + i * gap;
		slide.shapes.add({
			geometry: "ellipse",
			position: { left: x + w - 20, top: top + 10, width: 10, height: 10 },
			fill: opts.dot ?? C.blue,
			line: { style: "solid", fill: opts.dot ?? C.blue, width: 0 },
		});
		addText(slide, item, x, top, w - 34, 52, {
			size: opts.size ?? 25,
			color: opts.color ?? C.ink,
			bold: opts.bold ?? false,
		});
	});
}

function stat(slide, value, label, x, y, w, color) {
	addBox(slide, x, y, w, 170, "#F7F8FA", "#D7DBE0");
	addText(slide, value, x + 24, y + 32, w - 48, 60, {
		size: 44,
		bold: true,
		color,
		align: "center",
	});
	addText(slide, label, x + 26, y + 106, w - 52, 42, {
		size: 20,
		color: C.muted,
		align: "center",
	});
}

function flowNode(slide, label, x, y, w, color) {
	addBox(slide, x, y, w, 80, "#F7F8FA", color);
	addText(slide, label, x + 12, y + 22, w - 24, 34, {
		size: 24,
		bold: true,
		color: C.ink,
		align: "center",
	});
}

async function writeBlob(filePath, blob) {
	await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

const presentation = Presentation.create({ slideSize: { width: W, height: H } });

// 1
{
	const slide = presentation.slides.add();
	slide.background.fill = C.canvas;
	addText(slide, "نسخه دمو برای جلسه تصمیم‌گیری", M, 46, W - 2 * M, 36, {
		size: 24,
		bold: true,
		color: C.blue,
	});
	addText(slide, "شبیه‌ساز عملیات سایبری", M, 188, W - 2 * M, 108, {
		size: 78,
		bold: true,
	});
	addText(
		slide,
		"یک بازی امن برای فهمیدن تصمیم، ریسک، دفاع، هماهنگی و بازیابی؛ بدون نیاز به دانش فنی عمیق.",
		M,
		330,
		780,
		98,
		{ size: 30, color: C.muted },
	);
	addRule(slide, M, 506, 420, C.blue, 5);
	addText(slide, "هدف جلسه: تأیید اجرای پایلوت آموزشی", M, 546, 680, 42, {
		size: 28,
		bold: true,
		color: C.dark,
	});
	addNotes(slide);
}

// 2
{
	const slide = presentation.slides.add();
	addHeader(slide, "این پروژه سایبر را قابل لمس می‌کند", "چرا باید اهمیت بدهیم؟", 2);
	stat(slide, "امن", "هیچ دستورالعمل حمله واقعی ندارد", 858, 256, 300, C.green);
	stat(slide, "سریع", "در چند نوبت تصمیم و نتیجه دیده می‌شود", 490, 256, 300, C.blue);
	stat(slide, "عملی", "تیم‌ها ریسک، هزینه و پیامد را تمرین می‌کنند", 122, 256, 300, C.amber);
	addText(
		slide,
		"به جای کلاس خشک امنیت، افراد وارد یک وضعیت واقعی‌نما می‌شوند و می‌بینند تصمیم دیرهنگام چه اثری روی خدمت، اعتماد و بودجه دارد.",
		122,
		500,
		1036,
		80,
		{ size: 28, color: C.ink, bold: true },
	);
	addNotes(slide);
}

// 3
{
	const slide = presentation.slides.add();
	addHeader(slide, "اول خیال همه راحت: این آموزش سوءاستفاده نیست", "مرز ایمنی", 3);
	addBox(slide, 700, 224, 430, 270, "#EFFAF3", "#A8DDB9");
	addText(slide, "چی هست؟", 735, 252, 360, 38, { size: 32, bold: true, color: C.green });
	bullets(
		slide,
		["بازی نوبتی آموزشی", "کنش‌های انتزاعی", "تمرین تصمیم‌گیری و هماهنگی"],
		735,
		318,
		350,
		54,
		{ dot: C.green, size: 23 },
	);
	addBox(slide, 150, 224, 430, 270, "#FFF3F1", "#F0B4AE");
	addText(slide, "چی نیست؟", 185, 252, 360, 38, { size: 32, bold: true, color: C.red });
	bullets(
		slide,
		["ابزار حمله واقعی", "راهنمای فنی سوءاستفاده", "تمرین خارج از محیط کنترل‌شده"],
		185,
		318,
		350,
		54,
		{ dot: C.red, size: 23 },
	);
	addNotes(slide);
}

// 4
{
	const slide = presentation.slides.add();
	addHeader(slide, "مدل بازی از هدف تا نتیجه جلو می‌رود", "منطق خیلی ساده", 4);
	const nodes = [
		["Goal\nهدف", 70, C.blue],
		["Subject\nموضوع", 234, C.cyan],
		["Subtopic\nزیرموضوع", 398, C.green],
		["Scenario\nسناریو", 562, C.amber],
		["Step\nگام", 726, C.red],
		["Action\nکنش", 890, C.blue],
		["Effect\nاثر", 1054, C.dark],
	];
	nodes.forEach(([label, x, color], i) => {
		flowNode(slide, label, x, 300, 128, color);
		if (i < nodes.length - 1) {
			addText(slide, "→", x + 130, 318, 34, 32, {
				size: 30,
				bold: true,
				color: C.muted,
				align: "center",
			});
		}
	});
	addText(
		slide,
		"برای بازی کردن کافی است همین زنجیره را بفهمند: هدف چیست، موضوع کدام است، سناریو چه انتخابی می‌دهد، گام بعدی چیست و نتیجه چه اثری دارد.",
		118,
		462,
		1044,
		88,
		{ size: 27, color: C.ink },
	);
	addNotes(slide);
}

// 5
{
	const slide = presentation.slides.add();
	addHeader(slide, "هر نفر فقط نقش خودش را لازم دارد", "نقش‌ها", 5);
	const roles = [
		["بازیکن مهاجم", "سناریو را جلو می‌برد و فشار انتزاعی ایجاد می‌کند.", C.red],
		["بازیکن مدافع", "پیشگیری، تشخیص، پاسخ و بازیابی را انتخاب می‌کند.", C.blue],
		["دولت", "هدف می‌دهد، موضوع تخصیص می‌دهد، اعتبار و محدودیت اعمال می‌کند.", C.green],
		["مدیر / مربی", "پیکربندی، شروع بازی، مانیتورینگ و تحلیل را هدایت می‌کند.", C.dark],
	];
	roles.forEach(([title, body, color], i) => {
		const x = i % 2 === 0 ? 680 : 120;
		const y = i < 2 ? 220 : 430;
		addRule(slide, x, y, 420, color, 6);
		addText(slide, title, x, y + 26, 420, 42, { size: 31, bold: true, color });
		addText(slide, body, x, y + 80, 420, 78, { size: 23, color: C.ink });
	});
	addNotes(slide);
}

// 6
{
	const slide = presentation.slides.add();
	addHeader(slide, "هر نوبت چهار فاز دارد؛ کسی گم نمی‌شود", "چرخه بازی", 6);
	const phases = [
		["۱", "تصمیم دولت", "هدف و دستورهای مجاز", C.green],
		["۲", "انتخاب سناریو", "تیم مسیر مناسب را انتخاب می‌کند", C.blue],
		["۳", "رأی‌گیری", "اعضا برای گام بعدی رأی می‌دهند", C.amber],
		["۴", "محاسبه نتیجه", "امتیاز، اعتبار، پیشرفت و اثرها محاسبه می‌شود", C.red],
	];
	phases.forEach(([num, title, body, color], i) => {
		const x = 850 - i * 260;
		slide.shapes.add({
			geometry: "ellipse",
			position: { left: x, top: 244, width: 86, height: 86 },
			fill: color,
			line: { style: "solid", fill: color, width: 0 },
		});
		addText(slide, num, x, 263, 86, 40, { size: 35, bold: true, color: "#FFFFFF", align: "center" });
		addText(slide, title, x - 52, 360, 190, 40, { size: 28, bold: true, align: "center" });
		addText(slide, body, x - 62, 410, 210, 74, { size: 21, color: C.muted, align: "center" });
		if (i < phases.length - 1) addRule(slide, x - 174, 287, 174, C.line, 3);
	});
	addNotes(slide);
}

// 7
{
	const slide = presentation.slides.add();
	addHeader(slide, "بازیکن تصمیم می‌گیرد، رأی می‌دهد، نتیجه را می‌بیند", "تجربه بازیکن", 7);
	bullets(
		slide,
		[
			"داشبورد نشان می‌دهد الان نوبت، فاز، اعتبار و دستور دولت چیست.",
			"بازیکن موضوع و زیرموضوع خود را می‌بیند و سناریوی مجاز را انتخاب می‌کند.",
			"اگر چیزی قفل باشد، سیستم دلیل قفل را توضیح می‌دهد.",
			"بعد از محاسبه، نتیجه و اثر روی پیشرفت یا امتیاز نمایش داده می‌شود.",
		],
		180,
		218,
		900,
		86,
		{ dot: C.blue, size: 27 },
	);
	addNotes(slide);
}

// 8
{
	const slide = presentation.slides.add();
	addHeader(slide, "دولت نقش فرماندهی دارد، نه فقط تماشاگر", "مرکز فرماندهی", 8);
	const orders = [
		["ASSIGN", "تخصیص موضوع"],
		["CREDIT", "تخصیص اعتبار"],
		["BAN", "ممنوع‌کردن کنش"],
		["ENABLE", "فعال/غیرفعال‌کردن تیم"],
	];
	orders.forEach(([code, label], i) => {
		const x = 828 - i * 240;
		addBox(slide, x, 250, 190, 170, "#F7F8FA", C.line);
		addText(slide, code, x + 20, 284, 150, 34, { size: 25, bold: true, color: C.blue, align: "center" });
		addText(slide, label, x + 20, 338, 150, 52, { size: 23, color: C.ink, align: "center" });
	});
	addText(
		slide,
		"این یعنی مدیر غیر فنی هم می‌فهمد حاکمیت، بودجه، محدودیت و اولویت چطور رفتار تیم‌ها را تغییر می‌دهد.",
		160,
		500,
		960,
		72,
		{ size: 29, bold: true, color: C.dark },
	);
	addNotes(slide);
}

// 9
{
	const slide = presentation.slides.add();
	addHeader(slide, "مربی بازی را کنترل می‌کند و یادگیری را قابل مشاهده می‌کند", "مدیر / مربی", 9);
	const rows = [
		["قبل از بازی", "بارگذاری سناریو، اعتبارسنجی، انتشار، شروع"],
		["حین بازی", "مانیتورینگ زنده، فازها، آمادگی تیم‌ها، جریان رویداد"],
		["بعد از نوبت", "آنالیتیکس، امتیاز، اعتبار، پیشرفت، تصمیم‌های ردشده"],
		["برای توضیح", "Current Flow برای دیدن اتصال هدف، سناریو، گام، کنش و اثر"],
	];
	const table = slide.tables.add({
		rows: rows.length + 1,
		columns: 2,
		left: 126,
		top: 218,
		width: 1028,
		height: 336,
		values: [["زمان", "چیزی که مربی نشان می‌دهد"], ...rows],
		columnWidths: [250, 778],
	});
	table.styleOptions = { headerRow: true, bandedRows: true };
	for (let c = 0; c < 2; c++) {
		table.getCell(0, c).fill = C.dark;
		table.getCell(0, c).text.style = { fontSize: 21, bold: true, color: "#FFFFFF", alignment: "right", typeface: FONT };
	}
	table.borders.assign({ style: "solid", fill: "#D9DDE3", width: 1 });
	addNotes(slide);
}

// 10
{
	const slide = presentation.slides.add();
	addHeader(slide, "یک دمو خوب باید با خدمات قابل فهم شروع شود", "سناریوی پیشنهادی جلسه", 10);
	const services = [
		["عملیات بیمارستان", "تصمیم‌ها اثر فوری و انسانی دارند.", C.red],
		["اعزام اضطراری", "زمان، هماهنگی و اعتماد مهم می‌شود.", C.amber],
		["درگاه خدمات شهروندی", "هویت، صف خدمت و اطلاع‌رسانی واضح است.", C.blue],
	];
	services.forEach(([title, body, color], i) => {
		const x = 820 - i * 348;
		addBox(slide, x, 244, 286, 230, "#F7F8FA", "#D8DCE2");
		addRule(slide, x + 24, 276, 238, color, 6);
		addText(slide, title, x + 24, 306, 238, 44, { size: 28, bold: true, color });
		addText(slide, body, x + 24, 376, 238, 68, { size: 22, color: C.ink });
	});
	addText(slide, "مسیر دمو: فشار قرمز → پاسخ آبی → دستور دولت → نتیجه در مانیتورینگ و آنالیتیکس", 118, 540, 1044, 48, {
		size: 28,
		bold: true,
		color: C.dark,
		align: "center",
	});
	addNotes(slide, "apps/web/lib/gameDocsContent.ts; apps/admin/public/data/demo-game-plan.json");
}

// 11
{
	const slide = presentation.slides.add();
	addHeader(slide, "چیزی که باید بعد از دمو در ذهنشان بماند", "ارزش عملی", 11);
	bullets(
		slide,
		[
			"افراد بدون دانش عمیق فنی می‌توانند ریسک را تجربه کنند.",
			"تصمیم‌ها هزینه، احتمال، اثر و قفل دارند؛ پس بازی آموزشی و قابل تحلیل است.",
			"دولت، بازیکن و مربی هرکدام UI و سطح نمایش مناسب خود را دارند.",
			"مانیتورینگ و آنالیتیکس جلسه را از نمایش ساده به یادگیری قابل دفاع تبدیل می‌کند.",
		],
		170,
		218,
		940,
		86,
		{ dot: C.green, size: 27 },
	);
	addNotes(slide);
}

// 12
{
	const slide = presentation.slides.add();
	addText(slide, "درخواست تصمیم", M, 52, W - 2 * M, 38, { size: 27, bold: true, color: C.blue });
	addText(slide, "پایلوت را تأیید کنید", M, 190, W - 2 * M, 94, { size: 76, bold: true });
	addText(
		slide,
		"پیشنهاد: یک جلسه ۴۵ تا ۶۰ دقیقه‌ای با سناریوی دمو، نقش‌های مشخص، مانیتورینگ زنده و مرور آنالیتیکس در پایان.",
		M,
		328,
		900,
		96,
		{ size: 31, color: C.muted },
	);
	addRule(slide, M, 506, 420, C.green, 5);
	addText(slide, "خروجی مورد انتظار: افراد بفهمند چه تصمیمی گرفتند، چرا گرفتند، و نتیجه چه شد.", M, 546, 900, 48, {
		size: 27,
		bold: true,
		color: C.dark,
	});
	addNotes(slide);
}

await fs.mkdir(OUT_DIR, { recursive: true });
for (const [index, slide] of presentation.slides.items.entries()) {
	const stem = `slide-${String(index + 1).padStart(2, "0")}`;
	await writeBlob(path.join(OUT_DIR, `${stem}.png`), await presentation.export({ slide, format: "png", scale: 1 }));
	await fs.writeFile(path.join(OUT_DIR, `${stem}.layout.json`), await (await slide.export({ format: "layout" })).text());
}
await writeBlob(path.join(TMP_DIR, "deck-montage.webp"), await presentation.export({ format: "webp", montage: true, scale: 1 }));
const inspect = await presentation.inspect({ kind: "slide,textbox,shape,table,notes", maxChars: 16000 });
await fs.writeFile(path.join(TMP_DIR, "inspect.ndjson"), inspect.ndjson);
const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(FINAL_PPTX);
console.log(FINAL_PPTX);
