import MatrixBackground from "@/components/MatrixBackground.tsx";

export default function AuthenticationLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="relative min-h-screen">
			<MatrixBackground
				hue={120}
				fontSize={18}
				speed={{ min: 1, max: 6 }}
				trailAlpha={0.08}
				columnStepFactor={1}
				direction="down"
			/>
			{children}
		</div>
	);
}
