# Frontend Game Integration Guide

> **Provenance and scope — read this first.**
>
> This guide came from the backend team and describes the Python game server at
> `game.darkube.ir`, which is **not** in this repository. File date: 2026-07-06.
>
> **Still authoritative:** authentication (§4), the SSE event stream (§15), the
> game state machine (§11), the government system (§7), directives (§8), black
> market (§9), the readiness model (§10), the `configure_all` contract (§6), and
> the per-phase UI rules (§17).
>
> **Superseded:** the gameplay loop. Sections 5.2, 12 and 13 describe the older
> `/client/vote_action` model, where a player picks an action and a target
> directly. The frontend no longer works that way — it uses the v2 subject /
> sub-subject / scenario / step model. See `docs/gameplay-api.md`.
>
> Renamed from `apps/README (1).md` on 2026-09-04. Content unchanged.

---

This document describes the gameplay model, REST API, SSE event flow, game state machine, government system, and frontend integration rules for the game server in this repository.

The goal is that a frontend team can implement:

- admin setup screens
- player gameplay screens
- live game dashboards
- reconnect and recovery behavior
- government and black market UI

without needing undocumented backend knowledge.

## 1. What This Game Is

This is a turn-based cyber strategy game.

Each game is made of:

- `sides`: the top-level factions
- `teams`: units inside a side
- `players`: users assigned to teams
- `actions`: attack, defense, and government actions
- `black market items`: temporary modifiers that affect action probability or cost
- `directives`: optional pre-game admin rules that modify gameplay during specific turns
- `events`: runtime SSE events emitted as the game progresses

The game is designed around two kinds of state:

- full REST state for initial load and canonical entity lists
- live SSE events for progression, readiness, voting, and result updates

## 2. Core Concepts

### 2.1 IDs

All gameplay entities use 10-digit numeric IDs:

- user IDs
- team IDs
- side IDs
- action IDs
- black market item IDs
- directive/event IDs

Frontend code should always store and compare IDs as numbers where possible.

### 2.2 User vs Player

The public API consistently uses `userId`.

Internally the game may still use player objects, but in this build the effective gameplay identity is the assigned user. Frontend code should not assume there is a separate stable public `playerId` different from the user ID.

### 2.3 Side

A side is a faction competing for points.

A side contains:

- exactly one government team
- one or more non-government teams
- shared total credits view
- shared score outcome

### 2.4 Team

A team is the unit that actually votes and acts during the game.

Each team has:

- one `role`
- credits
- points
- active effects
- possibly a selected target for the current turn
- possibly a temporary disable flag from government intervention

### 2.5 Team Roles

Canonical team roles are:

- `GOVERNMENT`
- `ATTACKER`
- `DEFENCER`
- `BOTH`

Role behavior:

- `GOVERNMENT` can only act during `GOVERNMENT_SELECTION` and can only use government actions.
- `ATTACKER` can only use attack actions and participates in target selection.
- `DEFENCER` can only use defense actions and does not participate in target selection.
- `BOTH` can use attack and defense actions and does participate in target selection.

### 2.6 Actions

There are three action categories:

- `attack`
- `defense`
- `government`

Each action has:

- `id`
- `code` or `name`
- category
- cost
- success probability
- optional cooldown
- optional allowlist by team role or team ID

### 2.7 Black Market Items

Black market items are optional turn modifiers chosen alongside an action vote during the normal voting phase.

They create temporary factors such as:

- increasing action probability
- decreasing action cost
- multiplying an action modifier

### 2.8 Directives

Directives are admin-configured pre-game rules.

They are not runtime actions. They are configuration that becomes active on specific turns and can:

- change action probability
- change action cost
- change growth or tech factors
- impose limits such as attack or defense disablement

### 2.9 Runtime Events

Runtime events are emitted over SSE and persisted with a sequence number.

Examples:

- `GAME_STARTED`
- `TEAM_READY`
- `GOVERNMENT_INTERVENTION`
- `VOTE_CAST`
- `ATTACK_RESOLVED`
- `POINTS_UPDATED`
- `GAME_ENDED`

## 3. Source Of Truth For Frontend

The frontend should use the following model.

