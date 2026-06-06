"use client";

import { Card } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import { ShieldAlert } from "lucide-react";

export default function AttackDetailCard() {
    return (
        <Card
            className={cn(
                "bg-black/40 backdrop-blur-md border border-gray-700 text-gray-300",
                "p-6 rounded-xl shadow-xl relative"
            )}
        >
            {/* Top Green Border */}
            <div className="absolute top-0 left-0 w-full h-[4px] bg-green-500 rounded-t-xl" />

            {/* Title */}
            <h2 className="text-2xl font-bold mb-4 text-white">
                SQL INJECTION (SQLI)
            </h2>

            <Separator className="mb-4 bg-gray-600" />

            {/* English Description */}
            <p className="text-gray-300 leading-relaxed mb-3">
                SQL injection (SQLi) is a web security vulnerability that allows an
                attacker to interfere with the queries that an application makes to its
                database.
            </p>

            {/* Persian Description */}
            <p className="text-gray-300 leading-relaxed text-right mb-6">
                تزریق SQL (SQLi) یک آسیب‌پذیری امنیتی وب است که به مهاجم اجازه می‌دهد در
                پرس‌وجوهایی که یک برنامه در پایگاه داده خود انجام می‌دهد، دخالت کند.
            </p>

            {/* آسیب‌پذیری */}
            <div className="flex items-center justify-end gap-2 mb-4">
                <span className="text-white text-xl font-bold">آسیب‌پذیری:</span>
                <ShieldAlert className="text-yellow-400" size={26} />
            </div>

            {/* Progress section */}
            <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
          <span className="text-white text-lg font-semibold">
            SQL INJECTION
          </span>

                    <span className="text-sm text-gray-300">احتمال موفقیت: ۵٪</span>
                </div>

                {/* Green progress bar */}
                <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div
                        className="h-2 bg-green-500"
                        style={{ width: "5%" }}
                    />
                </div>

                {/* Score row */}
                <div className="flex items-center gap-2 mt-3">
                    <span className="text-green-400 font-semibold">۵,۰۰۰ امتیاز</span>
                    <span className="text-gray-400">سکه</span>
                </div>
            </div>
        </Card>
    );
}
