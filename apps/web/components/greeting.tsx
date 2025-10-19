"use client";

import { trpc } from "@workspace/trpc/client"; // Import from client

export function Greeting() {
	const { data, isLoading } = trpc.greeting.useQuery({ name: "tRPC" });

	if (isLoading) return <div>Loading...</div>;

	return (
		<div>
			<h1>{data?.message}</h1>
		</div>
	);
}
