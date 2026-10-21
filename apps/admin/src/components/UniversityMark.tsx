"use client";

import Image from "next/image";

/**
 * The university's mark, shown on the screens a visitor actually lands on.
 *
 * Kept as one component so the wording and the sizing stay the same wherever
 * it appears — a crest that is slightly different on every screen reads as
 * carelessness, which is the opposite of what it is there to say.
 *
 * The asset is the circular crest with its white square removed, so it sits on
 * the dark navy background without a light box around it.
 */

export function UniversityMark({
	size = "md",
	withTitle = true,
	className = "",
}: {
	/** `sm` for a navigation bar, `md` beside a heading, `lg` for a landing screen. */
	size?: "sm" | "md" | "lg";
	withTitle?: boolean;
	className?: string;
}) {
	const px = size === "sm" ? 28 : size === "md" ? 48 : 96;
	// The small asset is enough below 64px; above it the 256px one is used so
	// the crest's thin lettering stays readable.
	const src = px <= 64 ? "/sndu-logo-small.png" : "/sndu-logo.png";

	return (
		<div className={`flex items-center gap-2.5 ${className}`}>
			<Image
				src={src}
				alt="نشان دانشگاه عالی دفاع ملی"
				width={px}
				height={px}
				priority={size === "lg"}
				className="shrink-0 select-none"
			/>
			{withTitle && (
				<div className="min-w-0 leading-tight">
					<div
						className={`font-black text-slate-200 ${
							size === "lg" ? "text-base" : "text-xs"
						}`}
					>
						دانشگاه عالی دفاع ملی
					</div>
					<div
						className={`text-slate-500 ${
							size === "lg" ? "text-xs" : "text-[10px]"
						}`}
					>
						ستاد کل نیروهای مسلح
					</div>
				</div>
			)}
		</div>
	);
}
