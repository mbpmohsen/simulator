# Demo Scenario Design Notes

Why `apps/admin/public/data/demo-game-plan.json` has the numbers it has.

Every value in that file is deliberate. This document exists because the numbers
look arbitrary and are not — changing one without understanding the others has
already broken the scenario once.

Verified against the plan on 2026-09-04.

---

## Read this before changing any number

On 2026-09-03 a commit titled *"make upper success probability"* raised the
success probabilities to 90 / 85 / 80 for attacks and 74 / 80 / 75 for defences.
It looked like a harmless quality-of-life change: everything succeeds more often,
the game moves faster.

It silently destroyed the design. Two of the six moves became **dominated** —
weight zero in the equilibrium, meaning a rational team would never play them:

| Move | Expected value | Equilibrium weight |
| --- | --- | --- |
| Probe | 1.80 | **0% — dominated** |
| Disrupt | 3.40 | 67% |
| Blackout | 4.80 | 33% |
| Harden identity | 0.74 | **0% — dominated** |
| Contain | 1.60 | 20.5% |
| Restore continuity | 2.25 | 79.5% |

With blackout both *more likely to succeed* and *worth more*, probe was worse in
every dimension — there was no longer any reason to play it. The solver emitted
two `DOMINATED_MOVE` warnings, and the admin cards would have shown an amber
"0% share in equilibrium" chip on both moves, on camera.

The change was reverted. **The lesson is the checklist at the end of this
document: after touching any number, re-solve and check for dominated moves.**

---

## 1. The core design: three moves, identical expected value

| Move | Cost | Success | Points | Expected |
| --- | --- | --- | --- | --- |
| `ATK_PROBE_ACCESS` | 8 | 90% | 2 | **1.80** |
| `ATK_DISRUPT_WORKFLOW` | 12 | 45% | 4 | **1.80** |
| `ATK_BLACKOUT_SERVICE` | 16 | 30% | 6 | **1.80** |

This equality is the entire teaching point of the demo, and the line the
voice-over is built on: *on paper no move is better than the others, so the only
thing that decides the turn is what the opponent chose.*

Cheap and near-certain but small; expensive and unlikely but large. Multiply
them out and they are the same number. Any retune **must preserve the equality**.
To move the overall level, scale all three together: `points = E / (probability
/ 100)` for a chosen expected value `E`. At `E = 1.80` that gives 2 / 4 / 6.

The player UI shows this directly — the «ارزش مورد انتظار» chip on each move
card, and a callout that appears only when all three are within 0.05 of each
other.

### The defence is deliberately *not* equal

| Move | Cost | Success | Points | Expected |
| --- | --- | --- | --- | --- |
| `DEF_HARDEN_IDENTITY` | 8 | 74% | 1 | 0.74 |
| `DEF_CONTAIN_TRIAGE` | 12 | 40% | 2 | 0.80 |
| `DEF_RESTORE_CONTINUITY` | 16 | 28% | 3 | 0.84 |

A defence move earns points on its own roll *and* reduces the attacker through
its counter. Raw expected value therefore under-describes it, and all three stay
in play (25.8% / 32.4% / 41.8%) despite differing.

This is why the admin card's balance warning uses the solver's `dominated` flag
rather than comparing expected values — an earlier version compared the raw
numbers and produced a false warning on the defence side.

---

## 2. Counters

| Attack | Countered by | Effectiveness |
| --- | --- | --- |
| Probe | Harden identity | 78% |
| Disrupt | Contain and triage | 62% |
| Blackout | Restore continuity | 48% |

Deliberately **decreasing**: the cheap attack is the easiest to stop, the
expensive one the hardest. This is what stops the defender from simply always
playing the strongest counter, and it is what keeps all three defences in the
mix.

Effectiveness reduces the attacker's *effective* success probability:

```
attackerValue = (probability / 100) × (1 − effectiveness / 100) × points
```

It does not add anything to the defender's own score. Full derivation in
`docs/equilibrium-formulas.html`.

---

## 3. Why the attacker is favoured

Attacker points were doubled from 1 / 2 / 3 to 2 / 4 / 6 so the attacker wins
the demo. Defence stats and counters were left untouched.

| | Before | After |
| --- | --- | --- |
| Attacker points per turn | 0.72 | **1.44** |
| Defender points per turn | 0.80 | 0.80 |
| Game value | −0.082 | **+0.637** |

A positive game value means the equilibrium favours the attacker, and the admin
equilibrium panel shows it. Doubling preserved the equality inside the attacker's
three moves, so the teaching point survived the change.

### It is still a dice game

No configuration guarantees a win. Monte Carlo over 200,000 runs, threshold 5
points in 6 turns:

| Scenario | Attacker reaches the threshold |
| --- | --- |
| Both sides play the equilibrium mix | **76%** |
| Attacker leans on probe, defender avoids harden | **95%** |

