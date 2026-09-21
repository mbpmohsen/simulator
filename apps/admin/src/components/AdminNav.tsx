"use client";

import {
	Activity,
	BarChart3,
	BookOpen,
	Bot,
	GitBranch,
	LogOut,
	SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/components/AdminAuthGate";

/**
 * The one navigation bar for every admin page.
 *
 * Each page used to carry its own row of link buttons and, for monitoring and
 * analytics, its own password form. Now every page sits behind the same
 * AdminAuthGate and shows this bar.
 */

const LINKS = [
	{ href: "/admin/game-plan", label: "تنظیم بازی", icon: SlidersHorizontal },
	{ href: "/admin/current-flow", label: "نسخهٔ منتشرشده", icon: GitBranch },
	{ href: "/monitoring", label: "پایش بازی", icon: Activity },
	{ href: "/analytics", label: "تحلیل بازی", icon: BarChart3 },
	{ href: "/admin/ai", label: "دستیار هوشمند", icon: Bot },
	{ href: "/docs", label: "راهنما", icon: BookOpen },
];

export default function AdminNav() {
	const pathname = usePathname();
	const { logout } = useAdminAuth();

	return (
		<nav
			dir="rtl"
			className="sticky top-0 z-40 border-b border-white/10 bg-[#070b17]/95 backdrop-blur"
		>
			<div className="mx-auto flex max-w-[1680px] items-center gap-1 overflow-x-auto px-4 py-2 lg:px-8">
				<span className="ml-3 shrink-0 text-sm font-black text-slate-200">
					پنل مدیریت
				</span>
				{LINKS.map(({ href, label, icon: Icon }) => {
					const active = pathname === href || pathname.startsWith(`${href}/`);
					return (
						<Link
							key={href}
							href={href}
							aria-current={active ? "page" : undefined}
							className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
								active
									? "bg-cyan-400/15 text-cyan-100"
									: "text-slate-400 hover:bg-white/5 hover:text-slate-100"
							}`}
						>
							<Icon className="size-4" />
							{label}
						</Link>
					);
				})}
				<button
					type="button"
					onClick={logout}
					className="mr-auto flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-rose-500/10 hover:text-rose-200"
				>
					<LogOut className="size-4" /> خروج
				</button>
			</div>
		</nav>
	);
}
