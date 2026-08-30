import { NextResponse } from "next/server";
import {
	CommunicationHttpError,
	getCommunicationMessageService,
	resolveCommunicationActor,
} from "@/server/communication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

const errorResponse = (error: unknown): NextResponse => {
	if (error instanceof CommunicationHttpError) {
		return NextResponse.json(
			{ detail: { code: error.code, detail: error.message } },
			{ status: error.status, headers: noStoreHeaders },
		);
	}
	return NextResponse.json(
		{
			detail: {
				code: "COMMUNICATION_INTERNAL_ERROR",
				detail: "اتصال پیام‌رسانی برقرار نیست. دوباره تلاش کنید.",
			},
		},
		{ status: 500, headers: noStoreHeaders },
	);
};

export async function POST(request: Request): Promise<NextResponse> {
	try {
		const actor = await resolveCommunicationActor(request);
		let body: unknown;
		try {
			body = await request.json();
		} catch {
			throw new CommunicationHttpError(
				400,
				"INVALID_JSON",
				"بدنه درخواست پیام معتبر نیست.",
			);
		}
		const service = await getCommunicationMessageService();
		const message = await service.create(actor, body);
		return NextResponse.json(message, {
			status: 201,
			headers: noStoreHeaders,
		});
	} catch (error) {
		return errorResponse(error);
	}
}

export async function GET(request: Request): Promise<NextResponse> {
	try {
		const actor = await resolveCommunicationActor(request);
		const url = new URL(request.url);
		const gameId = url.searchParams.get("gameId")?.trim();
		if (!gameId) {
			throw new CommunicationHttpError(
				400,
				"GAME_ID_REQUIRED",
				"شناسه بازی برای دریافت پیام‌ها لازم است.",
			);
		}
		const requestedLimit = Number(url.searchParams.get("limit") ?? 100);
		const limit = Number.isFinite(requestedLimit)
			? Math.min(200, Math.max(1, Math.trunc(requestedLimit)))
			: 100;
		const service = await getCommunicationMessageService();
		const messages = await service.list(actor, {
			gameId,
			roomId: url.searchParams.get("roomId")?.trim() || undefined,
			since: url.searchParams.get("since")?.trim() || undefined,
			limit,
		});
		return NextResponse.json(messages, { headers: noStoreHeaders });
	} catch (error) {
		return errorResponse(error);
	}
}
