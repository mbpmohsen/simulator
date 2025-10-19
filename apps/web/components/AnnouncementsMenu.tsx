"use client";

import { Bell, Send, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { playClickSound } from "@/lib/playClickSound";

interface Announcement {
	id: number;
	name: string;
	message: string;
	timestamp?: string;
	team?: string;
}

const announcementsData: Announcement[] = [
	{
		id: 1,
		name: "علی رضایی",
		message: "بازی عالی بود، ولی نیاز به استراتژی جدید داریم.",
		timestamp: "۲ دقیقه پیش",
		team: "تیم قرمز",
	},
	{
		id: 2,
		name: "نگار محمدی",
		message: "من برای تیم آبی آماده‌ام!",
		timestamp: "۵ دقیقه پیش",
		team: "تیم آبی",
	},
	{
		id: 3,
		name: "ممد ممدی",
		message: "بنظرم برای شروع بهتره که ....",
		timestamp: "هم اکنون",
		team: "تیم سبز",
	},
];

export default function AnnouncementsMenu() {
	const [announcements, setAnnouncements] = useState(announcementsData);
	const [newMessage, setNewMessage] = useState("");
	const [isOpen, setIsOpen] = useState(false);

	const handleSendMessage = () => {
		if (newMessage.trim() === "") return;

		const newAnnouncement: Announcement = {
			id: announcements.length + 1,
			name: "شما", // Current user
			message: newMessage,
			timestamp: "هم اکنون",
			team: "تیم شما",
		};

		setAnnouncements((prev) => [newAnnouncement, ...prev]);
		setNewMessage("");

		// Here you would typically send the message to your backend/WebSocket
		console.log("Sending message:", newMessage);

		// Simulate receiving a response after 2 seconds
		setTimeout(() => {
			const response: Announcement = {
				id: announcements.length + 2,
				name: "هم تیمی",
				message: "پیام شما دریافت شد! استراتژی خوبیه",
				timestamp: "هم اکنون",
				team: "تیم شما",
			};
			setAnnouncements((prev) => [response, ...prev]);
		}, 2000);
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					onClick={playClickSound}
					variant="ghost"
					size="icon"
					className="text-gray-400 hover:bg-white flex flex-col items-center gap-1 relative"
				>
					<Bell size={18} />
					<span className="text-gray-400 text-xs">اعلانات</span>
					{/* Notification badge */}
					<div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align="end"
				className="w-[380px] bg-black/95 border border-gray-700 rounded-xl p-0 overflow-hidden"
			>
				{/* Header */}
				<div className="p-4 border-b border-gray-700 bg-gradient-to-r from-gray-900 to-black">
					<div className="flex items-center justify-between">
						<h3 className="text-white font-bold text-lg">چت تیمی</h3>
						<div className="flex items-center gap-2 text-green-400">
							<Users size={16} />
							<span className="text-sm">آنلاین: ۱۲</span>
						</div>
					</div>
					<p className="text-gray-400 text-sm mt-1">ارتباط با اعضای تیم</p>
				</div>

				{/* Messages Container */}
				<div className="max-h-[300px] overflow-y-auto p-3 space-y-3">
					{announcements.map((item, index) => (
						<div
							key={item.id}
							className={`flex flex-col gap-1 p-3 rounded-lg border ${
								index === 0
									? "border-green-500 bg-green-900/20"
									: "border-white/10 bg-gray-900/50"
							} ${item.name === "شما" ? "bg-blue-900/20 border-blue-400" : ""}`}
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span
										className={`font-semibold text-sm ${
											item.name === "شما" ? "text-blue-400" : "text-green-400"
										}`}
									>
										{item.name}
									</span>
									{item.team && (
										<span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
											{item.team}
										</span>
									)}
								</div>
								<span className="text-xs text-gray-500">{item.timestamp}</span>
							</div>
							<p className="text-white text-sm leading-relaxed">
								{item.message}
							</p>
						</div>
					))}
				</div>

				{/* Input Area */}
				<div className="p-3 border-t border-gray-700 bg-gray-900/50">
					<div className="flex gap-2">
						<Input
							value={newMessage}
							onChange={(e) => setNewMessage(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder="پیام خود را بنویسید..."
							className="flex-1 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
							dir="rtl"
						/>
						<Button
							onClick={handleSendMessage}
							disabled={!newMessage.trim()}
							className="bg-green-600 hover:bg-green-700 text-white px-4"
							size="sm"
						>
							<Send size={16} />
						</Button>
					</div>
					<p className="text-xs text-gray-400 text-center mt-2">
						Enter برای ارسال • Shift+Enter برای خط جدید
					</p>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
