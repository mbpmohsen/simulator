# Game Plan v2 — Data Model Reference

The contract a published scenario must satisfy: `ConfigureAllRequestV2`.

Everything the admin builder produces, everything the equilibrium solver reads,
and everything the Python engine executes. Extracted from
`packages/api/game-server/types.ts` and `packages/api/game-plan/validation.ts`,
with worked examples from `apps/admin/public/data/demo-game-plan.json`.

Verified 2026-09-04.

---

## The shape

```ts
interface ConfigureAllRequestV2 {
  version: "2.0"
  game_config:       GameConfigRequest
  teams:             TeamRequest[]
  actions:           ActionConfigRequest[]
  goals:             Goal[]
  subjects:          Subject[]
  sub_subjects:      SubSubject[]
  scenarios:         Scenario[]
  scenario_steps:    ScenarioStep[]
  impact_rules:      ImpactRule[]
  visibility_config: VisibilityConfig
  government?:       GovernmentConfigRequest | null
  action_counters?:  ActionCounterRequest[]
  black_market?:     BlackMarketItemRequest[]
  max_players?:      number | null
  sides?:            SideConfig[] | null
}
```

Ten collections are required, five optional. The tree:

```
Goal ──> Subject ──> SubSubject ──> Scenario ──> ScenarioStep ──> Action
                                                        └──> ImpactEffect
```

### The `_fa` convention

Almost every human-readable field has a `_fa` companion — `title` / `title_fa`,
`name` / `name_fa`, `description` / `description_fa`. The UI resolves them with
`getLocalized(value, faValue)`, which **prefers the Persian** and falls back to
the base value, then to `"—"`.

The `_fa` field is always optional. Omitting it is safe; the interface is Persian
throughout, so omitting it means English text on a Persian screen.

---

## 1. `game_config`

```ts
{
  num_turns: number                 // required
  point_threshold: number           // required
  turn_duration_seconds?: number
  selection_phase_duration?: number
  voting_phase_duration?: number
  vote_time_limit_seconds?: number
  voting_config?: Record<string, unknown>
  victory_conditions?: Record<string, unknown>
}
```

`voting_config` and `victory_conditions` are typed as open records — **nothing
validates their contents**. The demo uses:

```json
"voting_config": {
  "voting_enabled": true, "required_approval": "majority",
  "leader_veto_enabled": true, "vote_time_limit_seconds": 40
},
"victory_conditions": {
  "type": "points_or_turns", "points_to_win": 5, "max_turns": 6
}
```

> **`num_turns`, `victory_conditions.max_turns` and the step count must agree,
> and nothing checks this.** With 6 steps per move per lane, setting `num_turns`
> to 7 leaves a team with an empty lane on the last turn. This has happened.

`required_approval: "majority"` with a two-member team means **both** must agree.
Three members give a genuine 2–1.

---

## 2. `teams`

```ts
{
  name: string                      // required
  role: TeamRoleRequest | string    // required
  players: TeamPlayerRequest[]      // required
  id?: number
  side_id?: number
  starting_credits?: number
  team_type?: "PLAYER" | "GOVERNMENT"
  governmentCode?: string
  display_name?, name_fa?, display_name_fa?, side_name?, side_name_fa?
  color?, icon?, specializations?
}
```

`role` is either a string or an object:

```ts
{ type: "ATTACKER" | "DEFENCER" | "BOTH" | "GOVERNMENT",
  allowed_action_types?: ("attack" | "defense" | "government")[],
  type_fa?, allowed_action_types_fa?, description? }
```

`TeamPlayerRequest`: `{ userId, name?, name_fa?, isLeader?, voteWeight? }`.

> **`players` should be left empty in a stored plan.** Membership comes from the
> API and the admin's «اعضای تیم‌ها» tab. See `docs/decisions.md`.

The demo has four teams: two governments (120 credits) and two playing teams
(80 credits).

---

## 3. `actions` — where the numbers live

```ts
{
  code: string                      // required, the join key everywhere
  type: "attack" | "defense"        // required
  base_stats: {                     // required
    cost: number                    // required
    success_probability: number     // required, 0-100
    points_on_success?: number
    cooldown_turns?: number
  }
  name?, name_fa?, type_fa?, description?, description_fa?
  requirements?: {
    unlocked_by_default?, allowed_team_ids?, allowed_team_roles?,
    prerequisites?, alternative_unlock?
  }
  effects?, visual?, mitre_mapping?
}
```

**`code` is the identity of an action across the whole system** — steps
reference it, counters reference it, black-market items target it, government
bans name it, and resolved-step events carry it. It is also what the player UI
falls back to rendering when a name is missing.

