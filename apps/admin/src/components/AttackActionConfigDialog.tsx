import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
	AlertCircle,
	ChevronDown,
	ChevronRight,
	Plus,
	Shield,
	Swords,
	X,
} from "lucide-react";
import React, { type FC, useEffect, useState } from "react";
import type { DialogType } from "@/types/dialog.types";
import { useGameConfigStore, selectActions } from "@/store/store";

interface Group {
	id: string;
	name: string;
}

interface Technique {
	id: string;
	name: string;
	description: string;
}

interface GroupDetail {
	id: string;
	name: string;
	description: string;
	techniques: Technique[];
	tactics: string[];
}

interface ActionConfig {
	probability: number;
	counter_actions: string;
	cost: number;
	techniques?: string[];
	tactics?: string[];
}

interface ActionsData {
	attack: Record<string, ActionConfig>;
	defense: Record<string, ActionConfig>;
}

interface IProps {
	isOpen: boolean;
	onClose: () => void;
	handleNextStep: () => void;
}

const AttackActionConfigDialog: FC<IProps> = ({
	isOpen,
	onClose,
	handleNextStep,
}) => {
	const [groups, setGroups] = useState<Group[]>([]);
	const [selectedGroup, setSelectedGroup] = useState<string>("");
	const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const [activeTab, setActiveTab] = useState<"attack" | "defense">("attack");
	const [expandedTechniques, setExpandedTechniques] = useState<
		Record<string, boolean>
	>({});

	// Action configurations (sourced from global store)
	const actions = useGameConfigStore(selectActions);
	const attackActions = actions.attack || {};
	const defenseActions = actions.defense || {};

	const addAttackActionToStore = useGameConfigStore((s) => s.addAttackAction);
	const addDefenseActionToStore = useGameConfigStore((s) => s.addDefenseAction);
	const removeAttackActionFromStore = useGameConfigStore((s) => s.removeAttackAction);
	const removeDefenseActionFromStore = useGameConfigStore((s) => s.removeDefenseAction);

	// Form state for new action
	const [newActionName, setNewActionName] = useState("");
	const [newActionProbability, setNewActionProbability] = useState(50);
	const [newActionCost, setNewActionCost] = useState(10);
	const [newActionCounter, setNewActionCounter] = useState("");
	const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);
	const [selectedTactics, setSelectedTactics] = useState<string[]>([]);

	const [errors, setErrors] = useState<string[]>([]);

	// Fetch groups on mount
	useEffect(() => {
		fetchGroups();
	}, []);

	const fetchGroups = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/attack-data?lang=fa");
			const data = await response.json();
			setGroups(data);
		} catch (error) {
			console.error("Failed to fetch groups:", error);
			setErrors(["Failed to load attack groups"]);
		} finally {
			setLoading(false);
		}
	};

	const fetchGroupDetail = async (groupId: string) => {
		try {
			setLoading(true);
			const response = await fetch(
				`/api/attack-data?groupId=${groupId}&lang=en`,
			);
			const data = await response.json();
			setGroupDetail(data);
			setSelectedTechniques([]);
			setSelectedTactics([]);
		} catch (error) {
			console.error("Failed to fetch group details:", error);
			setErrors(["Failed to load group details"]);
		} finally {
			setLoading(false);
		}
	};

	const handleGroupChange = (groupId: string) => {
		setSelectedGroup(groupId);
		if (groupId) {
			fetchGroupDetail(groupId);
		} else {
			setGroupDetail(null);
		}
	};

	const toggleTechnique = (techniqueId: string) => {
		setExpandedTechniques((prev) => ({
			...prev,
			[techniqueId]: !prev[techniqueId],
		}));
	};

	const handleTechniqueSelect = (techniqueName: string) => {
		setSelectedTechniques((prev) =>
			prev.includes(techniqueName)
				? prev.filter((t) => t !== techniqueName)
				: [...prev, techniqueName],
		);
	};

	const handleTacticSelect = (tacticName: string) => {
		setSelectedTactics((prev) =>
			prev.includes(tacticName)
				? prev.filter((t) => t !== tacticName)
				: [...prev, tacticName],
		);
	};

	const normalizeActionName = (name: string): string => {
		return name
			.toUpperCase()
			.replace(/\s+/g, "_")
			.replace(/[^A-Z0-9_]/g, "");
	};

	const addAction = () => {
		const validationErrors: string[] = [];

		if (!newActionName.trim()) {
			validationErrors.push("Action name is required");
		}

		if (newActionProbability < 0 || newActionProbability > 100) {
			validationErrors.push("Probability must be between 0 and 100");
		}

		if (newActionCost <= 0) {
			validationErrors.push("Cost must be greater than 0");
		}

		if (validationErrors.length > 0) {
			setErrors(validationErrors);
			return;
		}

		const actionName = normalizeActionName(newActionName);
		const counterActionName = newActionCounter
			? normalizeActionName(newActionCounter)
			: "";

		const newAction: ActionConfig = {
			probability: newActionProbability,
			counter_actions: counterActionName,
			cost: newActionCost,
			techniques:
				selectedTechniques.length > 0 ? selectedTechniques : undefined,
			tactics: selectedTactics.length > 0 ? selectedTactics : undefined,
		};

		if (activeTab === "attack") {
			if (attackActions[actionName]) {
				setErrors(["Action با این نام از قبل وجود دارد"]);
				return;
			}
			addAttackActionToStore(actionName, newAction);
		} else {
			if (defenseActions[actionName]) {
				setErrors(["Action با این نام از قبل وجود دارد"]);
				return;
			}
			addDefenseActionToStore(actionName, newAction);
		}

		// Reset form
		setNewActionName("");
		setNewActionProbability(50);
		setNewActionCost(10);
		setNewActionCounter("");
		setSelectedTechniques([]);
		setSelectedTactics([]);
		setErrors([]);
	};

	const removeAction = (actionName: string, type: "attack" | "defense") => {
		if (type === "attack") {
			removeAttackActionFromStore(actionName);
		} else {
			removeDefenseActionFromStore(actionName);
		}
	};

	const handleSubmit = () => {
		const finalData: ActionsData = {
			attack: attackActions,
			defense: defenseActions,
		};

		console.log("Actions Configuration:", JSON.stringify(finalData, null, 2));
		handleNextStep();
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent className="max-w-6xl bg-gray-900 border-gray-700 p-0 gap-0 max-h-[90vh] overflow-hidden">
				<DialogHeader className="px-6 py-4 border-b border-gray-700">
					<DialogTitle className="text-white text-xl">
						Attack & Defense Actions Configuration
					</DialogTitle>
				</DialogHeader>

				<div className="flex h-[700px] overflow-hidden">
					{/* Left Panel - Attack Group Selection */}
					<div className="w-1/3 border-r border-gray-700 flex flex-col">
						{/* Group Selection */}
						<div className="p-4 border-b border-gray-700 bg-gray-800">
							<Label className="text-gray-300 text-sm mb-2 block">
								Select Attack Group
							</Label>
							<Select value={selectedGroup} onValueChange={handleGroupChange}>
								<SelectTrigger className="bg-gray-700 border-gray-600 text-white">
									<SelectValue placeholder="Choose an attack group..." />
								</SelectTrigger>
								<SelectContent className="bg-gray-800 border-gray-700 max-h-[300px]">
									{groups.map((group) => (
										<SelectItem
											key={group.id}
											value={group.id}
											className="text-white"
										>
											{group.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Tactics & Techniques */}
						<ScrollArea className="flex-1 p-4">
							{loading && (
								<div className="text-gray-400 text-center py-8">Loading...</div>
							)}

							{!loading && groupDetail && (
								<div className="space-y-4">
									{/* Tactics */}
									{groupDetail.tactics.length > 0 && (
										<div className="bg-gray-800 rounded-lg p-3">
											<h4 className="text-white font-semibold mb-3 flex items-center gap-2">
												<Shield className="w-4 h-4 text-blue-400" />
												Tactics ({groupDetail.tactics.length})
											</h4>
											<div className="space-y-2">
												{groupDetail.tactics.map((tactic) => (
													<div key={tactic} className="flex items-center gap-2">
														<Checkbox
															id={`tactic-${tactic}`}
															checked={selectedTactics.includes(tactic)}
															onCheckedChange={() => handleTacticSelect(tactic)}
															className="border-gray-600"
														/>
														<label
															htmlFor={`tactic-${tactic}`}
															className="text-sm text-gray-300 cursor-pointer flex-1"
														>
															{tactic}
														</label>
													</div>
												))}
											</div>
										</div>
									)}

									{/* Techniques */}
									{groupDetail.techniques.length > 0 && (
										<div className="bg-gray-800 rounded-lg p-3">
											<h4 className="text-white font-semibold mb-3 flex items-center gap-2">
												<Swords className="w-4 h-4 text-red-400" />
												Techniques ({groupDetail.techniques.length})
											</h4>
											<div className="space-y-2">
												{groupDetail.techniques.map((technique) => (
													<div
														key={technique.id}
														className="border border-gray-700 rounded"
													>
														<div className="flex items-center gap-2 p-2">
															<Checkbox
																id={`tech-${technique.id}`}
																checked={selectedTechniques.includes(
																	technique.name,
																)}
																onCheckedChange={() =>
																	handleTechniqueSelect(technique.name)
																}
																className="border-gray-600"
															/>
															<button
																onClick={() => toggleTechnique(technique.id)}
																className="flex-1 text-left flex items-center gap-2 text-sm text-gray-300 hover:text-white"
															>
																{expandedTechniques[technique.id] ? (
																	<ChevronDown className="w-3 h-3" />
																) : (
																	<ChevronRight className="w-3 h-3" />
																)}
																<span className="flex-1">{technique.name}</span>
															</button>
														</div>
														{expandedTechniques[technique.id] && (
															<div className="px-8 pb-2 text-xs text-gray-400">
																{technique.description}
															</div>
														)}
													</div>
												))}
											</div>
										</div>
									)}
								</div>
							)}

							{!loading && !groupDetail && (
								<div className="text-gray-400 text-center py-8">
									Select an attack group to view tactics and techniques
								</div>
							)}
						</ScrollArea>
					</div>

					{/* Right Panel - Action Configuration */}
					<div className="flex-1 flex flex-col">
						<Tabs
							value={activeTab}
							onValueChange={(v) => setActiveTab(v as "attack" | "defense")}
							className="flex-1 flex flex-col"
						>
							<TabsList className="bg-gray-800 border-b border-gray-700 rounded-none w-full justify-start p-0">
								<TabsTrigger
									value="attack"
									className="data-[state=active]:bg-red-600 data-[state=active]:text-white rounded-none px-6 py-3"
								>
									<Swords className="w-4 h-4 mr-2" />
									Attack Actions
								</TabsTrigger>
								<TabsTrigger
									value="defense"
									className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-none px-6 py-3"
								>
									<Shield className="w-4 h-4 mr-2" />
									Defense Actions
								</TabsTrigger>
							</TabsList>

							<TabsContent value="attack" className="flex-1 flex flex-col m-0">
								<ScrollArea className="flex-1 p-6">
									{/* Add New Attack Action */}
									<div className="bg-gray-800 rounded-lg p-4 mb-4">
										<h4 className="text-white font-semibold mb-4">
											Add New Attack Action
										</h4>
										<div className="grid grid-cols-2 gap-3 mb-3">
											<div>
												<Label className="text-gray-300 text-xs mb-1 block">
													Action Name
												</Label>
												<Input
													placeholder="e.g., SQL Injection"
													value={newActionName}
													onChange={(e) => setNewActionName(e.target.value)}
													className="bg-gray-700 border-gray-600 text-white"
												/>
											</div>
											<div>
												<Label className="text-gray-300 text-xs mb-1 block">
													Counter Action Name
												</Label>
												<Input
													placeholder="e.g., SQL Injection Defense"
													value={newActionCounter}
													onChange={(e) => setNewActionCounter(e.target.value)}
													className="bg-gray-700 border-gray-600 text-white"
												/>
											</div>
											<div>
												<Label className="text-gray-300 text-xs mb-1 block">
													Probability (0-100)
												</Label>
												<Input
													type="number"
													min="0"
													max="100"
													value={newActionProbability}
													onChange={(e) =>
														setNewActionProbability(
															parseFloat(e.target.value) || 0,
														)
													}
													className="bg-gray-700 border-gray-600 text-white"
												/>
											</div>
											<div>
												<Label className="text-gray-300 text-xs mb-1 block">
													Cost (Credits)
												</Label>
												<Input
													type="number"
													min="0"
													step="0.1"
													value={newActionCost}
													onChange={(e) =>
														setNewActionCost(parseFloat(e.target.value) || 0)
													}
													className="bg-gray-700 border-gray-600 text-white"
												/>
											</div>
										</div>
										{(selectedTactics.length > 0 ||
											selectedTechniques.length > 0) && (
											<div className="mb-3 space-y-2">
												{selectedTactics.length > 0 && (
													<div className="flex flex-wrap gap-1">
														<Label className="text-gray-400 text-xs mr-2">
															Tactics:
														</Label>
														{selectedTactics.map((t) => (
															<Badge
																key={t}
																variant="outline"
																className="text-xs bg-blue-900/30 text-blue-300"
															>
																{t}
															</Badge>
														))}
													</div>
												)}
												{selectedTechniques.length > 0 && (
													<div className="flex flex-wrap gap-1">
														<Label className="text-gray-400 text-xs mr-2">
															Techniques:
														</Label>
														{selectedTechniques.map((t) => (
															<Badge
																key={t}
																variant="outline"
																className="text-xs bg-red-900/30 text-red-300"
															>
																{t}
															</Badge>
														))}
													</div>
												)}
											</div>
										)}
										<Button
											onClick={addAction}
											className="w-full bg-red-600 hover:bg-red-700"
										>
											<Plus className="w-4 h-4 mr-2" />
											Add Attack Action
										</Button>
									</div>

									{/* Attack Actions List */}
									<div className="space-y-2">
										{Object.entries(attackActions).map(([name, config]) => (
											<div key={name} className="bg-gray-800 rounded-lg p-4">
												<div className="flex items-start justify-between mb-2">
													<div className="flex-1">
														<h5 className="text-white font-semibold">{name}</h5>
														<div className="flex gap-4 mt-2 text-sm">
															<span className="text-gray-400">
																Probability:{" "}
																<span className="text-green-400">
																	{config.probability}%
																</span>
															</span>
															<span className="text-gray-400">
																Cost:{" "}
																<span className="text-yellow-400">
																	{config.cost}
																</span>
															</span>
														</div>
														{config.counter_actions && (
															<div className="text-xs text-gray-400 mt-1">
																Counter:{" "}
																<span className="text-blue-400">
																	{config.counter_actions}
																</span>
															</div>
														)}
														{(config.tactics || config.techniques) && (
															<div className="flex gap-2 mt-2">
																{config.tactics && (
																	<Badge
																		variant="outline"
																		className="text-xs bg-blue-900/30 text-blue-300"
																	>
																		{config.tactics.length} tactics
																	</Badge>
																)}
																{config.techniques && (
																	<Badge
																		variant="outline"
																		className="text-xs bg-red-900/30 text-red-300"
																	>
																		{config.techniques.length} techniques
																	</Badge>
																)}
															</div>
														)}
													</div>
													<Button
														onClick={() => removeAction(name, "attack")}
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
								</ScrollArea>
							</TabsContent>

							<TabsContent value="defense" className="flex-1 flex flex-col m-0">
								<ScrollArea className="flex-1 p-6">
									{/* Add New Defense Action */}
									<div className="bg-gray-800 rounded-lg p-4 mb-4">
										<h4 className="text-white font-semibold mb-4">
											Add New Defense Action
										</h4>
										<div className="grid grid-cols-2 gap-3 mb-3">
											<div>
												<Label className="text-gray-300 text-xs mb-1 block">
													Action Name
												</Label>
												<Input
													placeholder="e.g., SQL Injection Defense"
													value={newActionName}
													onChange={(e) => setNewActionName(e.target.value)}
													className="bg-gray-700 border-gray-600 text-white"
												/>
											</div>
											<div>
												<Label className="text-gray-300 text-xs mb-1 block">
													Counter Action Name
												</Label>
												<Input
													placeholder="e.g., SQL Injection"
													value={newActionCounter}
													onChange={(e) => setNewActionCounter(e.target.value)}
													className="bg-gray-700 border-gray-600 text-white"
												/>
											</div>
											<div>
												<Label className="text-gray-300 text-xs mb-1 block">
													Probability (0-100)
												</Label>
												<Input
													type="number"
													min="0"
													max="100"
													value={newActionProbability}
													onChange={(e) =>
														setNewActionProbability(
															parseFloat(e.target.value) || 0,
														)
													}
													className="bg-gray-700 border-gray-600 text-white"
												/>
											</div>
											<div>
												<Label className="text-gray-300 text-xs mb-1 block">
													Cost (Credits)
												</Label>
												<Input
													type="number"
													min="0"
													step="0.1"
													value={newActionCost}
													onChange={(e) =>
														setNewActionCost(parseFloat(e.target.value) || 0)
													}
													className="bg-gray-700 border-gray-600 text-white"
												/>
											</div>
										</div>
										{(selectedTactics.length > 0 ||
											selectedTechniques.length > 0) && (
											<div className="mb-3 space-y-2">
												{selectedTactics.length > 0 && (
													<div className="flex flex-wrap gap-1">
														<Label className="text-gray-400 text-xs mr-2">
															Tactics:
														</Label>
														{selectedTactics.map((t) => (
															<Badge
																key={t}
																variant="outline"
																className="text-xs bg-blue-900/30 text-blue-300"
															>
																{t}
															</Badge>
														))}
													</div>
												)}
												{selectedTechniques.length > 0 && (
													<div className="flex flex-wrap gap-1">
														<Label className="text-gray-400 text-xs mr-2">
															Techniques:
														</Label>
														{selectedTechniques.map((t) => (
															<Badge
																key={t}
																variant="outline"
																className="text-xs bg-red-900/30 text-red-300"
															>
																{t}
															</Badge>
														))}
													</div>
												)}
											</div>
										)}
										<Button
											onClick={addAction}
											className="w-full bg-blue-600 hover:bg-blue-700"
										>
											<Plus className="w-4 h-4 mr-2" />
											Add Defense Action
										</Button>
									</div>

									{/* Defense Actions List */}
									<div className="space-y-2">
										{Object.entries(defenseActions).map(([name, config]) => (
											<div key={name} className="bg-gray-800 rounded-lg p-4">
												<div className="flex items-start justify-between mb-2">
													<div className="flex-1">
														<h5 className="text-white font-semibold">{name}</h5>
														<div className="flex gap-4 mt-2 text-sm">
															<span className="text-gray-400">
																Probability:{" "}
																<span className="text-green-400">
																	{config.probability}%
																</span>
															</span>
															<span className="text-gray-400">
																Cost:{" "}
																<span className="text-yellow-400">
																	{config.cost}
																</span>
															</span>
														</div>
														{config.counter_actions && (
															<div className="text-xs text-gray-400 mt-1">
																Counter:{" "}
																<span className="text-red-400">
																	{config.counter_actions}
																</span>
															</div>
														)}
														{(config.tactics || config.techniques) && (
															<div className="flex gap-2 mt-2">
																{config.tactics && (
																	<Badge
																		variant="outline"
																		className="text-xs bg-blue-900/30 text-blue-300"
																	>
																		{config.tactics.length} tactics
																	</Badge>
																)}
																{config.techniques && (
																	<Badge
																		variant="outline"
																		className="text-xs bg-red-900/30 text-red-300"
																	>
																		{config.techniques.length} techniques
																	</Badge>
																)}
															</div>
														)}
													</div>
													<Button
														onClick={() => removeAction(name, "defense")}
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
								</ScrollArea>
							</TabsContent>
						</Tabs>
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
					<div className="flex-1 text-sm text-gray-400">
						<div>Attack Actions: {Object.keys(attackActions).length}</div>
						<div>Defense Actions: {Object.keys(defenseActions).length}</div>
					</div>
					<Button
						onClick={() => onClose()}
						variant="outline"
						className="bg-gray-700 text-white hover:bg-gray-600 border-gray-600"
					>
						انصراف
					</Button>
					<Button
						onClick={handleSubmit}
						className="bg-green-600 text-white hover:bg-green-700"
						disabled={
							Object.keys(attackActions).length === 0 &&
							Object.keys(defenseActions).length === 0
						}
					>
						ثبت تنظیمات
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default AttackActionConfigDialog;
