# Resolution model — what a turn's outcome actually means

> **What this is.** How a resolved turn reaches the player: which events carry
> it, what each field means, and how the UI is required to word it.
>
> **Why it exists.** `success: true | false` is not enough to word a screen, and
> wording it from that flag alone shipped a real defect — see §1. Since the
> 2026-09-24 server every resolution carries an `outcomeReason`, the probability
> actually rolled, the roll itself, and the counter that gated it.
>
> **Source of truth.** The server's `resolution-semantics.md`, received
> 2026-09-24 in answer to `docs/backend-requests.md`, plus the payload shapes in
> `apps/web/lib/moveResults.ts`. Rendering rules are enforced in
> `packages/api/game-plan/resolution-ui.test.ts`.
>
> Written 2026-09-24.

---

## 1. The bug this document exists to prevent

A defence does **two separate jobs**, and only one of them is what its `success`
flag describes.

- **Guard — always happens.** Paying for a defence arms the counter gate against
  the attack it counters, *whatever its own roll does*. `guardActive: true` says
  so.
- **Repair — conditional.** Only if the team already carries a standing
  vulnerability does the defence roll to clear it. **That roll is the only thing
  `success` reports.**

So a defence played on a turn with nothing to repair reports `success: false`
and has done its whole job. The player screen used to render that as
«ناموفق» — teaching the defender that defending does not work, which is the
opposite of the rule. `outcomeReason: "NOTHING_TO_REPAIR"` is what distinguishes
it, and it is now rendered as «دفاع برقرار» in a neutral tone.

**Rule: never word a resolution from the `success` flag alone.** Use
`outcomeWordingFa(outcomeReason, success)` in `apps/web/lib/runtimeTranslationsFa.ts`.

---

## 2. `outcomeReason` vocabulary

| Value | What happened | Tone in the UI | Persian label |
|---|---|---|---|
| `PROBABILITY_SUCCESS` | Rolled and won. | success | موفق |
| `PROBABILITY_FAILURE` | Rolled and lost. | failure | ناموفق |
| `TARGET_VULNERABLE` | Auto-success; the target was already open. `appliedProbability` is `100`, no roll. | success | موفق بدون تاس |
| `BLOCKED_BY_COUNTER` | The target's defence gated it; the attack never rolled. `appliedProbability` is `0`. | blocked | سد شد |
| `NOTHING_TO_REPAIR` | Defence only. No standing vulnerability, so no roll. **Not a failure.** | neutral | دفاع برقرار |
| `INSUFFICIENT_CREDITS` | Could not afford it; nothing ran and nothing guarded. | failure | اعتبار کم |
| `INVALID` | Rejected before execution — no target, same-side attack, or a directive banned it. | failure | اجرا نشد |

**Treat the list as open.** A value this build has never seen falls back to the
`success` flag; a raw server code must never reach the screen. `hadNoRoll()`
covers the four reasons where no dice were thrown.

`appliedProbability` and `roll` are `null` whenever no roll took place.

---

## 3. A counter is a gate, not a discount

This is the single most misunderstood mechanic, and it was invisible for months.

A counter does **not** reduce the attack's probability. It is an independent
gate rolled *before* the attack:

```
defence is the counter for this attack?
  ├─ no  → attack rolls at its own probability
  └─ yes → roll 0-100 against counterEffectiveness
             ├─ under  → BLOCKED_BY_COUNTER. The attack never rolls.
             └─ over   → the attack rolls at its UNMODIFIED probability.
```

That is why `currentProbability` in `availableActions` always equals
`baseProbability`: counter effectiveness is never folded into it. An earlier
reading of this as "counters may be inert" was wrong — the mechanic works, it
just never touches the number it was assumed to touch.

| Field | Meaning |
|---|---|
| `counterActionCode` | The defence that gated this attack, or `null`. |
| `counterEffectiveness` | Its block chance, 0–100. |
| `counterRoll` | What was rolled against it. Under the effectiveness means blocked. |
| `blockedByCounter` | `true` when the gate stopped the attack. |

Every team's chosen defence is staged before any attack resolves, so the gate
applies regardless of which team the engine happens to resolve first.

**The equilibrium solver is unaffected.** It models the counter as
`(1 − e/100) × (p/100)`, and a gate that blocks with probability `e` followed by
a roll at `p` has exactly that success rate. The payoff matrix in
`docs/equilibrium-formulas.html` was right even while the mechanism was
misunderstood, so nothing about the balance of the demo changes. What changes is
the story told to the player.

**UI requirement.** Show both numbers. A player who sees only «سد نگرفت» learns
nothing; a player who sees «شانس سدکردن ۶۰٪، تاسش ۶۲» learns the mechanic in one
turn. `TurnRevealOverlay` and the per-card banner in `ScenarioVotingArena` both
do this.

---

## 4. Standing vulnerabilities

A successful attack leaves its target open: **the same attack from the same
attacker then succeeds automatically at 100 %**, skipping its roll, until a
defence that counters it repairs the damage.

This is the harshest rule in the game and the server pushes no state for it, so
`buildVulnerabilities()` in `apps/web/lib/moveResults.ts` folds it out of the
resolution stream in sequence order:

