# Architecture

How a click in the player interface becomes a resolved step, and which machine
does what.

Traced against the code on 2026-09-04, with the knowledge graph rebuilt the same
day (2375 nodes, 4714 edges, 185 communities).

---

## 1. Three processes, one authority

```
                    ┌─────────────────────────────┐
                    │   Python game server        │
                    │   game.darkube.ir           │
                    │                             │
                    │   dice · scoring · phases   │
                    │   ALL authoritative state   │
                    └──────────┬──────────────────┘
            browser-side       │       browser-side
        ┌───────────────────── ┴ ─────────────────────┐
        │                                             │
┌───────▼─────────────┐                   ┌───────────▼─────────┐
│  apps/web  :7009    │                   │  apps/admin  :7008  │
│  player · government│                   │  facilitator        │
│                     │                   │                     │
│  ┌───────────────┐  │  server-side      │  2 routes, but they │
│  │ /api/         │──┼───────────────────┤  only read local    │
│  │ communication │  │  (auth callback)  │  MITRE catalogue    │
│  └───────┬───────┘  │                   │  files from disk    │
│                     │                   └─────────────────────┘
└──────────┼──────────┘
           │
    ┌──────▼──────┐
    │   Turso     │  chat messages — the only data this repo owns
    └─────────────┘
```

**Nothing in this repository decides the outcome of a move.** No dice are rolled
here, no points awarded, no phase advanced. Both apps read state, render it, and
post intent.

The single exception is `/api/communication/messages` in `apps/web` — the only
server-side code in the repository. It stores chat messages and owns the only
database.

### The distinction that matters

Almost every arrow above is **browser-side**: the user's browser talks to the
game server directly. Only one is **server-side**: the messaging route, running
in a serverless function, calling the game server to authenticate.

This is not a detail. It is why chat can be completely broken while the rest of
the application works perfectly — the browser and the serverless function are in
different places on the network, and only one of them may be able to reach the
game server. See `docs/deployment.md` §7.

---

## 2. Boot

`apps/web/app/page.tsx` creates a client and loads context:

```
createGameClientApi({ baseURL: NEXT_PUBLIC_CLIENT_URL, headers: { Authorization } })
  → loadRuntimeApiContext(api)            apps/web/lib/runtimeApiContext.ts
      → GET /client/game_state
      → RuntimeApiContext
```

`RuntimeApiContext` is the spine of both player screens:

| Field | From |
| --- | --- |
| `gameId`, `currentTurn`, `currentPhase` | `data.game` |
| `teamId`, `sideId` | `data.clientContext` |
| `role` | matched from `data.teams` |
| `teams`, `actions` | `data` |
| `gameState` | the whole payload, kept for later |

> `actions` is the **full action catalogue** — code, display name, cost,
> probability. It is the only place a player can read those numbers, which is why
> the voting arena joins against it when a step omits them.

`apps/web/lib/playerRuntimeApi.ts` wraps this into `createPlayerRuntimeApi(token)`
so `player/page.tsx` gets one object with the API and the loaded context.

---

## 3. A turn

Four phases, from `game.currentPhase`. The gates are two one-line functions in
`packages/api/game-plan/runtime.ts`:

```ts
canSelectScenario = phase === "SELECTION"
canVoteStep       = phase === "VOTING"
```

Both apps call these before enabling a control, so the user never sees a
server-side rejection for something the UI could have known.

| Phase | Who acts | Endpoint |
| --- | --- | --- |
| `GOVERNMENT_SELECTION` | government | `POST /government/goal`, `POST /government/orders` |
| `SELECTION` | player | `POST /client/player/scenarios/{id}/select` |
| `VOTING` | player | `POST /client/player/steps/{id}/vote` |
| `CALCULATION` | nobody | results arrive as events |

The server owns the clock. `game_config` sets 110 seconds per turn with
40-second selection and voting phases — which is why the monitoring console's
pause and resume exist, and why a solo recording is impossible without them.

---

## 4. A vote, end to end

```
ScenarioVotingArena  (apps/web/components/v2/player/ScenarioVotingArena.tsx)
   user picks a move card
      ↓  onVote(stepId)
player/page.tsx  voteStep()
      ↓  guard: canVoteStep(phase)
GameClientApi.votePlayerStep(stepId)      packages/api/game-client/router.ts
      ↓  POST /client/player/steps/{stepId}/vote
────────────────────────────────────────────  Python engine
      votes tallied · majority reached · dice rolled · effects applied
────────────────────────────────────────────
      ↓  SCENARIO_STEP_RESOLVED
useGameEvents  →  PlayerMoveInsight, the arena's result block, the event feed
```

The frontend never learns the outcome from the vote response. That returns only
`{ ok, scenario_id, step_id, action_code, category }` — an acknowledgement, not a
result. **The result arrives asynchronously as an event.**

### Cards are grouped, steps are not

A step is consumed when it resolves, so a plan that wants a move playable every
turn holds one step per turn for it — 18 per scenario in the demo. The arena
groups by `action_code` and renders **one card per move** with a remaining count.

The UI deliberately does not mirror the plan one-to-one: the repetition is an
engine constraint, not information the player needs.

---