### 3.1 Initial screen load

Fetch:

- `GET /client/game_state`
- `GET /client/actions`
- `GET /client/targets` when the user is in an attack-capable team

Then open:

- `GET /api/games/{gameId}/events/stream`

### 3.2 During live play

Treat these as authoritative:

- `data.game.status`
- `data.game.currentPhase`
- `data.game.turnStatus`
- `data.game.phaseStatus`

Do not gate UI using only `data.game.phase`.

Reason:

- `phase` is only the coarse lifecycle: `waiting`, `ongoing`, `finished`
- `currentPhase` is the real turn phase used for gameplay gating

### 3.3 On reconnect

Use one of these strategies:

1. Preferred SSE resume:
   - reconnect to `/api/games/{gameId}/events/stream?since=<last_seq>`

2. Replay then stream:
   - call `/api/games/{gameId}/events/status`
   - call `/api/games/{gameId}/events`
   - apply replayed events in order
   - reopen the SSE stream

3. Hard resync:
   - refetch `/client/game_state`
   - reopen the SSE stream

### 3.4 Important schema distinction

`GET /client/game_state` and the `GAME_STATE_SNAPSHOT` SSE event are not the same schema.

Use:

- `/client/game_state` as the full normalized entity graph
- `GAME_STATE_SNAPSHOT` as a compact live sync payload optimized for resilience and quick UI updates

Do not deserialize them into one identical TypeScript type.

## 4. Authentication

### 4.1 Admin auth

Admin login:

- `POST /auth/admin/login`

Request:

```json
{
  "password": "admin-password"
}
```

Response data:

```json
{
  "token": "<admin-jwt>",
  "role": "admin"
}
```

### 4.2 User auth

User signup:

- `POST /auth/signup`

User login:

- `POST /auth/login`

Request:

```json
{
  "username": "player1",
  "password": "pass1234"
}
```

Response data:

```json
{
  "token": "<user-jwt>",
  "user": {
    "id": 9000000001,
    "username": "player1"
  }
}
```

### 4.3 Auth transport

For normal REST endpoints:

- `Authorization: Bearer <token>`

For SSE:

- `Authorization: Bearer <token>`
- or `?token=<jwt>` for `EventSource`

## 5. Main Endpoints

## 5.1 Admin and setup endpoints

- `POST /auth/admin/login`
- `GET /admin/users`
- `POST /admin/configure_all`
- `POST /admin/configure_directives`
- `POST /admin/add_directives`
- `DELETE /admin/delete_directive/{directive_name}`
- `DELETE /admin/clear_directives`
- `GET /admin/directives`
- `GET /admin/active_directives`
- `POST /api/games/{gameId}/start`
- `POST /api/games/{gameId}/reset`

## 5.2 Player endpoints

- `POST /auth/signup`
- `POST /auth/login`
- `GET /client/game_state`
- `GET /client/actions`
- `GET /client/targets`
- `POST /client/vote_action`

## 5.3 Live event endpoints

- `GET /api/games/{gameId}/events/stream`
- `GET /api/games/{gameId}/events`
- `GET /api/games/{gameId}/events/status`
- `GET /api/games/{gameId}/readiness`

## 6. Configure All Contract

`POST /admin/configure_all` creates the active game and assigns users to it.

High-level request shape:

```json
{
  "version": "1.0",
  "game_config": {},
  "teams": [],
  "actions": [],
  "government": {},
  "action_counters": [],
  "black_market": [],
  "max_players": 12
}
```

### 6.1 Non-negotiable rules

- `version` must be `"1.0"`.
- At least 2 sides are required.
- Every side must have exactly one `GOVERNMENT` team.
- Each team must have at least one player.
- `teams[].players[].userId` must already exist in the user database.
- `government.enabled` must be `true`.
- `government.side_governments` must contain exactly one entry per side.
- The `government.side_governments[].player.userId` must belong to that side's government team.

### 6.2 Team role object

Recommended shape:

```json
{
  "type": "ATTACKER",
  "allowed_action_types": ["attack"]
}
```

Accepted `type` values:

- `GOVERNMENT`
- `ATTACKER`
- `DEFENCER`
- `BOTH`

