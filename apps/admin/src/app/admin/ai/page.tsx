"use client";

import { Button } from "@workspace/ui/components/button";
import { motion } from "framer-motion";
import { Bot, GitBranch, LogOut } from "lucide-react";
import Link from "next/link";
import { useAdminAuth } from "@/components/AdminAuthGate";
import AiAssistantLevels from "@/components/AiAssistantLevels";

/**
 * Standalone route. The same editor is also available as a tab in the game-plan
 * builder once a game has been published; this page stays so existing links and
 * bookmarks keep working.
 */
export default function AdminAiAssistantPage() {
	const { logout } = useAdminAuth();

	return (
		<main
			dir="rtl"
			className="relative min-h-screen overflow-hidden bg-[#070b17] text-slate-100 [background-image:radial-gradient(circle_at_15%_10%,rgba(8,145,178,.16),transparent_27%),radial-gradient(circle_at_80%_0%,rgba(124,58,237,.14),transparent_22%)]"
		>
			<motion.div
				className="pointer-events-none absolute -right-48 -top-48 size-[560px] rounded-full bg-cyan-400/10 blur-3xl"
				animate={{ scale: [1, 1.16, 1], opacity: [0.3, 0.65, 0.3] }}
				transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY }}
			/>
			<div className="relative mx-auto max-w-6xl space-y-5 px-4 py-6 lg:px-8">
				<header className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
					<div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
						<div className="flex items-center gap-4">
							<div className="grid size-14 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
								<Bot className="size-7" />
							</div>
							<div>
								<div className="mb-1 text-xs text-cyan-300">
									ویژگی پولی مستقل از configure_all
								</div>
								<h1 className="text-2xl font-black tracking-tight lg:text-3xl">
									پیکربندی دستیار هوشمند
								</h1>
								<p className="mt-2 text-sm text-slate-400">
									نردبان سطح‌ها باید از ۱ شروع شود و هر سطح هزینه اعتباری نامنفی
									داشته باشد.
								</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Button
								asChild
								variant="outline"
								size="sm"
								className="border-white/10 bg-white/5"
							>
								<Link href="/admin/game-plan">
									<GitBranch className="size-4" /> سازنده بازی
								</Link>
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={logout}
								className="border-white/10 bg-white/5 text-slate-300 hover:border-rose-400/20 hover:bg-rose-500/10 hover:text-rose-200"
							>
								<LogOut className="size-4" /> خروج
							</Button>
						</div>
					</div>
				</header>

				<AiAssistantLevels />
			</div>
		</main>
	);
}
