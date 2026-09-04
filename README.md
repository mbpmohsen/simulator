# Cyber-Security Wargame Simulator

A turn-based wargame for training decision-making under uncertainty. Two teams — one applying pressure, one protecting — choose moves against a shared set of critical services, without seeing what the other side picked. The moves are deliberately tuned so that no single one is best on paper; the only thing that decides a turn is what the opponent chose. That makes it a **game** in the formal sense, and the project ships a mixed-strategy Nash equilibrium solver that computes the optimal play for any published scenario.

The whole interface is Persian and right-to-left.

> **Safety scope.** Everything in this repository is an abstract simulation. Actions are named things like "pressure on access" and "restore continuity" and carry only a cost, a success probability and a point value. There are no exploits, no payloads, and no operational capability of any kind.

---

## The three pieces

Only the first two live in this repository.

| Piece | What it is | Where it runs |
| --- | --- | --- |
| **`apps/web`** | Player and government interface — pick a target, pick a move, vote, see results, chat | `localhost:7009` |
| **`apps/admin`** | Facilitator console — build the scenario, publish it, monitor the live game, read analytics | `localhost:7008` |
| **Python game server** | The engine: rolls the dice, scores, advances phases, holds all authoritative state | `game.darkube.ir` — **a separate repository** |

Nothing in this repository decides the outcome of a move. The frontend reads state, renders it, and posts intent; the Python engine resolves everything.

The one exception is `/api/communication/messages` in `apps/web` — the only server-side code here. It stores chat messages and authenticates each request against the Python server.

---

## The domain model

A published scenario is a tree, and every screen in both apps is a view onto some level of it:

```
Goal  →  Subject  →  Sub-subject  →  Scenario  →  Step  →  Action  →  Effect
```

A **Goal** is what a side is trying to achieve. A **Subject** is the asset in play. **Sub-subjects** are the individual targets within it. A **Scenario** holds the **Steps** a team can take, each step pointing at an **Action** that carries the cost, success probability and points. **Action counters** connect an attack to the defence that reduces it.

`apps/admin/public/data/demo-game-plan.json` is a complete worked example.

---

## Quick start

Requires **Node 24+** and **pnpm 10.30**.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # then fill in the values
pnpm dev
```

That starts both apps: player at <http://localhost:7009>, admin at <http://localhost:7008>.

`apps/web/.env.example` documents every variable. The three you cannot skip:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CLIENT_URL` | Base URL of the Python game server |
| `GAME_API_URL` | Same server, read from server-side code |
| `COMMUNICATION_STORAGE` | `sqlite` locally; `turso` in production |

Local chat uses `node:sqlite` and needs no separate service. **Local SQLite cannot be used on a serverless host** — every invocation gets a fresh, ephemeral filesystem, so messages would silently vanish. Production uses Turso (hosted libSQL), which is the same SQL over HTTP.

---

## Workspaces

| Package | Owns |
| --- | --- |
| `apps/web` | Player and government UI, the docs page, the chat API route |
| `apps/admin` | Scenario builder (16 tabs), monitoring console, analytics, AI assistant config |
| `packages/api` | `@workspace/trpc` — typed clients for the game server, the game-plan contract, validation, localization, and the equilibrium solver |
| `packages/ui` | Shared shadcn/ui components |
| `packages/eslint-config`, `packages/typescript-config` | Shared tooling config |

Common commands, all from the root:

```bash
pnpm dev                  # both apps
pnpm build                # build everything
pnpm format-and-lint      # biome check .
pnpm format-and-lint:fix  # biome check . --write
```

Type-check a single app with `pnpm --filter web exec tsc --noEmit`.

---

## The equilibrium solver

`packages/api/game-plan/equilibrium.ts` builds a zero-sum payoff matrix from a game plan and solves it with linear programming (simplex, Bland's rule). It is a **pure function of the plan** — it never calls the server, so an unpublished draft can be solved in the admin panel before anyone plays it.

It reads only `teams`, `actions` and `action_counters`. It deliberately does **not** model in-game modifiers, black-market purchases or active effects; government action bans are modelled, via `buildEquilibriumWithout`.

Full derivation, payoff formulas and worked numbers: [`docs/equilibrium-formulas.html`](docs/equilibrium-formulas.html).

---

## Documentation

| Document | Covers |
| --- | --- |
| [`docs/architecture.md`](docs/architecture.md) | *(not yet written)* how a click becomes a resolved step |
| [`docs/gameplay-api.md`](docs/gameplay-api.md) | The v2 REST contract the frontend actually calls |
| [`docs/game-plan-model.md`](docs/game-plan-model.md) | Every field of the scenario contract, and what validation checks |
| [`docs/equilibrium-formulas.html`](docs/equilibrium-formulas.html) | Payoff matrix, LP formulation, every displayed number |
| [`docs/demo-scenario.md`](docs/demo-scenario.md) | Why the demo numbers are what they are — read before changing them |
| [`docs/deployment.md`](docs/deployment.md) | Environment variables, Turso, Vercel regions, troubleshooting |
| [`docs/communication.md`](docs/communication.md) | The messaging subsystem: backends, visibility, policy |
| [`docs/decisions.md`](docs/decisions.md) | Architectural decisions and what they cost |
| [`docs/backend-integration.md`](docs/backend-integration.md) | Backend guide: auth, SSE, state machine, government |
| [`docs/backend-internals.md`](docs/backend-internals.md) | Python server internals and `config.yml` |
| [`packages/api/README.md`](packages/api/README.md) | The shared API package |
| [`apps/admin/README.md`](apps/admin/README.md) | The facilitator console |
| In-app docs | `/docs` in the player app — 18 sections in Persian, for non-technical players |

`docs/salvage/` holds unwired code and captured responses kept for reference —
see its README.

Two backend documents describe the **older** `/client/vote_action` gameplay
model. Each carries a header saying which of its sections are still authoritative
and which are superseded; `docs/gameplay-api.md` is the current contract.
