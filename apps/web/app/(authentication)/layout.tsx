import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";

import "@workspace/ui/styles/globals.css";
import { Providers } from "@/components/providers.tsx";
import MatrixBackground from "@/components/MatrixBackground.tsx";

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
			<MatrixBackground
				hue={120}
				fontSize={18}
				speed={{ min: 1, max: 6 }}
				trailAlpha={0.08}
				columnStepFactor={1}
				direction="down"
			/>
			<Providers>{children}</Providers>
			</body>
		</html>
	);
}
