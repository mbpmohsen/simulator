import { Button } from "@workspace/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { AlertCircle, Crown, Plus, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useGameConfigStore } from "@/store/store";
import { DialogType } from "@/types/dialog.types";

interface TeamMembersDialogProps {
	isOpen: boolean;
	onClose: () => void;
	handleNextStep: (value: DialogType) => void;
}

const TeamMembersDialog: React.FC<TeamMembersDialogProps> = ({
	isOpen,
	onClose,
	handleNextStep,
}) => {
	// Zustand store actions
	const addPlayer = useGameConfigStore((state) => state.addPlayer);
	const removePlayer = useGameConfigStore((state) => state.removePlayer);
	const updatePlayer = useGameConfigStore((state) => state.updatePlayer);
	const validateConfig = useGameConfigStore((state) => state.validateConfig);

	// Zustand store state
	const teamNames = useGameConfigStore((state) => state.config.team_names);
	const teamsAndPlayers = useGameConfigStore(
		(state) => state.config.teams_and_players,
	);

	// Local form state
	const [newPlayerName, setNewPlayerName] = useState("");
	const [selectedTeam, setSelectedTeam] = useState("");
	const [errors, setErrors] = useState<string[]>([]);

	const validatePlayer = (): string[] => {
		const errs: string[] = [];

		if (!newPlayerName.trim()) {
			errs.push("نام بازیکن نمی‌تواند خالی باشد");
		}
		if (!selectedTeam) {
			errs.push("لطفا یک تیم انتخاب کنید");
		}

		// Check if player already exists in the team
		const teamPlayers = teamsAndPlayers[selectedTeam] || [];
		if (
			teamPlayers.some(
				(p) => p.name.toLowerCase() === newPlayerName.trim().toLowerCase(),
			)
		) {
			errs.push("بازیکن با این نام در این تیم وجود دارد");
		}

		return errs;
	};

	const handleAddPlayer = () => {
		const validationErrors = validatePlayer();
		if (validationErrors.length > 0) {
			setErrors(validationErrors);
			return;
		}

		const currentPlayers = teamsAndPlayers[selectedTeam] || [];
		const isFirstPlayer = currentPlayers.length === 0;

		const newPlayer = {
			name: newPlayerName.trim(),
			is_leader: isFirstPlayer, // First player becomes leader
			vote_weight: 2.0,
		};

		addPlayer(selectedTeam, newPlayer);

		setNewPlayerName("");
		setSelectedTeam("");
		setErrors([]);
	};

	const handleRemovePlayer = (teamName: string, playerName: string) => {
		const teamPlayers = teamsAndPlayers[teamName] || [];
		const playerToRemove = teamPlayers.find((p) => p.name === playerName);

		if (!playerToRemove) return;

		removePlayer(teamName, playerName);

		// If removed player was leader and there are still players, assign leadership to first player
		if (playerToRemove.is_leader) {
			const remainingPlayers = teamPlayers.filter((p) => p.name !== playerName);
			if (remainingPlayers.length > 0) {
				updatePlayer(teamName, remainingPlayers[0].name, { is_leader: true });
			}
		}
	};

	const handleSetPlayerAsLeader = (teamName: string, playerName: string) => {
		const teamPlayers = teamsAndPlayers[teamName] || [];

		// Remove leadership from all players in the team
		teamPlayers.forEach((player) => {
			if (player.is_leader && player.name !== playerName) {
				updatePlayer(teamName, player.name, { is_leader: false });
			}
		});

		// Set the selected player as leader
		updatePlayer(teamName, playerName, { is_leader: true });
	};

	const handleSubmit = () => {
		const validation = validateConfig(2);

		// Additional validation for team members
		const additionalErrors: string[] = [];

		teamNames.forEach((team) => {
			const players = teamsAndPlayers[team] || [];
			if (players.length === 0) {
				additionalErrors.push(`تیم "${team}" باید حداقل یک بازیکن داشته باشد`);
			}

			const leaders = players.filter((player) => player.is_leader);
			if (leaders.length !== 1) {
				additionalErrors.push(`تیم "${team}" باید دقیقا یک کاپیتان داشته باشد`);
			}
		});

		const allErrors = [...validation.errors, ...additionalErrors];

		if (allErrors.length > 0) {
			setErrors(allErrors);
			return;
		}

		// Move to next step
		handleNextStep(DialogType.GAME_SETUP); // Or whatever your next step is
		setErrors([]);
	};

	const getTeamPlayerCount = (teamName: string) => {
		return teamsAndPlayers[teamName]?.length || 0;
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent
				className="max-w-6xl bg-gray-900 border-gray-700 p-0 gap-0 max-h-[90vh] overflow-hidden"
				dir="rtl"
			>
				<DialogHeader className="px-6 py-4 border-b border-gray-700">
					<DialogTitle className="text-white text-xl text-right">
						مدیریت بازیکنان تیم‌ها
					</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col h-[700px] overflow-hidden">
					{/* Add New Player */}
					<div className="bg-gray-800 border-b border-gray-700 p-6">
						<h3 className="text-white text-lg font-semibold mb-4 text-right">
							افزودن بازیکن جدید
						</h3>
						<div className="flex gap-3 items-end">
							<div className="flex-1">
								<Label className="text-gray-300 text-sm mb-2 block text-right">
									نام بازیکن
								</Label>
								<Input
									placeholder="نام بازیکن را وارد کنید"
									value={newPlayerName}
									onChange={(e) => setNewPlayerName(e.target.value)}
									className="bg-gray-700 border-gray-600 text-white text-right"
									onKeyPress={(e) => e.key === "Enter" && handleAddPlayer()}
								/>
							</div>
							<div className="w-48">
								<Label className="text-gray-300 text-sm mb-2 block text-right">
									انتخاب تیم
								</Label>
								<Select value={selectedTeam} onValueChange={setSelectedTeam}>
									<SelectTrigger className="bg-gray-700 border-gray-600 text-white text-right">
										<SelectValue placeholder="انتخاب تیم" />
									</SelectTrigger>
									<SelectContent className="bg-gray-800 border-gray-700">
										{teamNames.map((team) => (
											<SelectItem
												key={team}
												value={team}
												className="text-white text-right"
											>
												{team} ({getTeamPlayerCount(team)} بازیکن)
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<Button
								onClick={handleAddPlayer}
								className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
							>
								<Plus className="w-4 h-4 ml-2" />
								افزودن بازیکن
							</Button>
						</div>
					</div>

					{/* Teams and Players Grid */}
					<div className="flex-1 overflow-y-auto p-6">
						<div className="grid grid-cols-2 gap-6">
							{teamNames.map((team) => {
								const players = teamsAndPlayers[team] || [];
								return (
									<div key={team} className="bg-gray-800 rounded-lg p-4">
										<div className="flex items-center justify-between mb-4">
											<h4 className="text-white text-lg font-semibold text-right">
												{team}
											</h4>
											<span className="text-gray-400 text-sm">
												{players.length} بازیکن
											</span>
										</div>

										{players.length === 0 ? (
											<div className="text-center py-8 text-gray-500 text-sm">
												هنوز بازیکنی برای این تیم اضافه نشده است
											</div>
										) : (
											<div className="space-y-2">
												{players.map((player) => (
													<div
														key={player.name}
														className="flex items-center justify-between bg-gray-700 rounded-lg p-3"
													>
														<div className="flex items-center gap-3 flex-1">
															{player.is_leader && (
																<Crown className="w-4 h-4 text-yellow-400" />
															)}
															<div className="flex-1 text-right">
																<div className="text-white font-medium">
																	{player.name}
																</div>
																<div className="text-gray-400 text-xs">
																	وزن رای: {player.vote_weight}
																</div>
															</div>
														</div>
														<div className="flex items-center gap-2">
															{!player.is_leader && (
																<Button
																	onClick={() =>
																		handleSetPlayerAsLeader(team, player.name)
																	}
																	variant="ghost"
																	size="sm"
																	className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20"
																	title="تعیین به عنوان کاپیتان"
																>
																	<Crown className="w-4 h-4" />
																</Button>
															)}
															<Button
																onClick={() =>
																	handleRemovePlayer(team, player.name)
																}
																variant="ghost"
																size="sm"
																className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
															>
																<X className="w-4 h-4" />
															</Button>
														</div>
													</div>
												))}
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>

					{/* Errors */}
					{errors.length > 0 && (
						<div className="px-6 py-3 bg-red-900/20 border-t border-red-700">
							{errors.map((error, i) => (
								<div
									key={i}
									className="flex items-center gap-2 text-red-400 text-sm"
								>
									<AlertCircle className="w-4 h-4" />
									{error}
								</div>
							))}
						</div>
					)}

					{/* Footer */}
					<div className="flex gap-3 px-6 py-4 border-t border-gray-700 bg-gray-800">
						<Button
							onClick={onClose}
							variant="outline"
							className="flex-1 bg-gray-700 text-white hover:bg-gray-600 border-gray-600"
						>
							انصراف
						</Button>
						<Button
							onClick={handleSubmit}
							className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
						>
							تایید و ادامه
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default TeamMembersDialog;