### 6.3 Action eligibility

Action restrictions can be configured by:

- team role via `requirements.allowed_team_roles`
- explicit team list via `requirements.allowed_team_ids`
- prerequisites and unlock rules

### 6.4 Action counters

Attack-to-defense counter relationships are defined separately:

```json
{
  "attack_code": "atk_spear_phish",
  "countered_by": [
    {
      "defense_code": "def_email_filtering"
    }
  ]
}
```

### 6.5 Black market config

Current runtime-safe interpretation is:

- `item_type` = what is affected, such as `probability` or `cost`
- `effect_type` = how it changes, such as `increase`, `decrease`, or `multiply`

Example:

```json
{
  "code": "bm_zero_day_kit",
  "name": "Zero-Day Exploit Kit",
  "item_type": "probability",
  "effect_type": "increase",
  "target": {
    "action_code": "atk_supply_chain",
    "action_type": "attack"
  },
  "effect": {
    "value": 15,
    "modifier_type": "increase"
  },
  "duration_turns": 1,
  "cost": 3,
  "availability": {
    "stock_limit": 2,
    "per_team_limit": 1,
    "available_from_turn": 1
  },
  "stackable": false
}
```

## 7. Government System

Government is a first-class gameplay feature, not an admin-only overlay.

Each side owns one government team. That team participates only during the government phase of each turn and can trigger side-level interventions.

### 7.1 What government does

Government actions can:

- add or remove credits from teams
- disable a team's ability to act temporarily
- re-enable a previously disabled team
- ban a specific action for the side
- remove an action ban

Supported intervention types:

- `CREDIT_DELTA`
- `TEAM_DISABLE`
- `TEAM_ENABLE`
- `ACTION_BAN`
- `ACTION_UNBAN`

### 7.2 Government permissions

Government actions are permission-gated.

If permissions are missing, the action can exist in config but fail at runtime.

Use the `permissions` object inside each `government.side_governments[]`.

Known permission flags:

- `can_modify_credits`
- `can_impose_penalties`
- `can_ban_actions`
- `can_unban_actions`

Recommended example:

```json
{
  "permissions": {
    "can_modify_credits": true,
    "can_impose_penalties": true,
    "can_ban_actions": true,
    "can_unban_actions": true
  }
}
```

### 7.3 Government cooldown and quota

Optional `intervention_config` can restrict use:

- `interventions_per_game`
- `intervention_cooldown_turns`

If those are exceeded, the intervention is rejected.

### 7.4 Government targeting model

Government action targets are configured up front inside the action definition.

Supported targeting fields:

- `apply_to_all_teams_on_side`
- `target_team_id`
- `target_team_ids`
- `banned_action_code`

The current runtime does not require the government user to submit a target separately during `vote_action`. In practice, the selected government action already encodes its target behavior.

### 7.5 Government alerts

Government can also emit alerts through configured `event_triggers`.

Known built-in trigger conditions:

- `same_attack_used_3_times`
- `credit_difference_greater_than_150`

When triggered, the server emits `GOVERNMENT_ALERT`.

### 7.6 Government UI rules

Frontend behavior for government teams:

- only show actionable controls during `currentPhase = GOVERNMENT_SELECTION`
- only allow actions from `/client/actions` where `category = government`
- hide attack and defense vote controls outside that phase
- surface intervention outcomes through `GOVERNMENT_INTERVENTION` and `ACTION_REJECTED`

## 8. Directives

Directives are optional game-wide or side-specific modifiers configured before the game starts.

They are stored with the game and activated during configured turns.

Possible directive effect domains:

- `probability`
- `cost`
- `growth`
- `tech`
- `limit`

Example use cases:

- make phishing stronger for 2 turns
- make one defense cheaper
- disable all attacks for a specific side

Directive endpoints are admin-facing:

- `POST /admin/configure_directives`
- `POST /admin/add_directives`
- `GET /admin/directives`
- `GET /admin/active_directives`
- `DELETE /admin/delete_directive/{directive_name}`
- `DELETE /admin/clear_directives`

Runtime event visibility:

