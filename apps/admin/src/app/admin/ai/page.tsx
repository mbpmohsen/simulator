"use client";

import AiAssistantLevels from "@/components/AiAssistantLevels";

/**
 * Standalone route. The same editor is also a tab in «تنظیم بازی» once a game
 * has been published; this page keeps existing links and bookmarks working.
 */
export default function AdminAiAssistantPage() {
	return (
		<main dir="rtl" className="min-h-screen bg-[#070b17] text-slate-100">
			<div className="mx-auto max-w-6xl space-y-5 px-4 py-6 lg:px-8">
				<header>
					<h1 className="text-2xl font-black">دستیار هوشمند</h1>
					<p className="mt-1 text-sm text-slate-400">
						سطح‌ها از ۱ شروع می‌شوند و هزینهٔ هر سطح نمی‌تواند منفی باشد. این تنظیم
						جدا از انتشار برنامهٔ بازی ذخیره می‌شود.
					</p>
				</header>
				<AiAssistantLevels />
			</div>
		</main>
	);
}
