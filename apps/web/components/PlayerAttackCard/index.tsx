"use client";

import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardFooter,
} from "@workspace/ui/components/card";

import AttackMenu from "@/components/PlayerAttackCard/AttackMenu";
import AttackDetailCard from "@/components/PlayerAttackCard/AttackDetailCard";

export default function PlayerAttackCard() {
	const handleSubmit = async () => {};

	return (
		<div
			dir="rtl"
			className="
				w-full flex justify-center px-4
				bg-black/40 backdrop-blur-sm
				pt-[83px] pb-[83px]
			"
		>
			<Card
				className="
					max-w-7xl w-[1200px]
					bg-gray-900 border border-gray-700
					p-0 shadow-xl rounded-xl
					overflow-hidden
					h-[calc(100vh-166px)]  /* fits exactly between header & footer */
					flex flex-col           /* so children size correctly */
				"
			>
				{/* Header */}
				<CardHeader className="pb-0 border-b border-gray-700 bg-gray-800/40 shrink-0">
					<div className="flex justify-center items-center mt-4 mb-1">
						<CardTitle className="text-green-400 text-lg font-semibold tracking-wide">
							حمله
						</CardTitle>
					</div>
				</CardHeader>

				{/* SCROLLABLE content */}
				<CardContent
					className="
						grid grid-cols-2 gap-5 p-6 bg-gray-900
						overflow-y-auto
						flex-1
					"
				>
					<AttackMenu />
					<AttackDetailCard />
				</CardContent>

				{/* Footer Actions — always visible */}
				<CardFooter
					className="
						flex gap-3 px-6 py-4
						border-t border-gray-700
						bg-gray-800/60 justify-end items-center
						shrink-0
					"
				>
					<Button
						variant="outline"
						className="bg-gray-700 text-white hover:bg-gray-600 border-gray-600"
					>
						بیخیال
					</Button>

					<Button
						onClick={handleSubmit}
						className="bg-green-600 text-white hover:bg-green-700"
					>
						حمله
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
