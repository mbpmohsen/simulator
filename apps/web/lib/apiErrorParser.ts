import { type ParsedApiError, parseApiError } from "@workspace/trpc";

export type RuntimeApiError = ParsedApiError;

export const parseRuntimeApiError = (
	error: unknown,
	fallback = "خطایی در ارتباط با سرور رخ داد.",
): RuntimeApiError => parseApiError(error, fallback);

export const createRuntimeHttpError = async (
	response: Response,
	fallback: string,
): Promise<Error & { response: { status: number; data: unknown } }> => {
	let data: unknown = null;
	try {
		data = await response.json();
	} catch {
		data = { detail: fallback };
	}
	const error = new Error(fallback) as Error & {
		response: { status: number; data: unknown };
	};
	error.response = { status: response.status, data };
	return error;
};