`points_on_success` is optional in the type but the equilibrium treats a missing
value as 0, and a move worth nothing never appears in the equilibrium.

Example:

```json
{ "code": "ATK_PROBE_ACCESS", "type": "attack",
  "name_fa": "کاوش — فشار بر دسترسی",
  "base_stats": { "cost": 8, "success_probability": 90,
                  "points_on_success": 2, "cooldown_turns": 0 } }
```

---

## 4. `action_counters`

```ts
{ attack_code: string,
  countered_by?: [{ defense_code: string, effectiveness: number,
                    description?, description_fa? }] }
```

`effectiveness` is a percentage that reduces the attacker's **effective** success
probability. It adds nothing to the defender's own score:

```
attackerValue = (probability / 100) × (1 − effectiveness / 100) × points
```

Full derivation in `docs/equilibrium-formulas.html`.

---

## 5. `goals`, `subjects`, `sub_subjects`

```ts
Goal { id, title, side_id, title_fa?, description?, description_fa? }

Subject { id, goal_id, title, subject_type, target_team_id, owner_side_id,
          title_fa?, description?, description_fa?, subject_type_fa?,
          criticality?, mitre_mapping? }

SubSubject { id, subject_id, title, progress_share,
             title_fa?, source?, completion_rule? }
```

`subject_type` is `"mitre_technique" | "asset" | "critical_infrastructure"`.

> **`progress_share` values must sum to exactly 100 per subject.** This *is*
> validated. It is a weight toward the parent's completion, **not** how far along
> the target is — a widely misread field, which is why the player UI labels it
> «سهم» rather than showing a bare percentage.

---

## 6. `scenarios` and `scenario_steps`

```ts
Scenario { id, sub_subject_id, title, scenario_type, execution_mode,
           title_fa?, scenario_type_fa?, execution_mode_fa?,
           allowed_team_roles?, allowed_team_roles_fa?,
           base_reward_points?, base_credit_cost?, risk_level?, risk_level_fa? }

ScenarioStep { id, scenario_id, action_code,
               order?, required?, depends_on?, on_success?, on_failure? }
```

`scenario_type` is `"attack_path" | "defense_path"`.
`execution_mode` is `"ordered" | "checklist" | "branching"` — under `"ordered"`
**every step must have an `order`**, and that is validated.

> **A step is consumed when it resolves.** Its status becomes `completed` or
> `failed` and it can never be voted on again. A move that should be playable
> every turn needs **one step per turn**. The demo has 18 per scenario: 3 moves
> × 6 turns, interleaved round-major.
>
> The player UI groups steps by `action_code` so this repetition renders as one
> card per move with a remaining count, not one card per step.

`depends_on` may only name steps in the **same scenario**, and a step may not
depend on itself. Both are validated.

---

## 7. `impact_rules` and effects

```ts
ImpactRule { id, trigger: { event: string, action_code?: string },
             effects: ImpactEffect[] }

ImpactEffect { type: ImpactEffectType, target?, value?,
               duration_turns?, confidence?, reason? }
```

The same `ImpactEffect` shape is used by a step's `on_success` / `on_failure`.

`ImpactEffectType` — fourteen values:

| | | |
| --- | --- | --- |
| `ADVANCE_PROGRESS` | `STALL_SUBJECT` | `RESUME_SUBJECT` |
| `DISABLE_ACTION` | `ENABLE_ACTION` | `LOCK_SCENARIO` |
| `UNLOCK_SCENARIO` | `SKIP_STEP` | `CREDIT_DELTA` |
| `POINT_DELTA` | `REVEAL_TO_GOVERNMENT` | `REDUCE_VISIBILITY` |
| `PROBABILITY_MODIFIER` | `REMOVE_ACTIVE_EFFECT` | |

An effect's `target` must be a known id — a subject, sub-subject, scenario, step
or action code. Validated.

Demo example: `DEF_HARDEN_IDENTITY` resolving reveals `ATK_PROBE_ACCESS` to the
government.

---

## 8. `visibility_config`

```ts
{ events: Record<string, { audiences: VisibilityAudience[] }>,
  cross_side_result: { enabled: boolean, grantees: CrossSideVisibilityGrantee[] } }

VisibilityAudience { type, id?, user_id?, team_id?, side_id?, role_value? }
```

> **All 66 event types in `REQUIRED_VISIBILITY_EVENT_TYPES` must be present**, and
> `cross_side_result` must exist. Both are validated, and a missing event type is
> the most common reason a hand-edited plan fails to publish.

The list spans phases, voting, actions, government, combat, turns, black market,
directives, connection state and lifecycle. Read it from `validation.ts` rather
than typing it out.

