import { redirect } from "next/navigation";

export default function AdminDocsRedirect() {
	const playerAppUrl =
		process.env.NEXT_PUBLIC_PLAYER_APP_URL ??
		(process.env.NODE_ENV === "development"
			? "http://localhost:7009"
			: "https://game.darkube.ir");
	redirect(`${playerAppUrl.replace(/\/$/, "")}/docs`);
}
