"use client";

import { Button } from "@workspace/ui/components/button";
import { CardTitle } from "@workspace/ui/components/card";
import { Bug, Medal, Shield, Trophy, Wrench } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import AdminLoginBackground from "@/assets/admin-login-bg.svg";
import AwardLogo from "@/assets/award-logo.svg";
import XP from "@/assets/XP.svg";
import AdminSummaryDialog from "@/components/AdminSummaryDialog";
import AttackActionConfigDialog from "@/components/AttackActionConfigDialog";
import BlackMarketDialog from "@/components/BlackMarketDialog";
import GameSetupDialog from "@/components/GameSetupDialog";
import TeamMembersDialog from "@/components/TeamMembersDialog";
import { DialogType } from "@/types/dialog.types";
import { ConfigureAllResponse } from "@/types/types";
import AdminResultDialog from "@/components/AdminResultDialog";

interface SecurityRecord {
	id: string;
	name: string;
	highlight?: string;
	score1: number;
	score2: number;
	points: string;
	icon?: React.ReactNode;
}

const SecurityRecordsCard = () => {
	const infrastructureAttacks: SecurityRecord[] = [
		{
			id: "1",
			name: "Infrastructure Attacks",
			highlight: "SQLi",
			score1: 2,
			score2: 2,
			points: "۱۲۵۰۰",
		},
		{
			id: "2",
			name: "SQL Injection",
			highlight: "XSS",
			score1: 1,
			score2: 2,
			points: "۱۰۰۰",
		},
		{
			id: "3",
			name: "Cross-Site Request Forgery",
			highlight: "CSRF",
			score1: 2,
			score2: 3,
			points: "۵۰۰۰",
		},
	];

	const networkAttacks: SecurityRecord[] = [
		{
			id: "4",
			name: "Spear Phishing",
			score1: 175,
			score2: 500,
			points: "۲۵۰۰۰",
		},
		{
			id: "5",
			name: "Baiting",
			score1: 29,
			score2: 75,
			points: "۵۰۰۰",
		},
	];

	const RecordItem = ({ record }: { record: SecurityRecord }) => (
		<div className="flex items-center justify-between py-1 bg-linear-to-b from-[#1D1D1D]/80 to-black/80 px-5">
			<div className="flex items-center gap-4 flex-1">
				<div className="p-2 rounded bg-gray-700 flex items-center justify-center">
					<Medal className="w-6 h-6 text-yellow-400" />
				</div>

				<div className="flex-1">
					<div className="text-gray-300 text-sm">
						{record.name.split("(")[0].trim()}
						{record.highlight && (
							<span className="text-blue-400 ml-1">({record.highlight})</span>
						)}
					</div>
				</div>
			</div>

			<div className="flex items-center gap-8">
				<div className="flex flex-col items-center min-w-[60px]">
					<span className="text-blue-400 text-lg font-semibold">
						{record.score1}
					</span>
					<span className="text-gray-500 text-sm">{record.score2}</span>
				</div>

				<div className="flex items-center gap-2">
					<Image
						src={XP.src}
						width={XP.width}
						height={XP.height}
						alt="XP"
						className="w-8"
					/>
					<span className="text-gray-300 text-sm font-medium">
						{record.points}
					</span>
				</div>
			</div>
		</div>
	);

	return (
		<div className="p-0 max-w-lg">
			<div className=" bg-gray-950 px-6 py-4">
				<div className="flex items-center justify-between">
					<h3 className="text-white text-xl font-semibold">آخرین رکورد ها</h3>
					<span className="text-gray-400 text-sm">۰۵ ساعت و ۲۲ دقیقه</span>
				</div>
			</div>

			<div className="py-4">
				<div>
					{infrastructureAttacks.map((record) => (
						<RecordItem key={record.id} record={record} />
					))}
				</div>

				<div className="flex items-center gap-3 my-4 px-2">
					<div className="h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent flex-1" />
					<div className="bg-gray-800 px-4 py-1 rounded border border-blue-500">
						<span className="text-blue-400 text-xs font-semibold tracking-wider">
							NETWORK-LEVEL ATTACKS
						</span>
					</div>
					<div className="text-gray-500 text-xs">۲۲ دقیقه</div>
				</div>

				<div>
					{networkAttacks.map((record) => (
						<RecordItem key={record.id} record={record} />
					))}
				</div>
			</div>
		</div>
	);
};

