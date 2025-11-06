export enum DialogType {
    SECURITY_ATTACK = 'SECURITY_ATTACK',
    GAME_SETUP = 'GAME_SETUP',
    TEAM_MEMBERS = 'TEAM_MEMBERS',
    ATTACK_ACTION_CONFIG = 'ATTACK_ACTION_CONFIG',
    BLACK_MARKET = 'BLACK_MARKET',
    ADMIN_SUMMARY = 'ADMIN_SUMMARY',
}

export interface TeamMembersDialogData {
    teams: string[];
    onSubmit: (teamsAndPlayers: Record<string, any>) => void;
}

export interface BlackMarketDialogData {
    attackActions: Record<string, any>;
    defenseActions: Record<string, any>;
    onSubmit: (items: any[]) => void;
}

export interface DialogDataMap {
    [DialogType.SECURITY_ATTACK]: undefined;
    [DialogType.GAME_SETUP]: undefined;
    [DialogType.TEAM_MEMBERS]: TeamMembersDialogData;
    [DialogType.ATTACK_ACTION_CONFIG]: undefined;
    [DialogType.BLACK_MARKET]: BlackMarketDialogData;
    [DialogType.ADMIN_SUMMARY]: undefined;
}
