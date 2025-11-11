"use client";

import { api } from "@/trpc/react";
import { useState } from "react";

export default function HomePage() {
    const { data: gameState, isLoading } = api.game.getGameState.useQuery(undefined, {
        // Poll every 2s if you want live-ish state
        refetchInterval: 2000,
    });

    const [playerCode, setPlayerCode] = useState("");
    const connect = api.game.connectClient.useMutation();
    const vote = api.game.voteAction.useMutation();
    const wait = api.game.waitForPhase.useMutation();

    return (
        <main className="p-6 space-y-4">
            <h1 className="text-2xl font-semibold">Game Client</h1>

            <section className="space-y-2">
                <div className="text-sm opacity-70">Game state</div>
                <pre className="p-3 bg-black/5 rounded">{isLoading ? "Loading..." : JSON.stringify(gameState, null, 2)}</pre>
            </section>

            <section className="space-y-2">
                <input
                    className="border p-2 rounded"
                    placeholder="Player code"
                    value={playerCode}
                    onChange={(e) => setPlayerCode(e.target.value)}
                />
                <button
                    className="px-3 py-2 rounded bg-green-600 text-white"
                    onClick={() => connect.mutate({ player_code: playerCode })}
                >
                    Connect
                </button>
            </section>

            <section className="space-y-2">
                <button
                    className="px-3 py-2 rounded bg-blue-600 text-white"
                    onClick={() => vote.mutate({ code: "attack", target: "enemy-1" })}
                >
                    Vote “attack”
                </button>

                <button
                    className="px-3 py-2 rounded bg-amber-600 text-white"
                    onClick={async () => {
                        const res = await wait.mutateAsync({ phase: "voting", timeout_sec: 15, poll_ms: 200, stop_on_finish: true });
                        alert(`finished=${res.finished} timeout=${res.timeout} phase=${res.phase}`);
                    }}
                >
                    Wait for phase
                </button>
            </section>
        </main>
    );
}
