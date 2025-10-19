import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuLabel,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Button } from "@workspace/ui/components/button";
import {
	Settings,
	Volume2,
	VolumeX,
	Mic,
	MicOff,
	Monitor,
	Moon,
	Sun,
	Languages,
	Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { playClickSound } from "@/lib/playClickSound";

export default function SettingsMenu() {
	const { setTheme } = useTheme();
	const [soundEnabled, setSoundEnabled] = useState(true);
	const [voiceControl, setVoiceControl] = useState(false);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					onClick={playClickSound}
					variant="ghost"
					size="icon"
					className="text-gray-400 hover:bg-white flex flex-col items-center gap-1"
				>
					<Settings size={18} />
					<span className="text-gray-400 text-xs">تنظیمات</span>
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align="end"
				className="w-56 bg-zinc-900 text-white border-green-600"
			>
				<DropdownMenuLabel className="text-green-400">
					تنظیمات کلی
				</DropdownMenuLabel>
				<DropdownMenuSeparator className="bg-green-700" />

				{/* 🎨 Theme */}
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<Monitor className="mr-2 h-4 w-4 text-green-500" />
						<span>ظاهر</span>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent className="bg-zinc-900 border-green-700">
						<DropdownMenuItem onClick={() => setTheme("light")}>
							<Sun className="mr-2 h-4 w-4 text-yellow-400" /> روشن
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setTheme("dark")}>
							<Moon className="mr-2 h-4 w-4 text-blue-400" /> تیره
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setTheme("system")}>
							<Monitor className="mr-2 h-4 w-4 text-gray-400" /> سیستم
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>

				{/* 🔊 Sound */}
				<DropdownMenuItem onClick={() => setSoundEnabled(!soundEnabled)}>
					{soundEnabled ? (
						<Volume2 className="mr-2 h-4 w-4 text-green-400" />
					) : (
						<VolumeX className="mr-2 h-4 w-4 text-red-500" />
					)}
					صدا: {soundEnabled ? "فعال" : "غیرفعال"}
				</DropdownMenuItem>

				{/* 🎙 Voice Control */}
				<DropdownMenuItem onClick={() => setVoiceControl(!voiceControl)}>
					{voiceControl ? (
						<Mic className="mr-2 h-4 w-4 text-green-400" />
					) : (
						<MicOff className="mr-2 h-4 w-4 text-gray-400" />
					)}
					کنترل صوتی: {voiceControl ? "روشن" : "خاموش"}
				</DropdownMenuItem>

				{/* 🌐 Language */}
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<Languages className="mr-2 h-4 w-4 text-green-500" />
						زبان
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent className="bg-zinc-900 border-green-700">
						<DropdownMenuItem>فارسی 🇮🇷</DropdownMenuItem>
						<DropdownMenuItem>English 🇬🇧</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>

				<DropdownMenuSeparator className="bg-green-700" />
				<DropdownMenuItem>
					<Zap className="mr-2 h-4 w-4 text-yellow-400" /> بهینه‌سازی عملکرد
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