- configuration emits `DIRECTIVE_SET` for admin streams
- game start emits `DIRECTIVES_APPLIED`
- activation emits `DIRECTIVE_STARTED`
- expiration emits `DIRECTIVE_ENDED`

## 9. Black Market And Factors

Black market purchases happen during normal voting, not during government selection.

The frontend submits black market use by attaching `black_market_item_id` to the same `POST /client/vote_action` request as the action vote.

Runtime behavior:

1. credits are deducted
2. a factor is created
3. factor events are emitted
4. the factor modifies future action probability or cost until it expires

Important event types:

- `BLACK_MARKET_ITEM_PURCHASED`
- `BLACK_MARKET_ITEM_ACTIVATED`
- `BLACK_MARKET_ITEM_EXPIRED`
- `FACTOR_CREATED`
- `FACTOR_APPLIED`
- `FACTOR_EXPIRED`

## 10. Readiness Model

The game cannot start until all assigned users have connected to SSE at least once.

Readiness is not the same as current online presence.

Definitions:

- `present`: user is currently connected to SSE
- `ready`: user has connected at least once
- `team ready`: all assigned users on a team are ready
- `all teams ready`: every team is ready and start is allowed

Relevant endpoints and events:

- `GET /api/games/{gameId}/readiness`
- `USER_STREAM_CONNECTED`
- `USER_STREAM_DISCONNECTED`
- `TEAM_READY`
- `ALL_TEAMS_READY`
- `TEAM_MEMBER_OFFLINE`

Frontend implication:

- a disconnected user does not make the team "not ready" again
- but they may still appear offline for live-play awareness

## 11. Game State Machine

The frontend should derive the player experience from:

- `status`
- `currentPhase`
- `turnStatus`
- `phaseStatus`

### 11.1 Coarse lifecycle field

`phase` values:

- `waiting`
- `ongoing`
- `finished`

### 11.2 Authoritative status field

`status` values:

- `NOT_STARTED`
- `RUNNING`
- `ENDED`
- `RESET`

### 11.3 Turn phase field

`currentPhase` values:

- `null`
- `GOVERNMENT_SELECTION`
- `SELECTION`
- `VOTING`
- `CALCULATION`

### 11.4 Turn and phase meta fields

`turnStatus` values:

- `STARTED`
- `ENDED`
- `null`

`phaseStatus` values:

- `STARTED`
- `ENDED`
- `null`

### 11.5 Actual sequence

The normal state progression is:

1. After `configure_all`, before `start`
   - `phase = waiting`
   - `status = RESET` or `NOT_STARTED`
   - `currentPhase = null`
   - `turnStatus = ENDED` or `null`
   - `phaseStatus = ENDED` or `null`

2. Ready but not started
   - same as above
   - `GET /api/games/{gameId}/readiness` returns `allTeamsReady = true`

3. Game started, turn opens
   - `phase = ongoing`
   - `status = RUNNING`
   - `currentPhase = GOVERNMENT_SELECTION`
   - `turnStatus = STARTED`
   - `phaseStatus = STARTED`

4. Government phase active
   - government teams can vote
   - non-government teams cannot vote yet

5. Selection phase active
   - `currentPhase = SELECTION`
   - attackers and `BOTH` teams choose target
   - defenders skip target selection
   - government teams do nothing here

6. Voting phase active
   - `currentPhase = VOTING`
   - non-government teams vote on attack or defense actions
   - optional black market purchase is submitted here

7. Calculation phase active
   - `currentPhase = CALCULATION`
   - no player input should be accepted
   - server resolves votes, counters, factors, points, credits, and effects

8. End of turn, before next turn starts
   - `status = RUNNING`
   - `currentPhase = null`
   - `turnStatus = ENDED`
   - `phaseStatus = ENDED`

9. Next turn begins
   - loop returns to `GOVERNMENT_SELECTION`

10. Game finished
   - `phase = finished`
   - `status = ENDED`
   - `currentPhase = null`

11. Game reset
   - `phase = waiting`
   - `status = RESET`
   - `currentPhase = null`

### 11.6 Frontend gating rule

Use this exact gating model:

- show government actions only when `status = RUNNING` and `currentPhase = GOVERNMENT_SELECTION`
- show target selection only when `status = RUNNING` and `currentPhase = SELECTION`
- show attack or defense voting only when `status = RUNNING` and `currentPhase = VOTING`
- show results and lock inputs when `currentPhase = CALCULATION`

## 12. Role-Specific Gameplay Flow

### 12.1 Government team

During `GOVERNMENT_SELECTION`:

- fetch or reuse `/client/actions`
- display government actions
- submit `POST /client/vote_action`

Request:

```json
{
  "action_id": 5000000001
}
```

During all other phases:

- no action vote should be enabled

### 12.2 Attacker team

During `SELECTION`:

1. call `GET /client/targets`
2. choose an enemy target
3. submit:

```json
{
  "target_team_id": 3000000002,
  "selection_only": true
}
```

During `VOTING`:

1. call `GET /client/actions`
2. choose an attack action
3. submit:

```json
{
  "action_id": 5000000002,
  "target_team_id": 3000000002
}
```

If a team already selected its target in the selection phase, the backend can reuse that stored target during `VOTING`. The safest frontend behavior is still to include `target_team_id` explicitly for attack submissions.

### 12.3 Defender team

During `SELECTION`:

- no target submission

During `VOTING`:

```json
{
  "action_id": 5000000003
}
```

### 12.4 Both-role team

During `SELECTION`:

- behaves like attacker

During `VOTING`:

- can vote on either an eligible attack or eligible defense action

## 13. Player Endpoints In Detail

### 13.1 `GET /client/game_state`

Purpose:

- full normalized state for the current user
- includes arrays and a `byId` lookup map

Key fields:

- `data.game.phase`
- `data.game.status`
- `data.game.currentTurn`
- `data.game.totalTurns`
- `data.game.pointThreshold`
- `data.game.currentPhase`
- `data.game.turnStatus`
- `data.game.phaseStatus`
- `data.game.winnerSideId`
- `data.game.serverTime`
- `data.clientContext.currentUserId`
- `data.clientContext.currentTeamId`
- `data.clientContext.currentSideId`
- `data.sides`
- `data.teams`
- `data.players`
- `data.actions`
- `data.blackMarketItems`
- `data.events`
- `data.byId`

Use this endpoint:

- on page load
- after hard reconnect
- after any UI state corruption

### 13.2 `GET /client/actions`

Purpose:

- returns the role-scoped action catalog for the current player

Important behavior:

- this endpoint is not phase-gated
- it returns eligible actions for the team even if the phase does not currently allow voting

Frontend implication:

- use `status` and `currentPhase` to enable or disable buttons
- do not assume the presence of an action in `/client/actions` means it is currently voteable

### 13.3 `GET /client/targets`

Purpose:

- returns valid targets

Behavior:

- for non-government teams, returns enemy teams
- for government teams, returns same-side non-government teams

Note:

- current government voting does not require a separate target submission because targeting is configured into the government action itself

### 13.4 `POST /client/vote_action`

Request fields:

- `action_id` optional number
- `target_team_id` optional number
- `black_market_item_id` optional number
- `selection_only` optional boolean

Selection example:

```json
{
  "target_team_id": 3000000002,
  "selection_only": true
}
```

Attack vote example:

```json
{
  "action_id": 5000000002,
  "target_team_id": 3000000002
}
```

Defense vote with black market example:

```json
{
  "action_id": 5000000003,
  "black_market_item_id": 6000000001
}
```

## 14. Stable Vote Rejection Codes

The backend returns structured vote errors as:

```json
{
  "detail": {
    "code": "TARGET_REQUIRED",
    "message": "Target team ID required for selection votes."
  }
}
```

Important codes the frontend should handle explicitly:

- `TARGET_REQUIRED`
- `TARGET_NOT_FOUND`
- `INVALID_TARGET`
- `INVALID_ACTION_ID`
- `INVALID_BLACK_MARKET_ITEM_ID`
- `PHASE_RESTRICTS_ACTION_CATEGORY`
- `PHASE_RESTRICTS_TEAM_ROLE`
- `TEAM_ROLE_FORBIDS_ACTION_CATEGORY`
- `TEAM_ROLE_NOT_ALLOWED_FOR_ACTION`
- `TEAM_NOT_ALLOWED_FOR_ACTION`
- `ACTION_LOCKED_PREREQUISITES`
- `ACTION_ON_COOLDOWN`
- `INSUFFICIENT_CREDITS`
- `TEAM_DISABLED_BY_GOVERNMENT`
- `ACTION_BANNED_BY_GOVERNMENT`

Frontend rule:

- always surface `detail.message`
- optionally branch on `detail.code` for targeted UI behavior

## 15. SSE Event Stream

### 15.1 Stream endpoint

`GET /api/games/{gameId}/events/stream`

Query params:

- `since=<seq>` optional resume cursor
- `types=A,B,C` optional event type filter
- `token=<jwt>` optional for EventSource clients

### 15.2 SSE format

Each message is standard SSE:

```text
id: 42
event: VOTE_CAST
data: {"seq":42,"gameId":"1780560199","type":"VOTE_CAST","visibility":{"scope":"TEAM","teamId":1100000102},"payload":{...},"createdAt":"2026-06-05T10:00:00Z","schemaVersion":1}
```

### 15.3 Stream startup behavior

On connection the stream may immediately send:

- `READY`
- `GAME_STATE_SNAPSHOT`

Then normal events continue.

### 15.4 Event envelope

Every gameplay event should be treated as:

```json
{
  "seq": 42,
  "gameId": "1780560199",
  "type": "VOTE_CAST",
  "visibility": {
    "scope": "TEAM",
    "teamId": 1100000102
  },
  "payload": {},
  "createdAt": "2026-06-05T10:00:00.000Z",
  "schemaVersion": 1
}
```

### 15.5 Event visibility

Visibility scopes:

- `PUBLIC`
- `TEAM`
- `SIDE`
- `PLAYER`
- `ADMIN`

Frontend rule:

- the server already visibility-filters what each client receives
- still respect the scope metadata if you build debug tools or multi-pane admin views

### 15.6 Most important event types for gameplay UI

Lifecycle:

- `GAME_CONFIGURED`
- `GAME_STARTED`
- `GAME_ENDED`
- `GAME_RESET`

Readiness and presence:

- `USER_STREAM_CONNECTED`
- `USER_STREAM_DISCONNECTED`
- `TEAM_READY`
- `ALL_TEAMS_READY`
- `TEAM_MEMBER_OFFLINE`

Turn and phase:

- `TURN_STARTED`
- `PHASE_STARTED`
- `PHASE_ENDED`
- `VOTING_STARTED`
- `VOTING_ENDED`
- `CALCULATION_STARTED`
- `CALCULATION_ENDED`
- `TURN_RESULTS`
- `TURN_ENDED`

Government:

- `GOVERNMENT_SELECTION_STARTED`
- `GOVERNMENT_SELECTION_ENDED`
- `GOVERNMENT_INTERVENTION`
- `GOVERNMENT_ALERT`

Voting and action selection:

- `VOTE_CAST`
- `VOTE_SUBMITTED`
- `TEAM_TARGET_SELECTED`
- `TEAM_ACTION_SELECTED`
- `TEAM_MAJORITY_DECIDED`
- `ACTION_REJECTED`

Combat and scoring:

- `ATTACK_DECLARED`
- `ATTACK_RESOLVED`
- `DEFENSE_RESOLVED`
- `POINTS_UPDATED`
- `CREDITS_UPDATED`

Black market and factors:

- `BLACK_MARKET_ITEM_PURCHASED`
- `BLACK_MARKET_ITEM_ACTIVATED`
- `BLACK_MARKET_ITEM_EXPIRED`
- `FACTOR_CREATED`
- `FACTOR_APPLIED`
- `FACTOR_EXPIRED`

### 15.7 Snapshot payload

`GAME_STATE_SNAPSHOT` is a compact per-user sync payload.

Top-level fields:

- `seq`
- `snapshotVersion`
- `game`
- `myTeam`
- `opponentTeam`
- `availableActions`
- `me`
- `recentEvents`

Important nested fields:

