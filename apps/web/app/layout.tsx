import type { Metadata } from "next";
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";

import "@workspace/ui/styles/globals.css";
import { Providers } from "@/components/providers.tsx";
import "./style.css";
import { Toaster } from 'sonner';

import AnimatedBattleBackground from "@/components/MainBackground";
import {vazir} from "@/fonts/fonts.ts";

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
	title: "شبیه‌ساز عملیات",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
        <html lang="fa" dir="rtl" suppressHydrationWarning>
            <body
                className={`${fontSans.variable} ${fontMono.variable} ${fontVazir.variable} ${vazir.className} font-sans antialiased`}
            >
                <Toaster
                    style={{ fontFamily: `${fontSans.variable} ${fontMono.variable} ${fontVazir.variable} ${vazir.className}`}}
                    className={`${fontSans.variable} ${fontMono.variable} ${fontVazir.variable} ${vazir.className} font-sans antialiased`}
                />
                {/*<AnimatedBattleBackground />*/}
                <Providers>{children}</Providers>
            </body>
        </html>
	);
}