| Event | Effect |
|---|---|
| `role: "target"`, `success: true` | This team is now exposed to that attack code. |
| `role: "actor"`, attack, `success: true` | The opponent is now exposed to it. |
| `role: "actor"`, defence, `PROBABILITY_SUCCESS` | Clears what `guardsAgainstActionCode` names. |
| `role: "counterparty"`, defence, `PROBABILITY_SUCCESS` | The opponent repaired; our free shot is gone. |

Two subtleties that are easy to get wrong, and are covered by tests:

- **A lost repair roll does not clear the exposure.** Only
  `PROBABILITY_SUCCESS` does. `PROBABILITY_FAILURE` leaves it standing, which is
  exactly what makes the rule harsh.
- **An attack that was blocked opens nothing.** `BLOCKED_BY_COUNTER` never
  creates a vulnerability.

`VulnerabilityBanner` renders both directions: what can hit this team for free,
and what this team can land for free.

---

## 5. The three roles

| Role | Sent to | Describes |
|---|---|---|
| `actor` | The team that acted | Their own move and roll. |
| `target` | The team that was attacked | The **attacker's** move and roll. Every field is attacker-relative — `success: true` means the attacker succeeded. |
| `counterparty` | The opposing team | What the other team played, after the whole resolution loop finished. |

`counterparty` is emitted only inside `CALCULATION`, strictly after voting
closed, so nothing here can leak into a live vote. **It is suppressed for a team
that already received the richer `target` copy**, so in a straight
attacker-vs-defender turn the attacker gets `counterparty` and the defender does
not. Handle both roles; never assume both arrive.

`buildIncomingMoves()` reads both into one `IncomingMove` list and keeps the
`role`, because the wording differs: «روی تیم شما» versus «در زمین خودشان».

---

## 6. Plan coordinates

Both the `actor` and `target` copies of `TEAM_ACTION_RESOLVED` now carry the
plan coordinates — `subject_id`, `sub_subject_id`, `scenario_id`, `step_id` —
the same values the attacker's `SCENARIO_STEP_RESOLVED` carries. This is what
lets the defender see *which of their sites* was hit.

**These keys are omitted entirely — absent, not `null`** — for v1 games and for
any action not bound to a scenario step. Treat a missing key as "not part of a
plan", never as an error.

> **Unverified.** The server's live verification run used a v1 game, so these
> coordinates have never been observed on a real wire — only in tests against
> the payload builder. Sending a v2 config for a real run is an open item.

---

## 7. How the client assembles a turn

`apps/web/lib/moveResults.ts` is the only place that reads these events.

- `buildMoveResults(events)` — this team's own moves. Pairs each
  `SCENARIO_STEP_RESOLVED` (which knows the site and the progress effects) with
  its `TEAM_ACTION_RESOLVED` (which knows the turn, the points and the whole
  roll) within `PAIR_WINDOW = 8` sequence numbers. A resolution with no matching
  step — rejected before execution, or an action outside the plan — is still
  kept, or the player would see nothing at all for the turn they just spent.
- `resultsForTurn(events, turn)` — the current turn's results keyed by action
  code, for the per-card banner.
- `buildIncomingMoves(events)` / `incomingMoveForTurn(events, turn)` — the
  opponent's move, from either role.
- `buildVulnerabilities(events)` — §4.

Everything is derived; nothing is cached across turns.

---

## 7b. The end-of-game report

`apps/web/lib/gameSummary.ts` replays the whole history into the report shown
under the final scoreboard: a turn-by-turn timeline, an itemised scorecard, and
the turn that decided the game.

Two things make it different from the live screens:

- **It re-reads the history from sequence zero** (`useGameHistory`), because the
  live hook keeps a rolling 100-event buffer — right for a feed, wrong for a
  report. The fetch asks the server for only the three event types the report
  reads, since the snapshot ping is the bulk of the stream.
- **A team that scored nothing still has a record.** `Scorecard` counts attacks
  blocked, repairs made, guard turns and clean turns beside the points, because
  a defender's game is not measured in points and a screen that shows them "0"
  teaches the wrong thing. Stats with nothing behind them are not rendered at
  all rather than shown as zero.

Standing vulnerabilities on this screen come from `team.vulnerabilities` in the
game state — the server's own record — not from the derived view in §4.

---

## 8. Rules for any new screen that shows a result

1. Word it from `outcomeReason`, never from `success` alone.
2. Fall back to the flag for an unknown reason, and never print the code.
3. `NOTHING_TO_REPAIR` is not a failure and must not be coloured as one.
4. If a roll happened, show the probability **and** the roll. A lost 90 % and a
   lost 30 % must not look alike — the equal-expected-value design is the whole
   teaching point.
5. If a counter was in play, say whether its gate caught and with what chance.
6. Do not charge the player for a move that never ran: no "credits spent" chip
   on `INSUFFICIENT_CREDITS` or `INVALID`.
7. Never invent a number. Every field here can be `null`.

---

## 9. What is still unresolved

- **Resolution order between teams is not a designed rule.** It follows the
  engine's internal team ordering. A defence can therefore repair damage from
  the very attack that landed in the same turn, and the server states plainly
  that no UI should depend on the attacker resolving first. Worth raising as a
  game-design question, not just a UI one.
- `actionName` on resolution events holds a **code**, not a name. An
  `actionCode` alias has been requested; until it lands, `codeOf()` reads
  `actionCode` first and falls back.
- The same concept is spelled `name_fa` in `GAME_STATE_SNAPSHOT.availableActions`
  and `displayName_fa` in `/client/game_state`. Both are read.