- `game.status`
- `game.currentTurn`
- `game.maxTurns`
- `game.turnPhase`
- `game.phaseTimeRemaining`
- `myTeam.role`
- `myTeam.credits`
- `myTeam.points`
- `myTeam.status`
- `myTeam.voting`
- `availableActions.attacks`
- `availableActions.defenses`
- `availableActions.government`
- `availableActions.blackMarket`

Frontend recommendation:

- use snapshot events to patch or replace local live widgets
- use `/client/game_state` for full page initialization and hard consistency recovery

## 16. Replay And Recovery Endpoints

### 16.1 `GET /api/games/{gameId}/events/status`

Use to discover:

- `currentSeq`
- `eventCount`
- `streamEndpoint`
- `replayEndpoint`

### 16.2 `GET /api/games/{gameId}/events`

Use to replay missed events.

Supported query params:

- `since_seq`
- `until_seq`
- `types`
- `limit`

Response:

- `data.events`
- `data.count`
- `data.currentSeq`
- `data.hasMore`

## 17. Frontend UI By Phase

### 17.1 Waiting

Show:

- game configured state
- roster
- readiness panel
- connected users
- start button for admin only when `allTeamsReady = true`

Hide:

- all action voting controls

### 17.2 Government selection

Show for government users:

- government action list
- current side context
- any configured intervention descriptions from your admin-side config store

Show for everyone else:

- passive phase banner

### 17.3 Selection

Show for attack-capable teams:

- target picker using `/client/targets`
- current selected target

Show for defenders:

- waiting state

### 17.4 Voting

Show for non-government teams:

- eligible actions from `/client/actions`
- optional black market choices
- cost and probability
- selected target
- vote submitted status

### 17.5 Calculation

Show:

- locked controls
- "resolving turn" messaging
- incoming events such as attacks, defenses, credit updates, and points

### 17.6 Finished

Show:

- winner or draw
- final points
- turn summary
- reset control for admin

## 18. Recommended Frontend State Structure

At minimum, keep:

- auth token
- current `gameId`
- current `userId`, `teamId`, `sideId`
- canonical entities from `/client/game_state`
- latest `status`, `currentPhase`, `turnStatus`, `phaseStatus`
- last processed `seq`
- readiness data
- per-team voting UI state
- last turn results
- active effects and directives

## 19. Suggested Implementation Order

1. Auth flow
2. Initial `/client/game_state` fetch
3. SSE connection and reconnect with `since`
4. Readiness screen
5. Phase-aware UI shell using `status` and `currentPhase`
6. `/client/actions` catalog integration
7. `/client/targets` selection flow
8. `/client/vote_action` submission flow
9. Government UI
10. Black market UI
11. Replay and recovery handling

## 20. Known Contract Nuances

These are important and intentional to document:

- `/client/actions` is role-scoped, not phase-scoped.
- `phase` is coarse lifecycle only; use `currentPhase` for gameplay.
- `GAME_STATE_SNAPSHOT` schema is not the same as `/client/game_state`.
- Only attack-capable teams participate in `SELECTION`.
- Government teams only participate in `GOVERNMENT_SELECTION`.
- Government action targeting is configured server-side, not submitted interactively by the player in normal flow.
- Government actions require matching `permissions`, otherwise they can be configured but rejected at runtime.
- Black market semantics are runtime-safe when `item_type` describes the affected domain and `effect_type` describes the modifier operation.

## 21. Minimal End-To-End Flow

Admin:

1. `POST /auth/admin/login`
2. `POST /admin/configure_all`
3. Optional: configure directives
4. Wait for all players to connect
5. `POST /api/games/{gameId}/start`

Player:

1. `POST /auth/signup` or `POST /auth/login`
2. `GET /client/game_state`
3. Open `GET /api/games/{gameId}/events/stream`
4. During `SELECTION`, if attack-capable, submit target
5. During `VOTING`, submit action vote
6. Observe results through SSE and updated game state

## 22. Final Rule For Frontend

If you only remember one thing, remember this:

- use REST to bootstrap
- use SSE to stay live
- use `status + currentPhase` to decide what the user is allowed to do
- use structured error codes to explain rejected actions

