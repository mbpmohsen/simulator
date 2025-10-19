"use client";

import { Users, Sword, Shield } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";

type Player = {
	id: number;
	name: string;
	level: number;
	power: number;
	defense: number;
};

const blueTeam: Player[] = [
	{ id: 1, name: "Ali", level: 12, power: 350, defense: 120 },
	{ id: 2, name: "Sara", level: 10, power: 310, defense: 90 },
];

const redTeam: Player[] = [
	{ id: 3, name: "Reza", level: 14, power: 400, defense: 150 },
	{ id: 4, name: "Mina", level: 9, power: 280, defense: 80 },
];

export default function PlayersTeamsList() {
	return (
		<div className="bg-gradient-to-b from-black via-neutral-900 to-black text-white rounded-2xl p-4 shadow-xl border border-neutral-800">
			<h2 className="flex items-center gap-2 mb-4 text-lg font-semibold">
				<Users className="w-5 h-5 text-green-400" />
				لیست بازیکنان
			</h2>

			{/* Blue Team */}
			<div className="mb-6">
				<h3 className="text-blue-400 mb-3 font-semibold text-sm border-b border-blue-800/50 pb-1">
					تیم آبی
				</h3>
				<div className="flex flex-col gap-3">
					{blueTeam.map((player) => (
						<div
							key={player.id}
							className="flex justify-between items-center bg-gradient-to-r from-blue-900/60 to-blue-700/40 hover:from-blue-800/70 hover:to-blue-600/40 rounded-xl px-4 py-3 transition-all duration-300"
						>
							<div className="flex flex-col">
								<span className="font-semibold text-sm">{player.name}</span>
								<span className="text-xs text-blue-300/70">
									سطح {player.level}
								</span>
							</div>
							<div className="flex items-center gap-3">
								<Badge
									variant="secondary"
									className="flex items-center gap-1 bg-blue-800/30 text-blue-200 border-blue-700"
								>
									<Sword className="w-4 h-4" /> {player.power}
								</Badge>
								<Badge
									variant="secondary"
									className="flex items-center gap-1 bg-blue-800/30 text-blue-200 border-blue-700"
								>
									<Shield className="w-4 h-4" /> {player.defense}
								</Badge>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Red Team */}
			<div>
				<h3 className="text-red-400 mb-3 font-semibold text-sm border-b border-red-800/50 pb-1">
					تیم قرمز
				</h3>
				<div className="flex flex-col gap-3">
					{redTeam.map((player) => (
						<div
							key={player.id}
							className="flex justify-between items-center bg-gradient-to-r from-red-900/60 to-red-700/40 hover:from-red-800/70 hover:to-red-600/40 rounded-xl px-4 py-3 transition-all duration-300"
						>
							<div className="flex flex-col">
								<span className="font-semibold text-sm">{player.name}</span>
								<span className="text-xs text-red-300/70">
									سطح {player.level}
								</span>
							</div>
							<div className="flex items-center gap-3">
								<Badge
									variant="secondary"
									className="flex items-center gap-1 bg-red-800/30 text-red-200 border-red-700"
								>
									<Sword className="w-4 h-4" /> {player.power}
								</Badge>
								<Badge
									variant="secondary"
									className="flex items-center gap-1 bg-red-800/30 text-red-200 border-red-700"
								>
									<Shield className="w-4 h-4" /> {player.defense}
								</Badge>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
