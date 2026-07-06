import type {
	CommunicationAudience,
	CommunicationMessageType,
} from "@workspace/trpc";

export const COMMUNICATION_MESSAGE_LABELS: Record<
	CommunicationMessageType,
	string
> = {
	TEAM_CHAT: "گفت‌وگوی تیمی",
	GOVERNMENT_TO_OWN_TEAM: "پیام دولت به تیم خودی",
	GOVERNMENT_TO_ALLIED_SIDE: "پیام دولت به سمت خودی",
	GOVERNMENT_TO_ENEMY_GOVERNMENT: "پیام دولت به دولت حریف",
	GOVERNMENT_TO_ENEMY_TEAM: "پیام دولت به تیم حریف",
	PUBLIC_ANNOUNCEMENT: "اطلاعیه عمومی",
	FAKE_NEWS_SIMULATION: "شایعه / خبر جعلی درون‌بازی",
	THREAT_SIMULATION: "تهدید درون‌بازی",
	COACH_ADVICE: "توصیه مربی",
	SYSTEM_EVENT_REFERENCE: "ارجاع به رویداد سیستم",
};

export const SAFE_SIMULATION_TEMPLATES: Record<
	"FAKE_NEWS_SIMULATION" | "THREAT_SIMULATION",
	string[]
> = {
	FAKE_NEWS_SIMULATION: [
		"گزارش تأییدنشده درون‌بازی: تیم حریف بخشی از منابع عملیاتی خود را جابه‌جا کرده است.",
		"شایعه سناریویی: مسیر فعلی حریف ممکن است در نوبت بعدی با محدودیت منابع روبه‌رو شود.",
		"خبر ساختگی سناریو: هماهنگی عملیاتی حریف در این نوبت کاهش یافته است.",
	],
	THREAT_SIMULATION: [
		"اگر این مسیر بازی ادامه یابد، در نوبت بعدی فشار بیشتری بر منابع سناریویی شما وارد می‌شود.",
		"دولت ما این اقدام درون‌بازی را بدون پاسخ راهبردی نخواهد گذاشت.",
		"هشدار سناریویی: ادامه این تصمیم می‌تواند هزینه نوبت بعدی تیم شما را افزایش دهد.",
	],
};

export const formatCommunicationTypeFa = (
	type: CommunicationMessageType,
): string => COMMUNICATION_MESSAGE_LABELS[type];

export const formatCommunicationAudienceFa = (
	audience: CommunicationAudience,
): string => {
	switch (audience.type) {
		case "team":
			return audience.id ? `تیم ${audience.id}` : "تیم";
		case "side":
			return audience.id ? `سمت ${audience.id}` : "سمت";
		case "government":
			return audience.id ? `دولت ${audience.id}` : "دولت‌ها";
		case "all":
			return "همه بازی";
		case "admin":
			return "مدیریت";
	}
};
