import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {ActionConfig, Actions, BlackMarketItem, GameConfiguration, Player, TeamFactors} from "@/types/types";

interface GameConfigState {
    config: GameConfiguration;

    // Side Management
    setSideNames: (sides: string[]) => void;
    addSide: (name: string, color: string, credit: number) => void;
    removeSide: (name: string) => void;

    // Team Management
    setTeamNames: (teams: string[]) => void;
    addTeam: (name: string, side: string) => void;
    removeTeam: (name: string) => void;
    updateTeamSide: (teamName: string, newSide: string) => void;

    // Game Settings
    setNumTurns: (turns: number) => void;
    setPointThreshold: (threshold: number) => void;
    setSideAssignments: (assignments: Record<string, string>) => void;

    // Player Management
    addPlayer: (teamName: string, player: Player) => void;
    removePlayer: (teamName: string, playerName: string) => void;
    updatePlayer: (teamName: string, playerName: string, updates: Partial<Player>) => void;
    setTeamPlayers: (teamName: string, players: Player[]) => void;

    // Action Management
    setActions: (actions: Actions) => void;
    addAttackAction: (name: string, config: ActionConfig) => void;
    addDefenseAction: (name: string, config: ActionConfig) => void;
    removeAttackAction: (name: string) => void;
    removeDefenseAction: (name: string) => void;
    updateAttackAction: (name: string, config: Partial<ActionConfig>) => void;
    updateDefenseAction: (name: string, config: Partial<ActionConfig>) => void;

    // Team Factors Management
    setTeamGrowthFactors: (teamName: string, factors: TeamFactors) => void;
    setTeamTechFactors: (teamName: string, factors: TeamFactors) => void;
    updateTeamGrowthFactor: (teamName: string, actionType: 'attack' | 'defense', actionName: string, value: number) => void;
    updateTeamTechFactor: (teamName: string, actionType: 'attack' | 'defense', actionName: string, value: number) => void;

    // Credits Management
    setSideCredit: (sideName: string, amount: number) => void;
    updateSideCredit: (sideName: string, delta: number) => void;

    // Black Market Management
    addBlackMarketItem: (item: BlackMarketItem) => void;
    removeBlackMarketItem: (itemName: string) => void;
    updateBlackMarketItem: (itemName: string, updates: Partial<BlackMarketItem>) => void;
    setBlackMarketItems: (items: BlackMarketItem[]) => void;

    // Utility
    resetConfig: () => void;
    exportConfig: () => GameConfiguration;
    importConfig: (config: Partial<GameConfiguration>) => void;
    validateConfig: (step: number) => { isValid: boolean; errors: string[] };
}

const initialConfig: GameConfiguration = {
    side_names: [],
    team_names: [],
    num_turns: 10,
    teams_and_players: {},
    side_assignments: {},
    point_threshold: 7,
    actions: {
        attack: {},
        defense: {},
    },
    team_growth_factors: {},
    team_tech_factors: {},
    side_credits: {},
    black_market_items: [],
};

