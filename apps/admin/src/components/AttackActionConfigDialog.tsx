/** biome-ignore-all lint/a11y/useButtonType: <explanation> */
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
import { type FC, useEffect, useState } from "react";
import { selectActions, useGameConfigStore } from "@/store/store";

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
	const removeAttackActionFromStore = useGameConfigStore(
		(s) => s.removeAttackAction,
	);
	const removeDefenseActionFromStore = useGameConfigStore(
		(s) => s.removeDefenseAction,
	);

	// Form state for new action
	const [newActionName, setNewActionName] = useState("");
	const [newActionProbability, setNewActionProbability] = useState(50);
	const [newActionCost, setNewActionCost] = useState(10);
	const [newActionCounter, setNewActionCounter] = useState("");
	const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);
	const [selectedTactics, setSelectedTactics] = useState<string[]>([]);

	const [errors, setErrors] = useState<string[]>([]);

	// Fetch groups on mount
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
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
			setErrors(["خطا در دریافت لیست گروه‌های حمله"]);
		} finally {
			setLoading(false);
		}
	};

	const fetchGroupDetail = async (groupId: string) => {
		try {
			setLoading(true);
			const response = await fetch(
				`/api/attack-data?groupId=${groupId}&lang=fa`,
			);
			const data = await response.json();
			setGroupDetail(data);
			setSelectedTechniques([]);
			setSelectedTactics([]);
		} catch (error) {
			console.error("Failed to fetch group details:", error);
			setErrors(["خطا در دریافت جزئیات گروه حمله"]);
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
		return name;
			// .toUpperCase()
			// .replace(/\s+/g, "_")
			// .replace(/[^A-Z0-9_]/g, "");
	};

	const addAction = () => {
		const validationErrors: string[] = [];

		if (!newActionName.trim()) {
			validationErrors.push("وارد کردن نام اکشن اجباری است");
		}

		if (newActionProbability < 0 || newActionProbability > 100) {
			validationErrors.push("احتمال باید عددی بین ۰ تا ۱۰۰ باشد");
		}

		if (newActionCost <= 0) {
			validationErrors.push("هزینه باید بزرگ‌تر از ۰ باشد");
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
				setErrors(["اکشنی با این نام در حمله از قبل وجود دارد"]);
				return;
			}
			addAttackActionToStore(actionName, newAction);
		} else {
			if (defenseActions[actionName]) {
				setErrors(["اکشنی با این نام در دفاع از قبل وجود دارد"]);
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
			<DialogContent
				className="
          max-w-6xl w-[96vw]
          max-h-[90vh]
          bg-gray-900 border-gray-700
          p-0 gap-0
          flex flex-col
          overflow-hidden
        "
			>
				<DialogHeader className="px-6 py-4 border-b border-gray-700 shrink-0">
					<DialogTitle className="text-white text-xl text-right">
						تنظیم اکشن‌های حمله و دفاع
					</DialogTitle>
				</DialogHeader>

				{/* Main content area - FIXED: Added proper flex constraints */}
				<div className="flex flex-1 min-h-0 overflow-hidden">
					{/* Left Panel - Attack Group Selection */}
					<div className="w-1/3 border-l border-gray-700 flex flex-col min-h-0 bg-gray-900">
						{/* Header aligned with Tabs header */}
						<div className="px-4 py-3 border-b border-gray-700 bg-gray-800 flex items-center justify-between shrink-0">
							<div className="flex items-center gap-2">
								<Shield className="w-4 h-4 text-cyan-400" />
								<span className="text-sm font-semibold text-gray-100">
									انتخاب گروه حمله
								</span>
							</div>
							{selectedGroup && groupDetail && (
								<span className="text-[11px] text-gray-400 line-clamp-1">
									{groupDetail.name}
								</span>
							)}
						</div>

						{/* Group Selection + Details in scrollable area - FIXED: Proper height constraints */}
						<ScrollArea className="flex-1 min-h-0">
							<div className="p-4 space-y-4">
								{/* Group Selection */}
								<div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
									<Label className="text-gray-300 text-xs mb-2 block text-right">
										انتخاب گروه حمله
									</Label>
									<Select value={selectedGroup} onValueChange={handleGroupChange}>
										<SelectTrigger className="bg-gray-700 border-gray-600 text-white text-sm justify-between">
											<SelectValue placeholder="یک گروه حمله را انتخاب کنید..." />
										</SelectTrigger>
										<SelectContent className="bg-gray-800 border-gray-700 max-h-[260px] overflow-y-auto text-right">
											{groups?.map((group) => (
												<SelectItem
													key={group.id}
													value={group.id}
													className="text-white text-sm"
												>
													{group.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Tactics & Techniques */}
								{loading && (
									<div className="text-gray-400 text-center py-8 text-sm">
										در حال بارگذاری اطلاعات گروه...
									</div>
								)}

								{!loading && groupDetail && (
									<div className="space-y-4">
										{/* Tactics */}
										{groupDetail.tactics.length > 0 && (
											<div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
												<h4 className="text-white font-semibold mb-3 flex items-center justify-between text-sm">
													<span className="flex items-center gap-2">
														<Shield className="w-4 h-4 text-blue-400" />
														<span>تاکتیک‌ها</span>
													</span>
													<span className="text-xs text-gray-400">
														{groupDetail.tactics.length} مورد
													</span>
												</h4>
												<div className="space-y-2">
													{groupDetail.tactics.map((tactic) => (
														<div
															key={tactic}
															className="flex items-center gap-2 text-right"
														>
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
											<div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
												<h4 className="text-white font-semibold mb-3 flex items-center justify-between text-sm">
													<span className="flex items-center gap-2">
														<Swords className="w-4 h-4 text-red-400" />
														<span>تکنیک‌ها</span>
													</span>
													<span className="text-xs text-gray-400">
														{groupDetail.techniques.length} مورد
													</span>
												</h4>
												<div className="space-y-2">
													{groupDetail.techniques.map((technique) => (
														<div
															key={technique.id}
															className="border border-gray-700 rounded-md bg-gray-900/40"
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
																	className="flex-1 text-right flex items-center justify-between gap-2 text-sm text-gray-300 hover:text-white"
																>
																	<span className="flex-1">{technique.name}</span>
																	{expandedTechniques[technique.id] ? (
																		<ChevronDown className="w-3 h-3" />
																	) : (
																		<ChevronRight className="w-3 h-3" />
																	)}
																</button>
															</div>
															{expandedTechniques[technique.id] && (
																<div className="px-3 pb-3 text-xs text-gray-400 text-right leading-relaxed">
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
									<div className="text-gray-400 text-center py-8 text-sm">
										برای مشاهده تاکتیک‌ها و تکنیک‌ها، یک گروه حمله را انتخاب کنید.
									</div>
								)}
							</div>
						</ScrollArea>
					</div>

					{/* Right Panel - Action Configuration - FIXED: Proper flex constraints */}
					<div className="flex-1 flex flex-col min-h-0 bg-gray-950">
						<Tabs
							value={activeTab}
							onValueChange={(v) => setActiveTab(v as "attack" | "defense")}
							className="flex-1 flex flex-col min-h-0"
						>
							{/* Tabs Header - FIXED: Added shrink-0 */}
							<TabsList className="bg-gray-800 border-b border-gray-700 rounded-none w-full justify-end p-0 shrink-0">
								<TabsTrigger
									value="attack"
									className="
                    relative
                    rounded-none px-6 py-3 text-sm font-semibold
                    flex items-center gap-2
                    text-gray-400
                    data-[state=active]:text-red-100
                    data-[state=active]:bg-red-700/30
                    data-[state=active]:shadow-[inset_0_-3px_0_rgba(248,113,113,1)]
                    transition-colors
                  "
								>
									<Swords className="w-4 h-4" />
									<span>اکشن‌های حمله</span>
								</TabsTrigger>
								<TabsTrigger
									value="defense"
									className="
                    relative
                    rounded-none px-6 py-3 text-sm font-semibold
                    flex items-center gap-2
                    text-gray-400
                    data-[state=active]:text-blue-100
                    data-[state=active]:bg-blue-700/30
                    data-[state=active]:shadow-[inset_0_-3px_0_rgba(59,130,246,1)]
                    transition-colors
                  "
								>
									<Shield className="w-4 h-4" />
									<span>اکشن‌های دفاع</span>
								</TabsTrigger>
							</TabsList>

							{/* Attack Tab - FIXED: Proper scroll container */}
							<TabsContent
								value="attack"
								className="flex-1 flex flex-col m-0 p-0 min-h-0 data-[state=active]:flex"
							>
								<ScrollArea className="flex-1">
									<div className="p-6 space-y-4">
										{/* Add New Attack Action */}
										<div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
											<h4 className="text-white font-semibold mb-4 text-right text-sm">
												افزودن اکشن حمله جدید
											</h4>
											<div className="grid grid-cols-2 gap-3 mb-3">
												<div className="col-span-2">
													<Label className="text-gray-300 text-xs mb-1 block text-right">
														نام اکشن حمله
													</Label>
													<Input
														placeholder="مثال: تزریق SQL"
														value={newActionName}
														onChange={(e) => setNewActionName(e.target.value)}
														className="bg-gray-700 border-gray-600 text-white text-sm text-right"
													/>
												</div>
												<div>
													<Label className="text-gray-300 text-xs mb-1 block text-right">
														نام اکشن مقابله (دفاع)
													</Label>
													<Input
														placeholder="مثال: دفاع در برابر تزریق SQL"
														value={newActionCounter}
														onChange={(e) => setNewActionCounter(e.target.value)}
														className="bg-gray-700 border-gray-600 text-white text-sm text-right"
													/>
												</div>
												<div>
													<Label className="text-gray-300 text-xs mb-1 block text-right">
														احتمال (۰ تا ۱۰۰ درصد)
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
														className="bg-gray-700 border-gray-600 text-white text-sm text-right"
													/>
												</div>
												<div>
													<Label className="text-gray-300 text-xs mb-1 block text-right">
														هزینه (کریستال / امتیاز)
													</Label>
													<Input
														type="number"
														min="0"
														step="0.1"
														value={newActionCost}
														onChange={(e) =>
															setNewActionCost(parseFloat(e.target.value) || 0)
														}
														className="bg-gray-700 border-gray-600 text-white text-sm text-right"
													/>
												</div>
											</div>
											{(selectedTactics.length > 0 ||
												selectedTechniques.length > 0) && (
												<div className="mb-3 space-y-2 text-right">
													{selectedTactics.length > 0 && (
														<div className="flex flex-wrap gap-1 justify-end">
															<Label className="text-gray-400 text-xs">
																تاکتیک‌های مرتبط:
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
														<div className="flex flex-wrap gap-1 justify-end">
															<Label className="text-gray-400 text-xs">
																تکنیک‌های مرتبط:
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
												className="w-full bg-red-600 hover:bg-red-700 text-sm"
											>
												<Plus className="w-4 h-4 ml-2" />
												افزودن اکشن حمله
											</Button>
										</div>

										{/* Attack Actions List */}
										<div className="space-y-2 overflow-y-auto max-h-[300px]">
											{Object.entries(attackActions).map(([name, config]) => (
												<div
													key={name}
													className="bg-gray-800 rounded-lg p-4 border border-gray-700"
												>
													<div className="flex items-start justify-between gap-3">
														<div className="flex-1 text-right">
															<h5 className="text-white font-semibold text-sm break-all">
																{name}
															</h5>
															<div className="flex flex-wrap gap-4 mt-2 text-xs justify-end">
																<span className="text-gray-400">
																	احتمال:{" "}
																	<span className="text-green-400 font-semibold">
																		{config.probability}٪
																	</span>
																</span>
																<span className="text-gray-400">
																	هزینه:{" "}
																	<span className="text-yellow-400 font-semibold">
																		{config.cost}
																	</span>
																</span>
															</div>
															{config.counter_actions && (
																<div className="text-[11px] text-gray-400 mt-1">
																	اکشن مقابله:{" "}
																	<span className="text-blue-400">
																		{config.counter_actions}
																	</span>
																</div>
															)}
															{(config.tactics || config.techniques) && (
																<div className="flex flex-wrap gap-2 mt-2 justify-end">
																	{config.tactics && (
																		<Badge
																			variant="outline"
																			className="text-[11px] bg-blue-900/30 text-blue-300"
																		>
																			{config.tactics.length} تاکتیک
																		</Badge>
																	)}
																	{config.techniques && (
																		<Badge
																			variant="outline"
																			className="text-[11px] bg-red-900/30 text-red-300"
																		>
																			{config.techniques.length} تکنیک
																		</Badge>
																	)}
																</div>
															)}
														</div>
														<Button
															onClick={() => removeAction(name, "attack")}
															variant="ghost"
															size="sm"
															className="text-red-400 hover:text-red-300 hover:bg-red-900/20 shrink-0"
														>
															<X className="w-4 h-4" />
														</Button>
													</div>
												</div>
											))}
											{Object.keys(attackActions).length === 0 && (
												<div className="text-xs text-gray-500 text-right">
													هنوز هیچ اکشن حمله‌ای ثبت نشده است.
												</div>
											)}
										</div>
									</div>
								</ScrollArea>
							</TabsContent>

							{/* Defense Tab - FIXED: Proper scroll container */}
							<TabsContent
								value="defense"
								className="flex-1 flex flex-col m-0 p-0 min-h-0 data-[state=active]:flex"
							>
								<ScrollArea className="flex-1">
									<div className="p-6 space-y-4">
										{/* Add New Defense Action */}
										<div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
											<h4 className="text-white font-semibold mb-4 text-right text-sm">
												افزودن اکشن دفاع جدید
											</h4>
											<div className="grid grid-cols-2 gap-3 mb-3">
												<div className="col-span-2">
													<Label className="text-gray-300 text-xs mb-1 block text-right">
														نام اکشن دفاع
													</Label>
													<Input
														placeholder="مثال: دفاع در برابر تزریق SQL"
														value={newActionName}
														onChange={(e) => setNewActionName(e.target.value)}
														className="bg-gray-700 border-gray-600 text-white text-sm text-right"
													/>
												</div>
												<div>
													<Label className="text-gray-300 text-xs mb-1 block text-right">
														نام اکشن حمله هدف
													</Label>
													<Input
														placeholder="مثال: تزریق SQL"
														value={newActionCounter}
														onChange={(e) => setNewActionCounter(e.target.value)}
														className="bg-gray-700 border-gray-600 text-white text-sm text-right"
													/>
												</div>
												<div>
													<Label className="text-gray-300 text-xs mb-1 block text-right">
														احتمال (۰ تا ۱۰۰ درصد)
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
														className="bg-gray-700 border-gray-600 text-white text-sm text-right"
													/>
												</div>
												<div>
													<Label className="text-gray-300 text-xs mb-1 block text-right">
														هزینه (کریستال / امتیاز)
													</Label>
													<Input
														type="number"
														min="0"
														step="0.1"
														value={newActionCost}
														onChange={(e) =>
															setNewActionCost(parseFloat(e.target.value) || 0)
														}
														className="bg-gray-700 border-gray-600 text-white text-sm text-right"
													/>
												</div>
											</div>
											{(selectedTactics.length > 0 ||
												selectedTechniques.length > 0) && (
												<div className="mb-3 space-y-2 text-right">
													{selectedTactics.length > 0 && (
														<div className="flex flex-wrap gap-1 justify-end">
															<Label className="text-gray-400 text-xs">
																تاکتیک‌های مرتبط:
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
														<div className="flex flex-wrap gap-1 justify-end">
															<Label className="text-gray-400 text-xs">
																تکنیک‌های مرتبط:
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
												className="w-full bg-blue-600 hover:bg-blue-700 text-sm"
											>
												<Plus className="w-4 h-4 ml-2" />
												افزودن اکشن دفاع
											</Button>
										</div>

										{/* Defense Actions List */}
										<div className="space-y-2">
											{Object.entries(defenseActions).map(([name, config]) => (
												<div
													key={name}
													className="bg-gray-800 rounded-lg p-4 border border-gray-700"
												>
													<div className="flex items-start justify-between gap-3">
														<div className="flex-1 text-right">
															<h5 className="text-white font-semibold text-sm break-all">
																{name}
															</h5>
															<div className="flex flex-wrap gap-4 mt-2 text-xs justify-end">
																<span className="text-gray-400">
																	احتمال:{" "}
																	<span className="text-green-400 font-semibold">
																		{config.probability}٪
																	</span>
																</span>
																<span className="text-gray-400">
																	هزینه:{" "}
																	<span className="text-yellow-400 font-semibold">
																		{config.cost}
																	</span>
																</span>
															</div>
															{config.counter_actions && (
																<div className="text-[11px] text-gray-400 mt-1">
																	اکشن حمله هدف:{" "}
																	<span className="text-red-400">
																		{config.counter_actions}
																	</span>
																</div>
															)}
															{(config.tactics || config.techniques) && (
																<div className="flex flex-wrap gap-2 mt-2 justify-end">
																	{config.tactics && (
																		<Badge
																			variant="outline"
																			className="text-[11px] bg-blue-900/30 text-blue-300"
																		>
																			{config.tactics.length} تاکتیک
																		</Badge>
																	)}
																	{config.techniques && (
																		<Badge
																			variant="outline"
																			className="text-[11px] bg-red-900/30 text-red-300"
																		>
																			{config.techniques.length} تکنیک
																		</Badge>
																	)}
																</div>
															)}
														</div>
														<Button
															onClick={() => removeAction(name, "defense")}
															variant="ghost"
															size="sm"
															className="text-red-400 hover:text-red-300 hover:bg-red-900/20 shrink-0"
														>
															<X className="w-4 h-4" />
														</Button>
													</div>
												</div>
											))}
											{Object.keys(defenseActions).length === 0 && (
												<div className="text-xs text-gray-500 text-right">
													هنوز هیچ اکشن دفاعی ثبت نشده است.
												</div>
											)}
										</div>
									</div>
								</ScrollArea>
							</TabsContent>
						</Tabs>
					</div>
				</div>

				{/* Errors - FIXED: Added shrink-0 */}
				{errors.length > 0 && (
					<div className="px-6 py-3 bg-red-900/20 border-t border-red-700 shrink-0">
						{errors.map((error, i) => (
							<div
								key={i}
								className="flex items-center gap-2 text-red-400 text-sm justify-end"
							>
								<span>{error}</span>
								<AlertCircle className="w-4 h-4" />
							</div>
						))}
					</div>
				)}

				{/* Footer - FIXED: Added shrink-0 */}
				<div className="flex gap-3 px-6 py-4 border-t border-gray-700 bg-gray-800 items-center shrink-0">
					<div className="flex-1 text-xs text-gray-400 text-right space-y-1">
						<div>تعداد اکشن‌های حمله: {Object.keys(attackActions).length}</div>
						<div>تعداد اکشن‌های دفاع: {Object.keys(defenseActions).length}</div>
					</div>
					<Button
						onClick={() => onClose()}
						variant="outline"
						className="bg-gray-700 text-white hover:bg-gray-600 border-gray-600 text-sm"
					>
						انصراف
					</Button>
					<Button
						onClick={handleSubmit}
						className="bg-green-600 text-white hover:bg-green-700 text-sm"
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