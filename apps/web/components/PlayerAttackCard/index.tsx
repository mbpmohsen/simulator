"use client";
import { Button } from "@workspace/ui/components/button";
import {
	Dialog,
	DialogContent,
} from "@workspace/ui/components/dialog";
import {CardHeader, CardTitle, CardContent} from "@workspace/ui/components/card.tsx";
import AttackMenu from "@/components/PlayerAttackCard/AttackMenu.tsx";
import AttackDetailCard from "@/components/PlayerAttackCard/AttackDetailCard.tsx";

export default function PlayerAttackCard() {

	const handleSubmit = async () => {
	};

	return (
		<Dialog open>
			<DialogContent
				className="max-w-7xl min-x-7xl bg-gray-900 border-gray-700 p-0 gap-0 max-h-[90vh] overflow-hidden"
				style={{ minWidth: "1200px" }}
				dir="rtl"
			>
				<CardHeader className="pb-3">
					<div className="flex justify-center items-center mt-5">
						<CardTitle className="text-green-400 text-lg font-semibold tracking-wide">
							حمله
						</CardTitle>
					</div>
				</CardHeader>

				<CardContent className="grid grid-cols-2 gap-5 mb-5">
					<AttackMenu />
					<AttackDetailCard />
				</CardContent>
				<div className="flex gap-3 px-6 py-4 border-t border-gray-700 bg-gray-800 justify-end items-center">
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
				</div>
			</DialogContent>
		</Dialog>
	);
}
