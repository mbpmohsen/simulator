"use client";

import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Coins, Shield, Repeat, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { playClickSound } from "@/lib/playClickSound";

const vulnerabilities = [
	{
		id: "sqli",
		name: "SQL INJECTION (SQLi)",
		description: (
			<p>
				SQL Injection (SQLi) is a web security vulnerability that allows an
				attacker to interfere with the queries that an application makes to its
				database. This can allow an attacker to view data that they are not
				normally able to retrieve.
			</p>
		),
	},
	{
		id: "xss",
		name: "CROSS-SITE SCRIPTING (XSS)",
		description: (
			<p>
				Cross-Site Scripting (XSS) is a security vulnerability that enables
				attackers to inject malicious scripts into webpages viewed by other
				users, potentially leading to data theft or session hijacking.
			</p>
		),
	},
	{
		id: "lfi-rfi",
		name: "FILE INCLUSION (LFI/RFI)",
		description: (
			<p>
				File Inclusion vulnerabilities (LFI/RFI) allow attackers to include
				local or remote files, which can lead to sensitive information
				disclosure or remote code execution.
			</p>
		),
	},
	{
		id: "dos",
		name: "DENIAL-OF-SERVICE (DOS)",
		description: (
			<p>
				Denial-of-Service (DoS) attacks aim to make a machine or network
				resource unavailable to its intended users by overwhelming it with
				traffic or requests.
			</p>
		),
	},
	{
		id: "ddos",
		name: "DDOS",
		description: (
			<p>
				Distributed Denial-of-Service (DDoS) is similar to DoS but involves
				multiple compromised systems attacking a single target, making it harder
				to mitigate.
			</p>
		),
	},
	{
		id: "mitm",
		name: "MITM",
		badge: "۴.۴ امتیاز",
		description: (
			<p>
				Man-in-the-Middle (MITM) attacks involve intercepting communication
				between two parties to eavesdrop or alter the data being transmitted.
			</p>
		),
	},
	{
		id: "phishing",
		name: "PHISHING",
		badge: "نفوذ آسان",
		description: (
			<p>
				Phishing is a cyber attack that uses disguised email as a weapon to
				trick the recipient into revealing sensitive information or installing
				malware.
			</p>
		),
	},
	{
		id: "spear-phishing",
		name: "SPEAR PHISHING",
		badge: "نفوذ هدفمند",
		description: (
			<p>
				Spear Phishing is a targeted version of phishing where the attacker
				customizes the message for a specific individual or organization.
			</p>
		),
	},
	{
		id: "vishing-smishing",
		name: "VISHING & SMISHING",
		badge: "ابزار قدرت نفوذ",
		description: (
			<p>
				Vishing (voice phishing) and Smishing (SMS phishing) are social
				engineering attacks that use phone calls or text messages to deceive
				victims into providing sensitive information.
			</p>
		),
	},
];
export default function VulnerabilitiesPage() {
	const [selectedId, setSelectedId] = useState("vishing-smishing");
	const randomPrice = useMemo(() => Math.floor(Math.random() * 2000) + 500, []);
	const randomVulnerability = useMemo(
		() => Math.floor(Math.random() * 90) + 10,
		[],
	);
	const randomUsage = useMemo(() => Math.floor(Math.random() * 200) + 10, []);
	const randomAttackBoost = useMemo(
		() => Math.floor(Math.random() * 50) + 5,
		[],
	);

	const selected = vulnerabilities.find((v) => v.id === selectedId);

	return (
		<div className="w-screen h-[calc(100svh-158px)] mt-20 bg-black text-white flex overflow-hidden">
			<div className="w-3/4 min-h-full overflow-y-auto px-6">
				<AnimatePresence mode="wait">
					<motion.div
						key={selectedId}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						transition={{ duration: 0.5 }}
						className="border-4 border-t-green-600 bg-zinc-900 p-4 rounded-lg min-h-full"
					>
						{selected?.description}
						<div className="flex flex-col gap-4 bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white rounded-2xl p-6 shadow-lg border border-gray-800">
							{/* 1️⃣ خرید ترفند */}
							<div className="flex justify-between items-center bg-black/40 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
								<div className="flex items-center gap-2">
									<Coins className="h-5 w-5 text-yellow-400" />
									<span className="font-medium">خرید ترفند</span>
								</div>
								<div className="flex items-center gap-3">
									<Badge
										variant="secondary"
										className="bg-yellow-400/20 text-yellow-300 flex items-center gap-1"
									>
										<Coins className="h-4 w-4" />
										{randomPrice}
									</Badge>
									<Button
										variant="default"
										className="bg-green-600 hover:bg-green-700 text-white"
										onClick={() => {
											playClickSound();
										}}
									>
										خرید
									</Button>
								</div>
							</div>

							{/* 2️⃣ آسیب پذیری */}
							<div className="flex justify-between items-center bg-black/40 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
								<div className="flex items-center gap-2">
									<Shield className="h-5 w-5 text-blue-400" />
									<span className="font-medium">آسیب‌پذیری</span>
								</div>
								<Badge
									variant="secondary"
									className="bg-blue-400/20 text-blue-300"
								>
									{randomVulnerability}%
								</Badge>
							</div>

							{/* 3️⃣ تعداد استفاده */}
							<div className="flex justify-between items-center bg-black/40 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
								<div className="flex items-center gap-2">
									<Target className="h-5 w-5 text-orange-400" />
									<span className="font-medium">تعداد استفاده</span>
								</div>
								<Badge
									variant="secondary"
									className="bg-orange-400/20 text-orange-300"
								>
									{randomUsage}
								</Badge>
							</div>

							{/* 4️⃣ افزایش تکرار در حمله */}
							<div className="flex justify-between items-center bg-black/40 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
								<div className="flex items-center gap-2">
									<Repeat className="h-5 w-5 text-green-400" />
									<span className="font-medium">افزایش تکرار در حمله</span>
								</div>
								<Badge
									variant="secondary"
									className="bg-green-400/20 text-green-300"
								>
									{randomAttackBoost}%
								</Badge>
							</div>
						</div>
					</motion.div>
				</AnimatePresence>
			</div>
			<div className="w-1/4 border-r border-gray-800 overflow-y-auto min-h-full pl-6">
				<div className="border-4 border-t-green-600 bg-zinc-900 p-4 rounded-lg">
					<p className="text-justify">
						حملات مبتنی بر وب، فعالیت‌های مخربی هستند که از طریق اینترنت انجام
						می‌شوند و آسیب‌پذیری‌های برنامه‌های وب، سرورها یا مرورگرهای کاربر را هدف
						قرار می‌دهند. هدف این حملات، نفوذ به سیستم‌ها، سرقت اطلاعات حساس یا
						اختلال در سرویس‌ها است.
					</p>
				</div>
				<div className="flex flex-col gap-4 mt-10">
					{vulnerabilities.map((v) => (
						<div key={v.id}>
							<Button
								variant="ghost"
								className={`w-full justify-between py-3 px-4 border-b border-blue-900 hover:bg-gray-800 ${
									selectedId === v.id ? "bg-green-500 text-black" : ""
								}`}
								onClick={() => {
									playClickSound();
									setSelectedId(v.id);
								}}
							>
								<span>{v.name}</span>
								{v.badge && <Badge variant="secondary">{v.badge}</Badge>}
							</Button>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