export const useGameConfigStore = create<GameConfigState>()(
    devtools(
        persist(
            immer((set, get) => ({
                config: initialConfig,

                // Side Management
                setSideNames: (sides) =>
                    set((state) => {
                        state.config.side_names = sides;
                    }),

                addSide: (name, color, credit) =>
                    set((state) => {
                        if (!state.config.side_names.includes(name)) {
                            state.config.side_names.push(name);
                            state.config.side_credits[name] = credit;
                        }
                    }),

                removeSide: (name) =>
                    set((state) => {
                        state.config.side_names = state.config.side_names.filter(s => s !== name);
                        delete state.config.side_credits[name];
                        // Remove team assignments to this side
                        Object.keys(state.config.side_assignments).forEach(team => {
                            if (state.config.side_assignments[team] === name) {
                                delete state.config.side_assignments[team];
                            }
                        });
                    }),

                // Team Management
                setTeamNames: (teams) =>
                    set((state) => {
                        state.config.team_names = teams;
                    }),

                addTeam: (name, side) =>
                    set((state) => {
                        if (!state.config.team_names.includes(name)) {
                            state.config.team_names.push(name);
                            state.config.side_assignments[name] = side;
                            state.config.teams_and_players[name] = [];
                            state.config.team_growth_factors[name] = { attack: {}, defense: {} };
                            state.config.team_tech_factors[name] = { attack: {}, defense: {} };
                        }
                    }),

                removeTeam: (name) =>
                    set((state) => {
                        state.config.team_names = state.config.team_names.filter(t => t !== name);
                        delete state.config.side_assignments[name];
                        delete state.config.teams_and_players[name];
                        delete state.config.team_growth_factors[name];
                        delete state.config.team_tech_factors[name];
                    }),

                updateTeamSide: (teamName, newSide) =>
                    set((state) => {
                        state.config.side_assignments[teamName] = newSide;
                    }),

                // Game Settings
                setNumTurns: (turns) =>
                    set((state) => {
                        state.config.num_turns = turns;
                    }),

                setPointThreshold: (threshold) =>
                    set((state) => {
                        state.config.point_threshold = threshold;
                    }),

                setSideAssignments: (assignments) =>
                    set((state) => {
                        state.config.side_assignments = assignments;
                    }),

                // Player Management
                addPlayer: (teamName, player) =>
                    set((state) => {
                        if (!state.config.teams_and_players[teamName]) {
                            state.config.teams_and_players[teamName] = [];
                        }
                        const exists = state.config.teams_and_players[teamName].some(
                            p => p.name === player.name
                        );
                        if (!exists) {
                            state.config.teams_and_players[teamName].push(player);
                        }
                    }),

                removePlayer: (teamName, playerName) =>
                    set((state) => {
                        if (state.config.teams_and_players[teamName]) {
                            state.config.teams_and_players[teamName] =
                                state.config.teams_and_players[teamName].filter(p => p.name !== playerName);
                        }
                    }),

                updatePlayer: (teamName, playerName, updates) =>
                    set((state) => {
                        if (state.config.teams_and_players[teamName]) {
                            const player = state.config.teams_and_players[teamName].find(
                                p => p.name === playerName
                            );
                            if (player) {
                                Object.assign(player, updates);
                            }
                        }
                    }),

                setTeamPlayers: (teamName, players) =>
                    set((state) => {
                        state.config.teams_and_players[teamName] = players;
                    }),

                // Action Management
                setActions: (actions) =>
                    set((state) => {
                        state.config.actions = actions;
                    }),

                addAttackAction: (name, config) =>
                    set((state) => {
                        state.config.actions.attack[name] = config;

                        // Initialize factors for all teams
                        state.config.team_names.forEach(team => {
                            if (!state.config.team_growth_factors[team]) {
                                state.config.team_growth_factors[team] = { attack: {}, defense: {} };
                            }
                            if (!state.config.team_tech_factors[team]) {
                                state.config.team_tech_factors[team] = { attack: {}, defense: {} };
                            }
                            state.config.team_growth_factors[team].attack[name] = 1.0;
                            state.config.team_tech_factors[team].attack[name] = 1.0;
                        });
                    }),

                addDefenseAction: (name, config) =>
                    set((state) => {
                        state.config.actions.defense[name] = config;

                        // Initialize factors for all teams
                        state.config.team_names.forEach(team => {
                            if (!state.config.team_growth_factors[team]) {
                                state.config.team_growth_factors[team] = { attack: {}, defense: {} };
                            }
                            if (!state.config.team_tech_factors[team]) {
                                state.config.team_tech_factors[team] = { attack: {}, defense: {} };
                            }
                            state.config.team_growth_factors[team].defense[name] = 1.0;
                            state.config.team_tech_factors[team].defense[name] = 1.0;
                        });
                    }),

                removeAttackAction: (name) =>
                    set((state) => {
                        delete state.config.actions.attack[name];

                        // Remove from team factors
                        state.config.team_names.forEach(team => {
                            delete state.config.team_growth_factors[team]?.attack[name];
                            delete state.config.team_tech_factors[team]?.attack[name];
                        });
                    }),

                removeDefenseAction: (name) =>
                    set((state) => {
                        delete state.config.actions.defense[name];

                        // Remove from team factors
                        state.config.team_names.forEach(team => {
                            delete state.config.team_growth_factors[team]?.defense[name];
                            delete state.config.team_tech_factors[team]?.defense[name];
                        });
                    }),

                updateAttackAction: (name, config) =>
                    set((state) => {
                        if (state.config.actions.attack[name]) {
                            Object.assign(state.config.actions.attack[name], config);
                        }
                    }),

                updateDefenseAction: (name, config) =>
                    set((state) => {
                        if (state.config.actions.defense[name]) {
                            Object.assign(state.config.actions.defense[name], config);
                        }
                    }),

                // Team Factors Management
                setTeamGrowthFactors: (teamName, factors) =>
                    set((state) => {
                        state.config.team_growth_factors[teamName] = factors;
                    }),

                setTeamTechFactors: (teamName, factors) =>
                    set((state) => {
                        state.config.team_tech_factors[teamName] = factors;
                    }),

                updateTeamGrowthFactor: (teamName, actionType, actionName, value) =>
                    set((state) => {
                        if (!state.config.team_growth_factors[teamName]) {
                            state.config.team_growth_factors[teamName] = { attack: {}, defense: {} };
                        }
                        state.config.team_growth_factors[teamName][actionType][actionName] = value;
                    }),

                updateTeamTechFactor: (teamName, actionType, actionName, value) =>
                    set((state) => {
                        if (!state.config.team_tech_factors[teamName]) {
                            state.config.team_tech_factors[teamName] = { attack: {}, defense: {} };
                        }
                        state.config.team_tech_factors[teamName][actionType][actionName] = value;
                    }),

                // Credits Management
                setSideCredit: (sideName, amount) =>
                    set((state) => {
                        state.config.side_credits[sideName] = amount;
                    }),

                updateSideCredit: (sideName, delta) =>
                    set((state) => {
                        if (!state.config.side_credits[sideName]) {
                            state.config.side_credits[sideName] = 0;
                        }
                        state.config.side_credits[sideName] += delta;
                    }),

                // Black Market Management
                addBlackMarketItem: (item) =>
                    set((state) => {
                        const exists = state.config.black_market_items.some(i => i.name === item.name);
                        if (!exists) {
                            state.config.black_market_items.push(item);
                        }
                    }),

                removeBlackMarketItem: (itemName) =>
                    set((state) => {
                        state.config.black_market_items = state.config.black_market_items.filter(
                            item => item.name !== itemName
                        );
                    }),

                updateBlackMarketItem: (itemName, updates) =>
                    set((state) => {
                        const item = state.config.black_market_items.find(i => i.name === itemName);
                        if (item) {
                            Object.assign(item, updates);
                        }
                    }),

                setBlackMarketItems: (items) =>
                    set((state) => {
                        state.config.black_market_items = items;
                    }),

                // Utility
                resetConfig: () =>
                    set((state) => {
                        state.config = initialConfig;
                    }),

                exportConfig: () => get().config,

                importConfig: (config) =>
                    set((state) => {
                        state.config = { ...state.config, ...config };
                    }),

                validateConfig: (step) => {
                    const config = get().config;
                    const errors: string[] = [];

                    switch (step) {
                        case 1:
                            // Validate sides
                            if (config.side_names.length === 0) {
                                errors.push('حداقل یک جانب باید وجود داشته باشد');
                            }

                            // Validate teams
                            if (config.team_names.length === 0) {
                                errors.push('حداقل یک تیم باید وجود داشته باشد');
                            }

                            // Validate turns and threshold
                            if (config.num_turns <= 0) {
                                errors.push('تعداد دورها باید بیشتر از صفر باشد');
                            }

                            if (config.point_threshold <= 0) {
                                errors.push('آستانه امتیاز باید بیشتر از صفر باشد');
                            }
                            break;
                            case 2:
                                config.team_names.forEach(team => {
                                    if (!config.side_assignments[team]) {
                                        errors.push(`تیم ${team} به جانبی اختصاص نیافته است`);
                                    } else if (!config.side_names.includes(config.side_assignments[team])) {
                                        errors.push(`تیم ${team} به جانب نامعتبر اختصاص یافته است`);
                                    }
                                });

                                // Validate players
                                config.team_names.forEach(team => {
                                    const players = config.teams_and_players[team] || [];
                                    if (players.length === 0) {
                                        errors.push(`تیم ${team} هیچ بازیکنی ندارد`);
                                    }
                                    const leaders = players.filter(p => p.is_leader);
                                    if (leaders.length === 0) {
                                        errors.push(`تیم ${team} رهبری ندارد`);
                                    }
                                });
                                break;
                        case 3:
                            if (Object.keys(config.actions.attack).length === 0 &&
                                Object.keys(config.actions.defense).length === 0) {
                                errors.push('حداقل یک اقدام حمله یا دفاع باید تعریف شود');
                            }
                            break;
                        default:
                    }


                    return {
                        isValid: errors.length === 0,
                        errors,
                    };
                },
            })),
            {
                name: 'game-config-storage',
            }
        )
    )
);

// Selectors for better performance
export const selectSides = (state: GameConfigState) => state.config.side_names;
export const selectTeams = (state: GameConfigState) => state.config.team_names;
export const selectActions = (state: GameConfigState) => state.config.actions;
export const selectBlackMarket = (state: GameConfigState) => state.config.black_market_items;
export const selectTeamPlayers = (teamName: string) => (state: GameConfigState) =>
    state.config.teams_and_players[teamName] || [];
export const selectSideCredits = (state: GameConfigState) => state.config.side_credits;