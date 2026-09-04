# Gameplay API (v2)

> **What this is.** The REST contract the frontend actually runs on today: the
> subject / sub-subject / scenario / step model, the government order system,
> and the AI assistant.
>
> **Why it exists.** Neither `docs/backend-integration.md` nor
> `docs/backend-internals.md` mentions any of these endpoints — both describe
> the older `/client/vote_action` model, where a player picked an action and a
> target directly. That model is gone from the UI.
>
> **Source of truth.** This document was derived by reading
> `packages/api/game-client/router.ts` and `packages/api/game-server/types.ts`
> in this repository, not from a backend specification. Response shapes are the
> TypeScript types the frontend *asserts* onto the responses — they are what the
> client expects, which is not the same as a guarantee about what the server
> sends. See [Fields you cannot rely on](#fields-you-cannot-rely-on).
>
> Written 2026-09-04.

---

## 1. How v2 differs from v1

In v1 a turn was: read the available actions, read the available targets, post
one `vote_action` naming both.

In v2 the plan is a tree, and a turn walks down it:

```
Subject            the asset in play, assigned to your team
  Sub-subject      one target within it            ← you pick this
    Scenario       the set of moves for that target ← you activate this
      Step         one playable move                ← you vote on this
        Action     cost, success probability, points
```

A team has **one active scenario at a time**. Selecting a scenario is a
server-side commitment (`POST .../select`), separate from voting on a step
inside it. The two happen in different phases.

The v1 endpoints (`/client/actions`, `/client/targets`, `/client/vote_action`)
still exist on the server and are still wrapped by the client, but no v2 screen
calls them.

---

## 2. Authentication

Unchanged from v1 — see `docs/backend-integration.md` §4. Every call carries:

```
Authorization: Bearer <token>
```

`GET /client/game_state` doubles as the token check: it returns the caller's
identity in `data.clientContext`, and server-side code in this repo uses exactly
that to resolve who is calling (`apps/web/server/communication/auth.ts`).

---

## 3. Endpoint index

### Player

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/client/player/state` | `PlayerStateResponse` |
| GET | `/client/player/subjects` | `SubjectView[]` |
| GET | `/client/player/sub-subjects/{subSubjectId}/scenarios` | `ScenarioView[]` |
| GET | `/client/player/scenarios/{scenarioId}/steps` | `StepView[]` |
| POST | `/client/player/scenarios/{scenarioId}/select` | `SelectScenarioResponse` |
| POST | `/client/player/steps/{stepId}/vote` | `VoteStepResponse` |
| GET | `/client/player/nodes/{nodeId}/lock-reasons` | `LockReasonsResponse` |
| GET | `/client/player/orders?turn=` | `OrderView[]` |
| GET | `/client/player/ai/level` | `PlayerAiLevelResponse` |
| POST | `/client/player/ai/purchase` | `PlayerAiPurchaseResponse` |

### Government

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/government/overview` | `GovernmentOverviewResponse` |
| GET | `/government/catalog` | the published plan catalogue |
| POST | `/government/goal` | `GoalSelectResponse` |
| GET | `/government/teams/{teamId}/progress` | `GovernmentTeamProgress` |
| POST | `/government/orders` | `GovernmentOrderResultResponse` |
| GET | `/government/orders?turn=` | `OrderView[]` |
| GET | `/government/teams/{teamId}/nodes/{nodeId}/lock-reasons` | `LockReasonsResponse` |

### Carried over from v1

`GET /client/game_state`, `GET /client/actions`, `GET /client/targets`,
`POST /client/vote_action`, `GET /health`.

`/client/game_state` is still essential — it is the bootstrap call and the only
place the full action catalogue with costs and probabilities is available to a
player.

---

## 4. A turn, endpoint by endpoint

The four phases come from `game.currentPhase`. `packages/api/game-plan/runtime.ts`
holds the gates: `canSelectScenario` is `SELECTION` only, `canVoteStep` is
`VOTING` only.

| Phase | Government | Player |
| --- | --- | --- |
| `GOVERNMENT_SELECTION` | `POST /government/goal`, `POST /government/orders` | poll `/client/player/orders` to see incoming orders |
| `SELECTION` | — | `GET /subjects`, `GET .../scenarios`, then `POST .../select` |
| `VOTING` | — | `GET .../steps`, then `POST /steps/{id}/vote` |
| `CALCULATION` | — | wait; results arrive as `SCENARIO_STEP_RESOLVED` events |

Calling an endpoint outside its phase is rejected by the server. The frontend
gates the buttons first so the user does not see an error.

---

## 5. Player endpoints in detail

### `GET /client/player/state`

The player's own snapshot. Poll it after every phase change.

```ts
{
  team_id: number
  current_turn: number
  current_phase?: GamePhase
  credits: number
  active_subject_id: string | null
  active_sub_subject_id: string | null
  active_scenario_id: string | null
  assigned_subjects: SubjectView[]
  orders?: OrderView[]
}
```

The three `active_*` fields are the server's opinion of where the team is. Treat
them as authoritative and reconcile local UI state to them — the government can
move a team with `FORCE_SUBJECT` between turns.

### `GET /client/player/subjects`

```ts
SubjectView {
  id: string
  title: string
  title_fa?: string
  subject_type: SubjectType
  progress_percent: number
  status?: "active" | "stalled" | "completed"
  sub_subjects: Array<{
    id: string
    title: string
    title_fa?: string
    progress_share: number   // weight toward the subject total, NOT progress
    completed: boolean
    stalled?: boolean
  }>
}
```

`progress_share` is the most misread field here. It is how much this target
contributes to the parent subject's completion, not how far along it is.

### `GET /client/player/sub-subjects/{subSubjectId}/scenarios`

```ts
ScenarioView {
  id: string
  title: string
  title_fa?: string
  scenario_type: "attack_path" | "defense_path"
  execution_mode: "ordered" | "checklist" | "branching"
}
```

### `GET /client/player/scenarios/{scenarioId}/steps`

```ts
StepView {
  id: string
  action_code: string
  action_name?: string
  action_name_fa?: string
  order: number | null
  required: boolean
  status: "available" | "completed" | "failed" | "locked"
  available: boolean
  cost?: number
  probability?: number        // percent, 0-100
}
```

A step is **consumed** when it resolves — `status` becomes `completed` or
`failed` and it can never be voted on again. A plan that wants a move playable
every turn must contain one step per turn for it. This is why the demo plan has
18 steps per scenario (3 moves × 6 turns) rather than 3.

Note there is no `points` field. Point values live only in the action catalogue
from `/client/game_state`.

### `POST /client/player/scenarios/{scenarioId}/select`

`SELECTION` phase only. Commits the team to a scenario.

```ts
{ ok: true, active_subject_id, active_sub_subject_id, active_scenario_id,
  target_team_id: number | null }
```

Write all three ids back into local state from this response rather than
assuming the selection succeeded as requested.

### `POST /client/player/steps/{stepId}/vote`

`VOTING` phase only. One vote per player per turn. Approval rules come from
`game_config.voting_config` in the published plan — `required_approval`
(`"majority"`), `leader_veto_enabled`, `vote_time_limit_seconds`.

```ts
{ ok: true, scenario_id, step_id, action_code, category: "attack" | "defense" }
```

With a two-member team, "majority" means both must agree. Three members give a
genuine 2–1 majority.

### `GET /client/player/nodes/{nodeId}/lock-reasons`

Why a node is locked — call it when the user asks, not on every render.

```ts
{ node_id: string, locked: boolean,
  reasons: Array<{ code: string, message: string, source: string | null }> }
```

### `GET /client/player/orders?turn=`

Government orders aimed at this team. `OrderView`:

```ts
{ turn, government_team_id, target_team_id, order_type, payload, forced }
```

---

## 6. Government endpoints

`POST /government/orders` takes a discriminated union — the `payload` shape
depends on `order_type`:

| `order_type` | `payload` | Effect |
| --- | --- | --- |
| `ASSIGN_SUBJECT` | `{ subject_id }` | adds a subject to the team's usable list |
| `FORCE_SUBJECT` | `{ subject_id }` | switches the team's active subject, keeping prior progress |
| `ALLOCATE_CREDIT` | `{ amount }` | positive adds, negative subtracts; never goes below zero |
| `BAN_ACTION` | `{ action_code, duration? }` | blocks an action for N turns |
| `UNBAN_ACTION` | `{ action_code }` | lifts a ban |
| `DISABLE_TEAM` | `{ duration?, reason? }` | stops the team acting for N turns |
| `ENABLE_TEAM` | `{}` | ends a disable early |

All carry `target_team_id`. Quota and cooldown come from the plan's
`government.side_governments[].intervention_config`, not from the API.

Only `BAN_ACTION` and `UNBAN_ACTION` change the game-theoretic equilibrium, and
the admin panel models that with `buildEquilibriumWithout`. Credit changes and
team disables do not move the equilibrium weights.

`POST /government/goal` takes `{ goal_id }` and returns
`{ ok: true, side_id, goal_id }`.

---

## 7. AI assistant

A paid, per-team level ladder, independent of the game plan.

```ts
// GET /client/player/ai/level
{ team_id, current_level, next_level: number | null, next_cost: number | null,
  can_afford: boolean, already_purchased_this_turn: boolean, credits: number }

// POST /client/player/ai/purchase
{ ok, team_id, level, cost, credits_after, turn }
```

Levels are configured in the admin app at `/admin/ai`, or in the game-plan
builder's «دستیار هوشمند» tab. Levels start at 1 and each cost must be
non-negative.

---

## 8. Fields you cannot rely on

Everything marked optional above is optional **in the TypeScript type**, and the
frontend has been bitten by assuming otherwise. The client asserts these types
onto raw responses; nothing validates them at runtime.

The one that has actually caused a bug:

> `StepView.action_name`, `action_name_fa`, `cost` and `probability` are all
> optional. When the server omits them, a naive card falls back to rendering the
> raw `action_code` and silently drops the cost and probability chips.

`ScenarioVotingArena.tsx` now defends against this by joining `action_code`
against the action catalogue from `/client/game_state`, which always carries
`name`, `cost` and `probability`. **Any new screen that renders step data should
do the same join rather than trusting `StepView` alone.**

When adding a screen, assume any optional field may be absent and render
something meaningful without it.

---

## 9. What is still undocumented

- The exact server-side validation for each endpoint — the frontend gates on
  phase and affordability, but the authoritative rules live in the Python engine.
- Rejection codes for `POST .../vote`. `docs/backend-integration.md` §14 lists
  stable rejection codes for the **v1** `vote_action`; whether the same codes
  apply to step voting has not been verified.
- `GET /government/catalog` — the response is typed `unknown` in the client and
  reshaped by `packages/api/game-plan/government-catalog.ts`.
- The SSE stream is documented in `docs/backend-integration.md` §15 and is
  believed current, but the v2 event payloads (`SCENARIO_STEP_RESOLVED` and its
  siblings) are not covered there.