The last 5% comes from directing, not configuration — during a recording you
control both sides, and `resetGame` in the monitoring console lets you re-shoot
a bad take. Raising probabilities to 100 would guarantee it and destroy the
premise; that is exactly the mistake described at the top of this document.

---

## 4. Structure

Each side has one subject («زیرساخت‌های حیاتی شهر») holding **three targets** as
sub-subjects — hospital (share 34), power grid (33), water treatment (33). Each
target has one scenario carrying **18 steps**: 3 moves × 6 turns, interleaved
round-major so all three moves are available side by side every turn.

### Why not 6 identical steps per lane

The first version had one sub-subject per *move*, each with 6 steps of the same
action. A step is consumed when it resolves, so 6 copies were needed to play a
move in all 6 turns.

The consequence was not thought through: inside any lane the player saw **six
identical cards** — same name, same cost, same probability — and the three moves
that actually differ lived in three separate lanes, never visible together. The
choice the whole demo is about was invisible.

The current shape puts the three different moves side by side every turn, and
the lane picker became a genuine second decision: *which target*, then *which
move*. Both are re-selectable each turn — `canSelectScenario` allows it in every
`SELECTION` phase.

The player UI groups steps by `action_code` so six turns' worth of one move
render as **one card** with a remaining count, not six cards.

---

## 5. Credits and the black market

Both playing teams start with **80 credits**; governments hold 120.

At equilibrium the attacker spends **12.29 credits per turn** — about 74 over
six turns against a budget of 80. That is deliberately tight: by the last turn a
team is nearly broke, which makes the government's funding injection matter and
makes a black-market purchase a real sacrifice rather than free.

| Item | Side | Cost | Effect |
| --- | --- | --- | --- |
| `BM_RED_RECON_DOSSIER` | attack | 20 | +12% on blackout, 1 turn |
| `BM_BLUE_CONTINUITY_DRILL` | defence | 20 | +12% on restore, 1 turn |
| `BM_RED_COVER_TOKEN` | attack | 16 | reduces visibility of probe |
| `BM_BLUE_IDENTITY_AUDIT` | defence | 14 | +8% on harden, 2 turns |
| `BM_RED_PRESSURE_VOUCHER` | attack | 12 | −4 cost on disrupt |
| `BM_BLUE_TRIAGE_BUDGET` | defence | 12 | −4 cost on contain |

The two flagship items cost **exactly 20** — the same as a government
`ALLOCATE_CREDIT` injection. That is intentional: it gives the demo a clean beat
where the government funds a team and the team spends it immediately.

> **The equilibrium solver does not model the black market.** It reads only
> `teams`, `actions` and `action_counters`. A purchase changes the odds for a
> turn; it does not move the bars in the equilibrium panel. Government *action
> bans* do, via `buildEquilibriumWithout`.

---

## 6. Game configuration

| Setting | Value | Note |
| --- | --- | --- |
| `num_turns` | 6 | must match `victory_conditions.max_turns` |
| `victory_conditions.max_turns` | 6 | |
| `point_threshold` / `points_to_win` | 5 | reached around turn 4 at 1.44/turn |
| `turn_duration_seconds` | 110 | too fast to drive five windows — pause the game when recording |
| `selection_phase_duration` | 40 | |
| `voting_phase_duration` | 40 | |
| `required_approval` | `majority` | with 2 members this means *both*; 3 members give a visible 2–1 |
| `leader_veto_enabled` | true | |

**`num_turns`, `max_turns` and the step count must agree.** There are 6 steps per
move per lane. If `num_turns` goes to 7, a team that stays in one lane finds it
empty on the last turn.

---

## 7. When you change these numbers

Run all four. The first two are the ones that catch real damage.

1. **Re-solve and check for dominated moves.**
   ```bash
   node --experimental-strip-types -e '
   import("./packages/api/game-plan/equilibrium.ts").then(async m => {
     const plan = JSON.parse(require("fs").readFileSync(
       "apps/admin/public/data/demo-game-plan.json","utf8"));
     const eq = m.buildEquilibrium(plan);
     console.log("value", eq.value, "warnings", eq.warnings.length);
     for (const s of [...eq.attacks, ...eq.defenses])
       console.log(s.move.code, (s.weight*100).toFixed(1)+"%", s.dominated ? "DOMINATED" : "");
   })'
   ```
   **Zero warnings and zero dominated moves**, or the design is broken.

2. **Check the attacker's three expected values are still equal** —
   `probability × points` identical across all three, or the demo's central
   claim becomes false.

3. **Validate the plan** with `validateDefaultGamePlanClientSide`.

4. **Check the credit budget**: expected cost per turn × `num_turns` should sit
   just under 80, so the endgame stays tight without stranding a team.

Then republish the plan — editing the JSON changes nothing in a running game.
