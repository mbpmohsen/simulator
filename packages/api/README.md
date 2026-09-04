# `@workspace/trpc`

Shared TypeScript layer between the two Next.js apps and the Python game server.

Despite the name — kept for import stability — this package contains **no tRPC**.
It is typed HTTP clients, the game-plan contract, validation, localization and
the equilibrium solver.

```ts
import { buildEquilibrium, getLocalized, canVoteStep } from "@workspace/trpc";
import type { ConfigureAllRequestV2, StepView } from "@workspace/trpc";
```

---

## What is in here

| Module | Owns |
| --- | --- |
| `game-client/` | `GameClientApi` — the player, government and AI endpoints |
| `game-server/` | `GameServerApi` — admin and configuration endpoints, plus `types.ts`, the contract every plan is written against |
| `game-plan/equilibrium.ts` | Mixed-strategy Nash equilibrium solver |
| `game-plan/validation.ts` | `validateDefaultGamePlanClientSide`, `normalizeDefaultGamePlan` |
| `game-plan/runtime.ts` | Phase gates — `canSelectScenario`, `canVoteStep` |
| `game-plan/localization.ts` | `getLocalized` and the Persian label tables |
| `game-plan/communication.ts` | Message and audience types for the chat subsystem |
| `game-plan/government-catalog.ts` | Reshapes the loosely-typed government catalogue |
| `game-plan/graph.ts` | Builds the plan graph the admin visualises |
| `game-plan/api-error.ts` | `parseRuntimeApiError` — one of the most-used helpers in both apps |

Types are re-exported from `index.ts`, so import from the package root rather
than reaching into a subpath.

---

## The equilibrium solver

`buildEquilibrium(plan)` builds a zero-sum payoff matrix from a published plan
and solves it by linear programming (simplex with Bland's rule). It is a **pure
function of the plan** and never calls the server, so an unpublished draft can be
solved in the admin panel before anyone plays it.

```ts
const eq = buildEquilibrium(plan);
eq.value            // attacker's net advantage per turn; negative favours defence
eq.attacks          // [{ move, weight, dominated }]
eq.defenses
eq.warnings         // DOMINATED_MOVE, ATTACK_HAS_NO_COUNTER, …

buildEquilibriumWithout(plan, "ATK_BLACKOUT_SERVICE")  // "what if this were banned"
solveZeroSumGame(matrix)                                // domain-agnostic
```

It reads **only** `teams`, `actions` and `action_counters`. In-game modifiers,
black-market purchases and active effects are not modelled; government action
bans are, through `excludedActionCodes`.

Payoff formulas and worked numbers: `docs/equilibrium-formulas.html`.

---

## The game-plan contract

`game-server/types.ts` defines `ConfigureAllRequestV2` — ten required collections
and five optional ones, forming the tree
`Goal → Subject → SubSubject → Scenario → ScenarioStep → Action`.

Field-by-field reference, including what validation does and does not check:
`docs/game-plan-model.md`.

---

## Localization

Every human-readable field has an optional `_fa` companion. `getLocalized(value,
faValue)` **prefers the Persian**, falls back to the base value, then to `"—"`.

`localization.ts` also holds the Persian label tables for roles, phases,
execution modes, step statuses and government order types.

---

## API conventions

- REST responses use an envelope with `success`, `data`, `timestamp` and an
  optional `error`. The client unwraps `data`.
- Player identity is `userId`. There is no separate public `playerId`.
- `GET /client/game_state` is the bootstrap call and the only place a player can
  read the full action catalogue with costs and probabilities.
- Response types are **asserted**, not validated at runtime. Optional fields may
  genuinely be absent — see `docs/gameplay-api.md` §8.

Endpoint reference: `docs/gameplay-api.md` for v2 gameplay,
`docs/backend-integration.md` for auth, SSE and the state machine.

---

## Tests

```bash
pnpm --filter @workspace/trpc test
```

Nine suites under `game-client/`, `game-plan/` and `game-server/`, covering the
router, the equilibrium solver, plan validation, the government catalogue, the
communication server contract and the AI assistant UI helpers.
