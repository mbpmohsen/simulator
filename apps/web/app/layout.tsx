import type { Metadata } from "next";
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";

import "@workspace/ui/styles/globals.css";
import { Providers } from "@/components/providers.tsx";
import "./style.css";
import AnimatedBattleBackground from "@/components/MainBackground";

const fontSans = Geist({
	subsets: ["latin"],
	variable: "--font-sans",
});

const fontMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
});

const fontVazir = Vazirmatn({
	subsets: ["arabic"],
	variable: "--font-vazir",
});

export const metadata: Metadata = {
	title: "بازی‌جنگ",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="fa" suppressHydrationWarning dir="rtl">
			<body
				className={`${fontSans.variable} ${fontMono.variable} ${fontVazir.variable} font-sans antialiased `}
			>
				<AnimatedBattleBackground />
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
