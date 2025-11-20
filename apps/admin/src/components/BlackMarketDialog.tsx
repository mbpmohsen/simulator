import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
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
import { AlertCircle, Plus, Shield, Swords, Trash2, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import {
	selectActions,
	selectBlackMarket,
	useGameConfigStore,
} from "@/store/store";

interface BlackMarketItem {
	name: string;
	item_type: "probability" | "growth" | "cost" | "tech";
	effect_type: "increase" | "multiply";
	target_action: string;
	target_action_type: "attack" | "defense";
	value: number;
	duration: number;
	cost: number;
}

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

interface BlackMarketDialogProps {
	isOpen: boolean;
	onClose: () => void;
	handleNextStep: () => void;
}

const BlackMarketDialog: React.FC<BlackMarketDialogProps> = ({
																 isOpen,
																 onClose,
																 handleNextStep,
															 }) => {
	// store helpers
	const storeActions = useGameConfigStore(selectActions);
	const setBlackMarketItems = useGameConfigStore((s) => s.setBlackMarketItems);
	const storeBlackMarket = useGameConfigStore(selectBlackMarket);

	// local buffer for items until user submits
	const [localItems, setLocalItems] = useState<BlackMarketItem[]>([]);

	// available actions (fetched from API or fallback to store)
	const [attackActionsList, setAttackActionsList] = useState<
		Record<string, any>
	>({});
	const [defenseActionsList, setDefenseActionsList] = useState<
		Record<string, any>
	>({});
	const [groups, setGroups] = useState<Group[]>([]);
	const [selectedGroup, setSelectedGroup] = useState<string>("");
	const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);

	// New item form state
	const [newItem, setNewItem] = useState<Omit<BlackMarketItem, "name">>({
		item_type: "probability",
		effect_type: "increase",
		target_action: "none",
		target_action_type: "attack",
		value: 20.0,
		duration: 3,
		cost: 25.0,
	});

	const [customItemName, setCustomItemName] = useState("");

	// Item type options
	const itemTypes = [
		{
			value: "probability",
			label: "افزایش احتمال",
			description: "احتمال موفقیت عمل را تغییر می‌دهد",
		},
		{
			value: "growth",
			label: "تقویت کننده رشد",
			description: "میزان رشد را تغییر می‌دهد",
		},
		{
			value: "cost",
			label: "کاهش هزینه",
			description: "هزینه عملیات را کاهش می‌دهد",
		},
		{
			value: "tech",
			label: "ارتقاء تکنولوژی",
			description: "سطح تکنولوژی را ارتقاء می‌دهد",
		},
	];

	const effectTypes = [
		{ value: "increase", label: "افزایش" },
		{ value: "multiply", label: "ضرب" },
	];

	// Fetch groups on mount
	useEffect(() => {
		fetchGroups();
		fetchActions();
	}, []);

	// initialize local items from store when dialog opens
	useEffect(() => {
		if (isOpen) {
			setLocalItems(storeBlackMarket || []);
		}
	}, [isOpen, storeBlackMarket]);

	// try to fetch available actions from API; fallback to store
	const fetchActions = async () => {
		try {
			const res = await fetch("/api/attack-data?lang=fa");
			if (res.ok) {
				const data = await res.json();
				setAttackActionsList(data.attack || {});
				setDefenseActionsList(data.defense || {});
				return;
			}
		} catch (e) {
			// ignore and fallback to store
		}

		// fallback to store
		setAttackActionsList(storeActions.attack || {});
		setDefenseActionsList(storeActions.defense || {});
	};

	const fetchGroups = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/attack-data?lang=fa");
			const data = await response.json();
			setGroups(data);
		} catch (error) {
			console.error("Failed to fetch groups:", error);
			setErrors(["خطا در بارگذاری گروه‌های حمله"]);
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
		} catch (error) {
			console.error("Failed to fetch group details:", error);
			setErrors(["خطا در بارگذاری جزئیات گروه"]);
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

	// Get available actions based on selected type
	const getAvailableActions = () => {
		const list =
			newItem.target_action_type === "attack"
				? attackActionsList
				: defenseActionsList;
		return Object.keys(list).filter((key) => key.trim() !== "");
	};

	const validateItem = (): string[] => {
		const validationErrors: string[] = [];

		if (!customItemName.trim()) {
			validationErrors.push("نام آیتم الزامی است");
		}

		if (!newItem.target_action) {
			validationErrors.push("انتخاب عمل هدف الزامی است");
		}

		if (newItem.value <= 0) {
			validationErrors.push("مقدار باید بزرگتر از صفر باشد");
		}

		if (newItem.duration <= 0) {
			validationErrors.push("مدت زمان باید بزرگتر از صفر باشد");
		}

		if (newItem.cost <= 0) {
			validationErrors.push("هزینه باید بزرگتر از صفر باشد");
		}

		// Check for duplicate item names
		if (localItems.some((item) => item.name === customItemName.trim())) {
			validationErrors.push("آیتمی با این نام قبلاً اضافه شده است");
		}

		return validationErrors;
	};

	const addItem = () => {
		const validationErrors = validateItem();
		if (validationErrors.length > 0) {
			setErrors(validationErrors);
			return;
		}

		const finalItem: BlackMarketItem = {
			name: customItemName.trim(),
			...newItem,
		};

		// add to local buffer
		setLocalItems((prev) => [...prev, finalItem]);

		// Reset form
		setCustomItemName("");
		setNewItem({
			item_type: "probability",
			effect_type: "increase",
			target_action: "none",
			target_action_type: "attack",
			value: 20.0,
			duration: 3,
			cost: 25.0,
		});
		setErrors([]);
	};

	const removeItem = (index: number) => {
		setLocalItems((prev) => prev.filter((_, i) => i !== index));
	};

	const handleSubmit = () => {
		if (localItems.length === 0) {
			setErrors(["لطفاً حداقل یک آیتم به بازار سیاه اضافه کنید"]);
			return;
		}

		// persist to store
		setBlackMarketItems(localItems);
		handleNextStep();
	};

	const getItemTypeLabel = (type: string) => {
		return itemTypes.find((t) => t.value === type)?.label || type;
	};

	const getEffectTypeLabel = (type: string) => {
		return effectTypes.find((t) => t.value === type)?.label || type;
	};

	const getActionTypeLabel = (type: string) => {
		return type === "attack" ? "حمله" : "دفاع";
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-6xl bg-gray-900 border-gray-700 p-0 gap-0 max-h-[90vh] overflow-hidden flex flex-col">
				<DialogHeader className="px-6 py-4 border-b border-gray-700 shrink-0">
					<DialogTitle className="text-white text-xl text-right">
						بازار سیاه
					</DialogTitle>
				</DialogHeader>

				{/* Main Content Area - FIXED: Proper flex constraints */}
				<div className="flex flex-1 min-h-0 overflow-hidden">
					{/* Left Panel - ATT&CK Groups and New Item Form */}
					<div className="w-2/5 border-r border-gray-700 flex flex-col min-h-0">
						{/* ATT&CK Group Selection - FIXED: Added shrink-0 */}
						<div className="p-4 border-b border-gray-700 bg-gray-800 shrink-0">
							<Label className="text-gray-300 text-sm mb-2 block text-right">
								انتخاب گروه حمله (اختیاری)
							</Label>
							<Select
								value={selectedGroup || "none"}
								onValueChange={handleGroupChange}
							>
								<SelectTrigger className="bg-gray-700 border-gray-600 text-white text-right">
									<SelectValue placeholder="یک گروه حمله انتخاب کنید..." />
								</SelectTrigger>
								<SelectContent className="bg-gray-800 border-gray-700 max-h-[300px]">
									<SelectItem value="none" className="text-white text-right">
										انتخاب کنید...
									</SelectItem>
									{groups?.map((group) => (
										<SelectItem
											key={group.id}
											value={group.id}
											className="text-white text-right"
										>
											{group.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* New Item Form - FIXED: Proper scroll container */}
						<ScrollArea className="flex-1 min-h-0">
							<div className="p-4 space-y-4">
								<h4 className="text-white font-semibold text-right mb-4">
									افزودن آیتم جدید به بازار سیاه
								</h4>

								{/* Item Name */}
								<div>
									<Label className="text-gray-300 text-sm mb-2 block text-right">
										نام آیتم
									</Label>
									<Input
										placeholder="مثال: تقویت کننده حمله"
										value={customItemName}
										onChange={(e) => setCustomItemName(e.target.value)}
										className="bg-gray-700 border-gray-600 text-white text-right"
									/>
								</div>

								{/* Item Type */}
								<div>
									<Label className="text-gray-300 text-sm mb-2 block text-right">
										نوع آیتم
									</Label>
									<Select
										value={newItem.item_type}
										onValueChange={(
											value: "probability" | "growth" | "cost" | "tech",
										) => setNewItem((prev) => ({ ...prev, item_type: value }))}
									>
										<SelectTrigger className="bg-gray-700 border-gray-600 text-white text-right">
											<SelectValue />
										</SelectTrigger>
										<SelectContent className="bg-gray-800 border-gray-700">
											{itemTypes.map((type) => (
												<SelectItem
													key={type.value}
													value={type.value}
													className="text-white text-right"
												>
													<div className="text-right">
														<div>{type.label}</div>
														<div className="text-xs text-gray-400">
															{type.description}
														</div>
													</div>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Effect Type */}
								<div>
									<Label className="text-gray-300 text-sm mb-2 block text-right">
										نوع اثر
									</Label>
									<Select
										value={newItem.effect_type}
										onValueChange={(value: "increase" | "multiply") =>
											setNewItem((prev) => ({ ...prev, effect_type: value }))
										}
									>
										<SelectTrigger className="bg-gray-700 border-gray-600 text-white text-right">
											<SelectValue />
										</SelectTrigger>
										<SelectContent className="bg-gray-800 border-gray-700">
											{effectTypes.map((type) => (
												<SelectItem
													key={type.value}
													value={type.value}
													className="text-white text-right"
												>
													{type.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Action Type */}
								<div>
									<Label className="text-gray-300 text-sm mb-2 block text-right">
										نوع عمل
									</Label>
									<Select
										value={newItem.target_action_type}
										onValueChange={(value: "attack" | "defense") =>
											setNewItem((prev) => ({
												...prev,
												target_action_type: value,
												target_action: "",
											}))
										}
									>
										<SelectTrigger className="bg-gray-700 border-gray-600 text-white text-right">
											<SelectValue />
										</SelectTrigger>
										<SelectContent className="bg-gray-800 border-gray-700">
											<SelectItem
												value="attack"
												className="text-white text-right"
											>
												<div className="flex items-center gap-2 justify-end">
													<span>حمله</span>
													<Swords className="w-4 h-4 text-red-400" />
												</div>
											</SelectItem>
											<SelectItem
												value="defense"
												className="text-white text-right"
											>
												<div className="flex items-center gap-2 justify-end">
													<span>دفاع</span>
													<Shield className="w-4 h-4 text-blue-400" />
												</div>
											</SelectItem>
										</SelectContent>
									</Select>
								</div>

								{/* Target Action */}
								<div>
									<Label className="text-gray-300 text-sm mb-2 block text-right">
										عمل هدف
									</Label>
									<Select
										value={newItem.target_action}
										onValueChange={(value) =>
											setNewItem((prev) => ({ ...prev, target_action: value }))
										}
									>
										<SelectTrigger className="bg-gray-700 border-gray-600 text-white text-right">
											<SelectValue placeholder="یک عمل انتخاب کنید" />
										</SelectTrigger>
										<SelectContent className="bg-gray-800 border-gray-700 max-h-[200px]">
											{getAvailableActions().map((action) => (
												<SelectItem
													key={action}
													value={action}
													className="text-white text-right"
												>
													{action}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Value, Duration, Cost */}
								<div className="grid grid-cols-3 gap-3">
									<div>
										<Label className="text-gray-300 text-sm mb-2 block text-right">
											مقدار
										</Label>
										<Input
											type="number"
											step="0.1"
											min="0.1"
											value={newItem.value}
											onChange={(e) =>
												setNewItem((prev) => ({
													...prev,
													value: parseFloat(e.target.value) || 0,
												}))
											}
											className="bg-gray-700 border-gray-600 text-white text-right"
										/>
									</div>
									<div>
										<Label className="text-gray-300 text-sm mb-2 block text-right">
											مدت (دوره)
										</Label>
										<Input
											type="number"
											min="1"
											value={newItem.duration}
											onChange={(e) =>
												setNewItem((prev) => ({
													...prev,
													duration: parseInt(e.target.value) || 0,
												}))
											}
											className="bg-gray-700 border-gray-600 text-white text-right"
										/>
									</div>
									<div>
										<Label className="text-gray-300 text-sm mb-2 block text-right">
											هزینه
										</Label>
										<Input
											type="number"
											step="0.1"
											min="0.1"
											value={newItem.cost}
											onChange={(e) =>
												setNewItem((prev) => ({
													...prev,
													cost: parseFloat(e.target.value) || 0,
												}))
											}
											className="bg-gray-700 border-gray-600 text-white text-right"
										/>
									</div>
								</div>

								{/* Add Button */}
								<Button
									onClick={addItem}
									className="w-full bg-green-600 hover:bg-green-700 mt-4"
								>
									<Plus className="w-4 h-4 ml-2" />
									افزودن به بازار سیاه
								</Button>
							</div>

							{/* ATT&CK Techniques Preview */}
							{groupDetail && groupDetail.techniques.length > 0 && (
								<div className="mt-6 bg-gray-800 rounded-lg p-3 mx-4 mb-4">
									<h5 className="text-white font-semibold mb-3 text-right">
										تکنیک‌های گروه {groupDetail.name}
									</h5>
									<div className="space-y-2 max-h-40 overflow-y-auto">
										{groupDetail.techniques.slice(0, 5).map((technique) => (
											<div
												key={technique.id}
												className="text-xs text-gray-400 text-right p-2 bg-gray-700 rounded"
											>
												{technique.name}
											</div>
										))}
										{groupDetail.techniques.length > 5 && (
											<div className="text-xs text-gray-500 text-center">
												و {groupDetail.techniques.length - 5} تکنیک دیگر...
											</div>
										)}
									</div>
								</div>
							)}
						</ScrollArea>
					</div>

					{/* Right Panel - Items List - FIXED: Proper flex constraints */}
					<div className="flex-1 flex flex-col min-h-0">
						{/* Header - FIXED: Added shrink-0 */}
						<div className="p-4 border-b border-gray-700 bg-gray-800 shrink-0">
							<h4 className="text-white font-semibold text-right">
								آیتم‌های بازار سیاه ({localItems.length})
							</h4>
						</div>

						{/* Items List - FIXED: Proper scroll container */}
						<ScrollArea className="flex-1 min-h-0">
							<div className="p-6">
								{localItems.length === 0 ? (
									<div className="text-center py-12 text-gray-500">
										هنوز آیتمی به بازار سیاه اضافه نشده است
									</div>
								) : (
									<div className="space-y-3">
										{localItems.map((item, index) => (
											<div
												key={index}
												className="bg-gray-800 rounded-lg p-4 border border-gray-700"
											>
												<div className="flex items-start justify-between mb-3">
													<div className="flex-1 text-right">
														<h5 className="text-white font-semibold text-lg mb-2">
															{item.name}
														</h5>
														<div className="grid grid-cols-2 gap-4 text-sm">
															<div className="space-y-1">
																<div className="flex justify-between">
																	<span className="text-gray-400">نوع آیتم:</span>
																	<Badge
																		variant="outline"
																		className="bg-blue-900/30 text-blue-300"
																	>
																		{getItemTypeLabel(item.item_type)}
																	</Badge>
																</div>
																<div className="flex justify-between">
																	<span className="text-gray-400">نوع اثر:</span>
																	<Badge
																		variant="outline"
																		className="bg-green-900/30 text-green-300"
																	>
																		{getEffectTypeLabel(item.effect_type)}
																	</Badge>
																</div>
															</div>
															<div className="space-y-1">
																<div className="flex justify-between">
																	<span className="text-gray-400">عمل هدف:</span>
																	<span className="text-white">
																		{item.target_action}
																	</span>
																</div>
																<div className="flex justify-between">
																	<span className="text-gray-400">نوع عمل:</span>
																	<Badge
																		variant="outline"
																		className={
																			item.target_action_type === "attack"
																				? "bg-red-900/30 text-red-300"
																				: "bg-blue-900/30 text-blue-300"
																		}
																	>
																		{getActionTypeLabel(item.target_action_type)}
																	</Badge>
																</div>
															</div>
														</div>
														<div className="grid grid-cols-3 gap-4 mt-3 text-sm">
															<div className="text-center">
																<div className="text-gray-400">مقدار</div>
																<div className="text-yellow-400 font-semibold">
																	{item.value}
																</div>
															</div>
															<div className="text-center">
																<div className="text-gray-400">مدت</div>
																<div className="text-green-400 font-semibold">
																	{item.duration} دوره
																</div>
															</div>
															<div className="text-center">
																<div className="text-gray-400">هزینه</div>
																<div className="text-red-400 font-semibold">
																	{item.cost}
																</div>
															</div>
														</div>
													</div>
													<Button
														onClick={() => removeItem(index)}
														variant="ghost"
														size="sm"
														className="text-red-400 hover:text-red-300 hover:bg-red-900/20 shrink-0"
													>
														<Trash2 className="w-4 h-4" />
													</Button>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</ScrollArea>
					</div>
				</div>

				{/* Errors - FIXED: Added shrink-0 */}
				{errors.length > 0 && (
					<div className="px-6 py-3 bg-red-900/20 border-t border-red-700 shrink-0">
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

				{/* Footer - FIXED: Added shrink-0 */}
				<div className="flex gap-3 px-6 py-4 border-t border-gray-700 bg-gray-800 shrink-0">
					<div className="flex-1 text-sm text-gray-400 text-right">
						<div>تعداد آیتم‌ها: {localItems.length}</div>
						<div>
							هزینه کل: {localItems.reduce((sum, item) => sum + item.cost, 0)}
						</div>
					</div>
					<Button
						onClick={onClose}
						variant="outline"
						className="bg-gray-700 text-white hover:bg-gray-600 border-gray-600"
					>
						انصراف
					</Button>
					<Button
						onClick={handleSubmit}
						className="bg-green-600 text-white hover:bg-green-700"
						disabled={localItems.length === 0}
					>
						ثبت آیتم‌ها
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default BlackMarketDialog;