export default function DashboardPage() {
	const [currentDialog, setCurrentDialog] = useState<DialogType | null>(null);
	const [resultOpen, setResultOpen] = useState(false);
  	const [resultData, setResultData] = useState<ConfigureAllResponse | null>(null);

	const handleStartGame = () => {
		setCurrentDialog(DialogType.GAME_SETUP);
	};

	  const handleSubmitSuccess = (data: ConfigureAllResponse) => {
    setResultData(data);
    setResultOpen(true);
  };

	const handleClose = () => {
		setCurrentDialog(null);
	};

	const handleNextStep = () => {
		switch (currentDialog) {
			case DialogType.GAME_SETUP:
				setCurrentDialog(DialogType.TEAM_MEMBERS);
				break;
			case DialogType.TEAM_MEMBERS:
				setCurrentDialog(DialogType.ATTACK_ACTION_CONFIG);
				break;
			case DialogType.ATTACK_ACTION_CONFIG:
				setCurrentDialog(DialogType.BLACK_MARKET);
				break;
			case DialogType.BLACK_MARKET:
				setCurrentDialog(DialogType.ADMIN_SUMMARY);
				break;
		}
	};
	const [attacks] = useState([
		{
			category: "Infrastructure Attacks (SQL)",
			icon: <Bug className="w-6 h-6 text-yellow-400" />,
			stats: { wins: 2, losses: 1 },
		},
		{
			category: "SQL Injection (XSS)",
			icon: <Trophy className="w-6 h-6 text-yellow-400" />,
			stats: { wins: 3, losses: 2 },
		},
		{
			category: "Cross-Site Request Forgery (CSRF)",
			icon: <Shield className="w-6 h-6 text-yellow-400" />,
			stats: { wins: 2, losses: 3 },
		},
	]);

	return (
		<div className="fixed inset-0 -z-10">
			<Image
				alt="admin login background"
				src={AdminLoginBackground.src}
				fill
				className="object-cover grayscale"
				sizes="100svw"
			/>
			<div className="relative min-h-screen bg-[url('/bg-lines.svg')] bg-cover bg-center text-gray-100 flex">
				{/* Semi-transparent overlay */}
				<div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

				{/* MAIN LAYOUT */}
				<div className="relative z-10 flex flex-1 mt-15">
					{/* LEFT PANEL */}
					<aside className="w-1/3 p-4 flex flex-col gap-4 ">
						<div className="text-sm">
							<div className="bg-cyan-700/30 py-3 px-6">
								<CardTitle className="text-white text-2xl font-semibold">
									آخرین نبردها
								</CardTitle>
							</div>
							<div className="space-y-3 mt-5">
								{attacks.map((attack, i) => (
									<div
										key={i}
										className="relative h-14 flex items-center justify-between border-b bg-linear-to-b from-[#1D1D1D]/80 to-black/80 last:border-none px-2"
									>
										<div className="flex items-center gap-2 text-gray-300 text-sm font-semibold">
											{attack.icon}
											<span>{attack.category}</span>
										</div>
										<div className="text-xs text-gray-400 ml-20">
											{attack.stats.wins} / {attack.stats.losses}
										</div>
										<div className="absolute left-2 top-0 bottom-0 bg-black/40 w-15 flex items-center justify-center px-3">
											<Image
												src={AwardLogo.src}
												width={AwardLogo.width}
												height={AwardLogo.height}
												alt="Award logo"
											/>
										</div>
										<div className="h-full w-2 bg-blue-400/80 absolute left-0 top-0 bottom-0" />
									</div>
								))}
							</div>
						</div>
					</aside>

					{/* RIGHT PANEL */}
					<section className="flex-1 p-4 flex justify-end flex-col items-end">
						<SecurityRecordsCard />
						<Button
							onClick={handleStartGame}
							variant="secondary"
							className="bg-cyan-700/80 text-black font-bold text-lg hover:bg-cyan-600 transition mt-auto w-fit px-25 py-15 relative overflow-hidden"
						>
							<div className="absolute inset-0 overflow-hidden opacity-20">
								<div className="absolute whitespace-nowrap text-gray-950 font-mono text-sm tracking-widest">
									{Array.from({ length: 10 }).map((_, i) => (
										<div key={i.toString()}>
											{Array.from({ length: 40 }).map((_, j) => (
												<span key={j.toString()}>
													{Math.random() > 0.5 ? "1" : "0"}
												</span>
											))}
										</div>
									))}
								</div>
							</div>
							<div className="flex items-center justify-center w-full gap-2 relative z-10">
								<Wrench />
								<span className="text-2xl font-semibold">بازی جدید</span>
							</div>
						</Button>
					</section>
				</div>

				<div className="absolute top-0 left-0 right-0 h-12 bg-black/70 border-b border-cyan-700/40 flex items-center justify-between px-6 z-20">
					<div className="text-gray-400 font-bold">بازی جنگ</div>
					<div className="flex items-center gap-3">
						<div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-black font-bold">
							A
						</div>
					</div>
				</div>
			</div>
			{/*<SecurityAttackDialog />*/}
			<GameSetupDialog
				isOpen={currentDialog === DialogType.GAME_SETUP}
				onClose={handleClose}
				handleNextStep={handleNextStep}
			/>
			<TeamMembersDialog
				isOpen={currentDialog === DialogType.TEAM_MEMBERS}
				onClose={handleClose}
				handleNextStep={handleNextStep}
			/>
			<AttackActionConfigDialog
				isOpen={currentDialog === DialogType.ATTACK_ACTION_CONFIG}
				onClose={handleClose}
				handleNextStep={handleNextStep}
			/>
			<BlackMarketDialog
				isOpen={currentDialog === DialogType.BLACK_MARKET}
				onClose={handleClose}
				handleNextStep={handleNextStep}
			/>
			<AdminSummaryDialog
				isOpen={currentDialog === DialogType.ADMIN_SUMMARY}
				onClose={handleClose}
				onSuccess={handleSubmitSuccess}
			/>
			{resultData && (
        <AdminResultDialog
          isOpen={resultOpen}
          onClose={() => setResultOpen(false)}
          data={resultData}
        />
      )}
		</div>
	);
}