---

## 9. `government` (optional)

```ts
{ enabled: boolean,
  side_governments: [{ side_id, team_id, player,
                       permissions?, intervention_config?,
                       regulation_presets?, event_triggers?,
                       dashboard_config?, actions? }],
  actions?: GovernmentActionRequest[] }
```

`permissions` and `intervention_config` are open records — **not validated**. The
demo uses `can_ban_actions`, `can_modify_credits`, `can_impose_penalties`,
`can_unban_actions`, and `{ interventions_per_game: 2, intervention_cooldown_turns: 1 }`.

`GovernmentActionRequest` carries `code` and `intervention_type` plus a wide set
of optional fields (`credit_delta`, `banned_action_code`, `target_team_id`,
`duration`, `severity`, `announcement`, …). Which apply depends on the
intervention type.

Runtime orders use a different, stricter shape — see `docs/gameplay-api.md` §6.

---

## 10. `black_market` (optional)

```ts
{ code, item_type, effect_type, cost, effect: { value, modifier_type?, description? },
  name?, name_fa?, description?, description_fa?, item_type_fa?,
  target?: { action_code?, action_type? },
  duration_turns?, availability?, stackable?, visual? }
```

`item_type` is `"attack_modifier" | "defense_modifier"` by convention.
`effect_type` values in use: `probability_increase`, `cost_decrease`,
`PROBABILITY_MODIFIER`, `REDUCE_VISIBILITY`, `SKIP_STEP`, `REMOVE_ACTIVE_EFFECT`
— **inconsistently cased, and not validated**. Copy an existing item rather than
inventing a spelling.

`availability` as used by working plans: `{ start_turn, end_turn, max_purchases }`
— note the TypeScript interface suggests different names; the plans the engine
accepts use these.

> **Black-market items do not affect the equilibrium.** The solver reads only
> `teams`, `actions` and `action_counters`. A purchase changes the odds for a
> turn; it does not move the equilibrium bars.

---

## 11. What validation actually checks

`validateDefaultGamePlanClientSide(plan)` returns `{ valid, errors }`.

**It does check:**

- duplicate ids within every collection
- `goal.side_id` exists in `teams`
- `subject.goal_id`, `owner_side_id`, `target_team_id` all resolve
- every subject has at least one sub-subject
- **`progress_share` sums to exactly 100 per subject**
- `sub_subject.subject_id` resolves, and each has at least one scenario
- `scenario.sub_subject_id` resolves, and each has at least one step
- under `execution_mode: "ordered"`, every step has an `order`
- `step.scenario_id` and `step.action_code` resolve
- `depends_on` entries are siblings in the same scenario, and not self-referential
- every effect `target` is a known id
- **all 66 required visibility event types are present**
- `visibility_config.cross_side_result` exists

**It does not check:**

- anything inside `voting_config` or `victory_conditions`
- that `num_turns` agrees with `max_turns` or with the step count
- `government.permissions` or `intervention_config`
- black-market `effect_type` spelling, or that `target.action_code` resolves
- that probabilities are 0–100, or that costs and points are non-negative
- **whether the resulting game is playable** — a plan where one side's moves are
  all dominated validates cleanly

That last gap is why the admin cards show the equilibrium weight per action, and
warn when the solver reports a move as dominated.

---

## 12. Fields that drive the equilibrium

The solver reads **only** these:

| Field | Role |
| --- | --- |
| `teams[].side_id` | splits attackers from defenders |
| `actions[].type` | `attack` → matrix rows, `defense` → columns |
| `actions[].base_stats.success_probability` | |
| `actions[].base_stats.points_on_success` | |
| `actions[].base_stats.cost` | expected-cost reporting only, not the matrix |
| `action_counters[].countered_by[].effectiveness` | |

**Everything else is invisible to it** — the whole subject/scenario/step tree,
`impact_rules`, `black_market`, `visibility_config`, government config, credits,
turn counts. Restructuring the tree cannot change the equilibrium; changing one
action's probability can change it completely.

Tuning notes and the checklist for changing these numbers:
`docs/demo-scenario.md`.

---

## 13. Editing a plan by hand

1. Edit `apps/admin/public/data/demo-game-plan.json`, or load it in the builder.
2. Run `validateDefaultGamePlanClientSide` — the builder's «اعتبارسنجی و انتشار»
   tab does this.
3. Re-solve and confirm no move is dominated — see `docs/demo-scenario.md` §7.
4. **Publish.** Editing the JSON changes nothing in a running game.

`normalizeDefaultGamePlan(raw)` fills defaults and coerces shapes before
validation; a plan that fails to load at all usually failed there rather than in
validation.
