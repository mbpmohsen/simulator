// Interfaces based on OpenAPI schemas

interface BlackMarketItemConfig {
    name: string;
    item_type: string;
    effect_type: string;
    target_action: string;
    target_action_type: string;
    value: number;
    duration: number;
    cost: number;
}

interface ConfigureAllRequest {
    side_names: string[];
    team_names: string[];
    num_turns: number;
    teams_and_players: { [key: string]: PlayerConfig[] };
    side_assignments: { [key: string]: string };
    point_threshold: number;
    actions: { [key: string]: { [key: string]: { [key: string]: number | string } } };
    team_growth_factors: { [key: string]: { [key: string]: { [key: string]: number } } };
    team_tech_factors?: { [key: string]: { [key: string]: { [key: string]: number } } } | null;
    side_credits: { [key: string]: number };
    black_market_items: BlackMarketItemConfig[];
    player_codes?: { [key: string]: { [key: string]: string }[] } | null;
    max_players?: number | null;
}

interface ConfigureEventsRequest {
    events: GameEventConfig[];
}

interface DetailResponse {
    detail: string;
}

interface GameEventConfig {
    name: string;
    effect_type: string;
    target_action: string;
    target_action_type: string;
    value: number;
    start_turn: number;
    duration: number;
    modifier_type?: string;
    affected_sides?: string[] | null;
    limit_type?: string | null;
    limit_value?: number | null;
}

interface HTTPValidationError {
    detail?: ValidationError[];
}

interface PlayerConfig {
    name: string;
    is_leader?: boolean;
    vote_weight?: number;
}

interface ProxyClientActionRequest {
    code: string;
    target?: string | null;
    black_market_item_code?: string | null;
}

interface ValidationError {
    loc: (string | number)[];
    msg: string;
    type: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_CLIENT_URL;

// API Functions

async function healthCheck(): Promise<any> {
    const response = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

async function startGame(): Promise<DetailResponse> {
    const response = await fetch(`${BASE_URL}/admin/start_game`, {
        method: 'GET',
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

async function configureEvents(body: ConfigureEventsRequest): Promise<any> {
    const response = await fetch(`${BASE_URL}/admin/configure_events`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

async function addEvents(body: ConfigureEventsRequest): Promise<any> {
    const response = await fetch(`${BASE_URL}/admin/add_events`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

async function deleteEvent(event_name: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/admin/delete_event/${event_name}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

async function clearEvents(): Promise<any> {
    const response = await fetch(`${BASE_URL}/admin/clear_events`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

async function getCurrentEvents(): Promise<any> {
    const response = await fetch(`${BASE_URL}/admin/get_current_events`, {
        method: 'GET',
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

async function configureAll(body: ConfigureAllRequest): Promise<any> {
    const response = await fetch(`${BASE_URL}/admin/configure_all`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

async function teardownClients(dry_run: boolean = false): Promise<any> {
    const response = await fetch(`${BASE_URL}/admin/teardown_clients?dry_run=${dry_run}`, {
        method: 'POST',
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

async function proxyClientConnect(player_code: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/proxy/client/${player_code}/connect`, {
        method: 'POST',
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

async function proxyClientGameState(player_code: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/proxy/client/${player_code}/game_state`, {
        method: 'GET',
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

async function proxyClientActions(player_code: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/proxy/client/${player_code}/actions`, {
        method: 'GET',
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

async function proxyClientTargets(player_code: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/proxy/client/${player_code}/targets`, {
        method: 'GET',
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

async function proxyClientVoteAction(player_code: string, body: ProxyClientActionRequest): Promise<any> {
    const response = await fetch(`${BASE_URL}/proxy/client/${player_code}/vote_action`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

export {
    healthCheck,
    startGame,
    configureEvents,
    addEvents,
    deleteEvent,
    clearEvents,
    getCurrentEvents,
    configureAll,
    teardownClients,
    proxyClientConnect,
    proxyClientGameState,
    proxyClientActions,
    proxyClientTargets,
    proxyClientVoteAction,
};