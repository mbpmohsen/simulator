import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";

import "@workspace/ui/globals.css";
import { Providers } from "@/components/providers";
import "./style.css";
import {TRPCProvider} from "@/app/providers.tsx";

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
			<TRPCProvider><Providers>{children}</Providers></TRPCProvider>
			</body>
		</html>
	);
}
