"use client";

import {Button} from "@workspace/ui/components/button.tsx";

interface StartGameResponse {
    detail: string;
}

interface WaitForPhaseRequest {
    phase: string;
    timeout_sec: number;
    poll_ms?: number;
    stop_on_finish?: boolean;
}

interface WaitForPhaseResponse {
    finished: boolean;
    timeout: boolean;
    phase: string;
    player_code?: string;
}

export default function Page() {

    async function startGame(): Promise<StartGameResponse> {
        try {
            const response = await fetch('http://185.252.86.33:8000/admin/start_game', {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: StartGameResponse = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to start game:', error);
            throw error;
        }
    }

    /**
     * Wait for the game to reach a specific phase
     * @param request WaitForPhaseRequest parameters
     * @returns Promise with the wait status
     */
    async function waitForPhase(request: WaitForPhaseRequest): Promise<WaitForPhaseResponse> {
        try {
            const response = await fetch('http://45.149.79.101:8001/client/wait_for_phase', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    phase: request.phase,
                    timeout_sec: request.timeout_sec,
                    poll_ms: request.poll_ms || 200,
                    stop_on_finish: request.stop_on_finish !== false, // default to true
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: WaitForPhaseResponse = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to wait for phase:', error);
            throw error;
        }
    }

    const handleClientTest = () => {
        waitForPhase({
            phase: 'voting',
            timeout_sec: 30,
            poll_ms: 200,
            stop_on_finish: true
        }).then(console.log);
    }

    const handleServerTest = () => {
        startGame().then(console.log)
    }

    return (
        <div className="w-screen h-screen bg-black text-white relative overflow-hidden flex gap-4 justify-center items-center">
           <Button variant="secondary" onClick={handleClientTest}>
               Client Test
           </Button>

            <Button variant="default" onClick={handleServerTest}>
                Server Test
            </Button>
        </div>
    );
}
