"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";

const items = [
	"SQL INJECTION (SQLI)",
	"CROSS-SITE SCRIPTING (XSS)",
	"FILE INCLUSION (LFI/RFI)",
	"DENIAL-OF-SERVICE (DOS)",
	"DDOS",
	"MITM",
	"PHISHING",
];

export default function AttackMenu() {
	const [openItem, setOpenItem] = useState<string | null>(
		"SQL INJECTION (SQLI)",
	);

	return (
		<div className="space-y-3 w-full max-w-xl">
			{items.map((item) => (
				<MenuItem
					key={item}
					title={item}
					isOpen={openItem === item}
					onClick={() => setOpenItem(openItem === item ? null : item)}
				/>
			))}
		</div>
	);
}

function MenuItem({
	title,
	isOpen,
	onClick,
}: {
	title: string;
	isOpen: boolean;
	onClick: () => void;
}) {
	return (
		<div>
			<Button
				onClick={onClick}
				variant="ghost"
				className={cn(
					"w-full flex justify-between items-center px-6 py-5 text-lg font-semibold rounded-md",
					"transition-all duration-200",
					isOpen
						? "bg-green-500 text-black"
						: "bg-gradient-to-b from-[#1a1a1a] to-[#000000] text-gray-300",
				)}
			>
				<span>{title}</span>
				{isOpen ? <Minus size={22} /> : <Plus size={22} />}
			</Button>
		</div>
	);
}