## 5. Live events — SSE, with a fallback

`apps/web/hooks/useGameEvents.ts` over `apps/web/lib/gameEventsApi.ts`:

| Endpoint | Use |
| --- | --- |
| `GET /api/games/{gameId}/events/stream` | SSE, the primary channel |
| `GET /api/games/{gameId}/events` | replay and catch-up |
| `GET /api/games/{gameId}/events/status` | stream health |

The hook carries a status of `sse` or `polling`. **When the stream fails it falls
back to polling every 6 seconds** (`POLL_MS = 6000`) and keeps trying to
reconnect. A game continues through a broken stream, more slowly.

Events are the only push channel in the system. Everything else is request and
response.

---

## 6. Configuration and publishing

`apps/admin` never reaches the game server from the server side — the browser
talks to it directly with an admin token.

It does have two API routes, `/api/attack-data` and `/api/prepared-catalog`, but
both only read MITRE ATT&CK catalogue files from local disk with `fs`. Neither
calls the game server, so neither is affected by the reachability problem in §8.

```
/admin/game-plan            draft lives in React state only
  → load from: default scenario | demo scenario | published plan | file
  → edit through CollectionEditor (raw JSON per record)
  → validateDefaultGamePlanClientSide(draft)     packages/api/game-plan/validation.ts
  → GameServerApi.configureAll(draft)
      POST /admin/configure_all
```

Nothing reaches the server until «اعتبارسنجی و انتشار». Editing the JSON on disk
changes nothing in a running game — the plan must be republished.

Contract reference: `docs/game-plan-model.md`.

---

## 7. The equilibrium solver

`packages/api/game-plan/equilibrium.ts` is a **pure function of the plan**. It
never calls the server, which is the whole point: a draft can be solved before it
is published.

```
plan  →  payoff matrix  →  simplex (Bland's rule)  →  mixed strategies + game value
```

It reads only `teams`, `actions` and `action_counters`. The subject tree,
`impact_rules`, `black_market`, `visibility_config` and government config are all
invisible to it. Government **action bans** are modelled, via
`buildEquilibriumWithout`.

It appears in three places:

- the «تعادل بازی» builder tab, with ban toggles
- every action card in the builder, as an equilibrium-weight chip and a dominated
  warning — **the only check that catches a plan which validates cleanly but is
  unplayable**
- `/analytics`, comparing what teams actually played against the optimum

Formulas: `docs/equilibrium-formulas.html`.

---

## 8. Messaging — the only server-side path

```
browser  →  POST /api/communication/messages          (Next.js route, serverless)
              ↓  resolveCommunicationActor(request)
              ↓  GET /client/game_state  ──────────►  Python game server
              ↓  policy: schema + permissions
              ↓  CommunicationRepository.create()  ─►  Turso
```

Authentication requires a **server-to-server call**. That dependency is the
subsystem's main fragility and the reason a working app can have broken chat.

Full detail: `docs/communication.md`.

---

## 9. Shared code

`@workspace/trpc` (`packages/api`) is where both apps meet. Despite the name it
contains no tRPC.

| Module | Both apps use it for |
| --- | --- |
| `game-client/router.ts` | `GameClientApi` — player, government, AI |
| `game-server/router.ts` | `GameServerApi` — admin and configuration |
| `game-server/types.ts` | the contract every plan is written against |
| `game-plan/equilibrium.ts` | the solver |
| `game-plan/validation.ts` | plan validation |
| `game-plan/runtime.ts` | phase gates |
| `game-plan/localization.ts` | `getLocalized` and the Persian tables |
| `game-plan/api-error.ts` | `parseRuntimeApiError` — 29 edges in the graph |

`packages/ui` holds the shared shadcn components. `cn()` is the most connected
node in the codebase at 103 edges, which is expected for a class-name helper.

---

## 10. What the graph says

From `graphify-out/GRAPH_REPORT.md`, rebuilt 2026-09-04:

The most connected non-UI nodes are `PlayerDashboardPage()` (37),
`GameServerApi` (37), `GovernmentDashboardPage()` (32), `parseRuntimeApiError()`
(29) and `GameClientApi` (29).

That the two dashboard page components sit near the top is the clearest
structural signal in the codebase: **`player/page.tsx` and `government/page.tsx`
are doing a great deal of work.** They hold routing, phase gating, API
orchestration, local state and layout in one file each. Neither is broken, but
they are where complexity concentrates and where a change is most likely to have
a surprising effect.

`parseRuntimeApiError()` being top-five says something healthier: error handling
is consistent across both apps rather than reinvented per screen.

---

## 11. Boundaries worth remembering

- **This repo owns no game state.** Turns, scores, dice and phases belong to the
  Python engine. The only data here is chat.
- **The admin app never calls the game server from the server side.** Browser to
  game server, directly. Its two API routes only read local catalogue files.
- **Only one route in the whole repository calls the game server from the server
  side** — the messaging route — and it cannot do anything without reaching it.
- **The equilibrium solver sees a slice of the plan**, not the whole thing. It
  cannot account for anything that happens during a game.
- **Response types are asserted, not validated.** Optional fields may genuinely
  be absent — `docs/gameplay-api.md` §8.
