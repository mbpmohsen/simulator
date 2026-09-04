# Decision Log

Non-obvious architectural choices, newest first. Each entry records the decision,
why it was made, what else was considered, and what it costs.

Started 2026-09-04. Entries before that date were reconstructed from the code and
from the working history, so their dates are approximate.

---

## 2026-09-03 — Rich summary cards in the plan builder, JSON editor kept

**Decision.** Each collection in the game-plan builder shows a per-collection
summary card — cost, probability, points, equilibrium weight — in the list and
above the editor. The raw JSON `<Textarea>` stays exactly where it was.

**Context.** The list showed only a Persian title and a raw id, so configuring a
scenario meant reading JSON. The original request was to move the JSON to the
bottom as a "preview".

**Alternatives.** Replacing the JSON with form fields for the common properties
was considered and deferred: the `<Textarea>` is not a preview, it is the *only*
editor — `save()` does `JSON.parse(draft)` and there are no field-level inputs.
Demoting it would have removed the ability to edit anything.

**Consequence.** Cards are additive and cannot break editing. A registry keyed by
collection with a plain fallback means an uncovered collection still renders.
Form-field editing remains open as future work.

---

## 2026-09-03 — Balance warnings come from the solver, not from expected values

**Decision.** The admin card warns that a move is unplayable only when
`buildEquilibrium` reports it as `dominated`.

**Context.** The first version compared raw expected values across a side and
warned when they differed by more than 0.05. It fired on the defence side — where
all three moves are genuinely played at 25.8% / 32.4% / 41.8%. The warning was
false.

**Why the heuristic was wrong.** It ignored the counter structure. Two defence
moves can have different expected values and both still be worth playing, because
they counter different attacks. Expected value alone does not describe a move
whose job is partly to deny the opponent.

**Consequence.** The card also shows the real equilibrium weight, so the person
configuring sees the effect of a change immediately. `buildEquilibrium` throws on
a malformed draft, so the call is wrapped — without the guard, a mid-edit JSON
error would crash the whole tab.

---

## 2026-09-02 — Attacker points doubled to make the demo winnable

**Decision.** Attacker points went from 1 / 2 / 3 to 2 / 4 / 6.

**Context.** With the original numbers the attacker earned 0.72 points per turn
and the defender 0.80 — over six turns, 4.3 against 4.8, so neither reached the
5-point threshold and the game ended with no winner. Poor material for a demo.

**Alternatives.** Weakening the counters or the defence was tried and rejected:
it skewed the attacker's equilibrium mix toward one move (19 / 17 / 64), which
undermines the "mix your moves" lesson. Doubling the points preserved the equal
expected value across all three attacks.

**Consequence.** Game value moved from −0.082 to +0.637; the attacker is
structurally favoured and the equilibrium panel shows it. Still not a guaranteed
win — see `docs/demo-scenario.md` §3.

---

## 2026-09-01 — Turso for messaging storage in production

**Decision.** Production chat uses Turso (hosted libSQL). Local development keeps
`node:sqlite`.

**Context.** Local SQLite cannot work on a serverless host: every invocation gets
a fresh, ephemeral filesystem and concurrent requests do not share a file.
MongoDB Atlas was not reachable from the deployment environment.

**Alternatives.** Atlas M0 (free but unreachable); Upstash or Neon through the
Vercel marketplace (would need a new repository implementation); moving the API
next to the game server (correct, but a larger change).

**Consequence.** Turso is libSQL, so the schema and SQL are identical to the
local backend — only the transport differs. `@tursodatabase/serverless` is
`fetch`-only with no native dependencies. The two SQL backends now duplicate the
visibility clause, and a change to one **must** be mirrored in the other.

---

## 2026-09-01 — Function region is set project-wide, not per route

**Decision.** The Vercel function region is configured in project settings or
`vercel.json`, not with a Next.js route export.

**Context.** `export const preferredRegion = ["fra1"]` was added to the messaging
route and had no effect — the deployment log still reported `iad1`.

**Consequence.** On the Hobby plan there is one region for the entire project, so
this is a project-level decision. The misleading route export was removed rather
than left in place looking like configuration.

---

## 2026-08-31 — Steps are grouped by action code in the player UI

**Decision.** The voting arena renders one card per distinct `action_code`, with
a remaining-turns count, instead of one card per step.

**Context.** A step is consumed when it resolves, so a plan that wants a move
playable every turn must contain one step per turn for it. Rendered literally,
that produced six identical cards — same name, same cost, same probability — and
players could not tell what the choice was.

**Consequence.** The UI no longer mirrors the plan one-to-one, which is the right
trade: the plan's repetition is an engine constraint, not information the player
needs. Cards also fall back to the action catalogue from `/client/game_state`
when `StepView` omits the name, cost or probability, so a raw action code can
never reach the screen.

---

## 2026-08-30 — The equilibrium solver runs in the frontend

**Decision.** `packages/api/game-plan/equilibrium.ts` solves the game as a pure
function of the plan, with no server call.

**Context.** The admin needs to see the consequences of a configuration *before*
publishing it. A server round-trip would make an unpublished draft unsolvable.

**Consequence.** A draft can be solved in the builder, and "what if this move
were banned" is instant. The cost is that it solves the plan **as authored**: it
reads only `teams`, `actions` and `action_counters`, so in-game modifiers,
black-market purchases and active effects are not reflected. Government action
bans are modelled through `excludedActionCodes`. Do not claim in a demo that the
panel reflects a black-market purchase — it does not.

> The Python server has its own Nash analytics, configured under `ne` in its
> `config.yml`, writing plots to `logs/plots/<game_id>/`. The two have never been
> reconciled. See `docs/backend-internals.md`.

---

## 2026-08-29 — Team membership comes from the API, never from the plan JSON

**Decision.** Players are assigned to teams through the admin panel and read back
from the API. The game plan carries no user data.

**Context.** An earlier draft hardcoded members into `demo-game-plan.json`.

**Consequence.** The plan stays portable across games and environments, and no
user identity is committed to the repository. The «اعضای تیم‌ها» tab is the only
place membership is set.

---

## Template

```
## YYYY-MM-DD — <decision in one line>

**Decision.** What was decided.

**Context.** What forced the choice.

**Alternatives.** What else was considered, and why it lost.

**Consequence.** What this now costs or constrains. Be honest about the downside.
```
