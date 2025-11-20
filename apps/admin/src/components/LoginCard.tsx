"use client";

import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Lock, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginCard() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const router = useRouter();

	return (
		<div
			dir="rtl"
			className="min-h-screen flex items-center justify-center  relative overflow-hidden"
		>
			{/* background lines (simulate image) */}
			<div className="absolute inset-0 bg-[url('/bg-lines.svg')] bg-cover bg-center opacity-30" />

			<Card className="relative w-[400px] border border-cyan-700/40 bg-black/40 backdrop-blur-md text-right shadow-xl">
				<CardHeader className="text-center text-cyan-400 font-medium text-lg">
					ورود به پنل
				</CardHeader>

				<CardContent className="space-y-4">
					{/* Username */}
					<div className="space-y-1">
						<Label htmlFor="username" className="text-gray-300 text-sm">
							نام کاربری
						</Label>
						<div className="relative">
							<Input
								value={username}
								defaultValue="admin"
								onChange={(e) => setUsername(e.target.value)}
								className="pr-10 bg-black/60 border-cyan-700/40 text-gray-100 placeholder:text-gray-500 focus-visible:ring-cyan-500"
								placeholder="نام کاربری"
							/>
							<User className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
						</div>
					</div>

					{/* Password */}
					<div className="space-y-1">
						<Label htmlFor="password" className="text-gray-300 text-sm">
							رمز عبور
						</Label>
						<div className="relative">
							<Input
								type="password"
								defaultValue="admin"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="pr-10 bg-black/60 border-cyan-700/40 text-gray-100 placeholder:text-gray-500 focus-visible:ring-cyan-500"
								placeholder="رمز عبور"
							/>
							<Lock className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
						</div>
					</div>
				</CardContent>

				<CardFooter className="flex justify-between gap-2 pt-4">
					<Button
						variant="secondary"
						className="w-1/2 bg-gray-600 hover:bg-gray-500 text-black font-semibold flex items-center justify-center gap-2"
					>
						<span className="text-sm">بیخیال!</span>
						<div className="w-6 h-6 flex items-center justify-center rounded-full bg-black text-white text-xs font-bold">
							B
						</div>
					</Button>

					<Button
						onClick={() => router.push("/configuration")}
						className="w-1/2 bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-2"
					>
						<span className="text-sm">ورود</span>
						<div className="w-6 h-6 flex items-center justify-center rounded-full bg-black text-white text-xs font-bold">
							A
						</div>
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
