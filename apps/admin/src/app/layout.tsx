import { vazirmatn } from "@/styles/fonts";

import type { Metadata } from "next";
import "@workspace/ui/globals.css";

import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
	title: "Attack Simulator",
	description: "MITRE ATTACK simulator",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="fa" suppressHydrationWarning dir="rtl" className={vazirmatn.className}>
			<body className="antialiased">
				<Providers>
					{children}
				</Providers>
			</body>
		</html>
	);
}
