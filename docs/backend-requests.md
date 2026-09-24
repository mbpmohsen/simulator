# Frontend requests to the backend team

> **Scope.** Eight things the player, government and admin clients need from the
> Python game server at `game.darkube.ir`. Nothing here is a bug report about
> the game rules — every item is a piece of data the server already has and the
> client currently cannot see.
>
> Every claim below is backed by a captured SSE log or a real API response, cited
> inline. Captures are from game `1790173164872137442` (six turns, Red attacker
> vs Blue defender) and a `/client/game_state` response from game
> `1790229282688571413`.
>
> Written 2026-09-24 by the frontend team.
>
> **Status: all eight answered and shipped, same day.** The server's reply is in
> `backend-responses-2026-09-24.md`, `resolution-semantics.md` and
> `deviations.md`. What the answers mean for the client is written up in
> **`docs/resolution-model.md`**; this page is kept as the record of what was
> asked and why, and of the three decisions still open at the bottom.

---

## Outcome

| # | Request | Outcome |
|---|---|---|
| 1 | Plan coordinates on the defender's copy | Done — all four ids, on `actor` too. Omitted (absent, not `null`) for v1 games. |
| 2 | Tell the attacker what the defender did | Done — a third role, `counterparty`. Suppressed when the team already got `target`. |
| 3 | The probability actually rolled | Done — `baseProbability`, `appliedProbability`, `roll`, plus the whole counter gate, on all three roles. |
| 4 | `opponentTeam` is the wrong team | Fixed, and `opponentGovernment` added as a sibling. |
| 5 | What a defence "success" means | Answered: a defence guards always and repairs conditionally; `outcomeReason` now distinguishes the cases. |
| 6 | Do counters work | Answered: yes, as a **gate rolled before the attack**, never as a change to its probability. |
| 7 | `timeUnit` in the client game state | Done — on `data.game` and on the snapshot. |
| 8 | Persian names in the client catalogs | Done, with two key-name deviations. |

Two things the answers changed that we had not asked about:

- **`NOTHING_TO_REPAIR`** revealed that the player screen had been wording a
  working defence as a failure. That was the most valuable line in the reply.
- **`TARGET_VULNERABLE`** — a successful attack makes the same attack
  auto-succeed at 100 % until repaired. Nobody had told us, and nothing on
  screen showed it.

### Still open

1. **`actionCode` alias.** `actionName` on resolution events holds a code. The
   server offered a two-line alias; we want it. `codeOf()` already reads
   `actionCode` first.
2. **One key name for the Persian label.** `name_fa` in
   `GAME_STATE_SNAPSHOT.availableActions` versus `displayName_fa` in
   `/client/game_state`. Our proposal: **add** `displayName` / `displayName_fa`
   to `availableActions` beside the existing keys rather than rename anything,
   so nothing breaks and one parser serves both.
3. **A v2 verification run.** The live run used a v1 game, so request #1's plan
   coordinates have never been seen on a real wire. `apps/admin/public/data/
   demo-game-plan.json` is a v2 config ready to send.

Accepted as shipped: black-market `name` stays the identity key, with
`displayName` / `displayName_fa` alongside. Their reasoning is right — purchases
and active effects are stored against that value.

One thing worth raising that is not a request: the server states that **the
resolution order between teams is not a designed rule**, and demonstrated a turn
where a defence repaired damage from the attack that had just landed in the same
turn. That makes a turn's outcome depend on internal ordering. The UI does not
rely on it; the game design probably should not either.

---

## Summary

| # | Request | Endpoint / event | Blocks |
|---|---|---|---|
| 1 | `sub_subject_id` on the defender's copy of a resolution | `TEAM_ACTION_RESOLVED` (`role: "target"`) | showing the defender *what* was attacked |
| 2 | Tell the attacker what the defender did | new or extended resolution event | the whole post-turn reveal |
| 3 | Report the probability actually rolled | `TEAM_ACTION_RESOLVED` | teaching the core game idea |
| 4 | `opponentTeam` must be the opposing **player** team | `GAME_STATE_SNAPSHOT` | the opponent panel is wrong today |
| 5 | Define what a defence "success" means | docs | we are guessing on screen |
| 6 | Confirm counters actually change the attack roll | docs / #3 | the game may not do what it claims |
| 7 | `timeUnit` in the client game state | `GET /client/game_state` | the new time-unit feature reaching players |
| 8 | Persian display names in the client catalogs | `GET /client/game_state` | Persian-only UI |

Requests 1–3 are one feature seen from three sides: **the player cannot learn
anything from a turn they played.** They are the highest value items here.

---

## 1. `sub_subject_id` on the defender's copy of a resolution

**Today.** When Red attacks, Blue receives a `TEAM_ACTION_RESOLVED` with
`role: "target"`. It names the action and the attacking team, and nothing about
*what was attacked*:

```json
{
  "teamId": 2200000102, "teamName": "Blue Team",
  "actionId": 5000463839, "success": true, "status": "SUCCESS",
  "actionType": "attack", "actionName": "ATK_PROBE_ACCESS",
  "targetTeamId": 2200000102, "targetTeamName": "Blue Team",
  "turn": 3, "pointsAfter": 0, "pointsDelta": 0,
  "creditsAfter": 72, "actionCost": 0,
  "role": "target",
  "actorTeamId": 1100000102, "actorTeamName": "Red Team",
  "details": { "action": "attack", "action_type": "ATK_PROBE_ACCESS",
               "target": "Blue Team", "vote_total": 1 }
}
```

The attacker's own `SCENARIO_STEP_RESOLVED` for the same turn *does* carry the
target:

```json
{ "subject_id": "SUBJ_RED_INFRA", "sub_subject_id": "SS_RED_HOSPITAL",
  "scenario_id": "SCN_RED_HOSPITAL",
  "step_id": "STEP_RED_HOSPITAL_PROBE_ACCESS_01",
  "action_code": "ATK_PROBE_ACCESS", "result": "success", ... }
```

but that event is `scope: "TEAM"` for the attacking team, so the defender never
sees it.

**Why it matters.** The defender's screen can say "Red Team attacked you and
succeeded" and cannot say *which of their assets was hit*. Defending is
therefore a blind choice: the player has no way to learn where pressure is
being applied.

**Ask.** Add `sub_subject_id` (and, if cheap, `subject_id` and `scenario_id`) to
the `role: "target"` payload — the same values the attacker's
`SCENARIO_STEP_RESOLVED` already carries for that resolution.

---

## 2. Tell the attacker what the defender did

**Today.** The information is one-way. Across the full six-turn capture, Blue
(defender) receives a `role: "target"` event for every Red attack, while Red
receives **nothing at all** about Blue: Red's log contains two
`TEAM_ACTION_RESOLVED` events, both `role: "actor"`, and no event of any type
that mentions a Blue action.

> **Answered.** Shipped as `role: "counterparty"`. The placeholder is gone.

**Why it matters.** On the attacker's reveal screen we are currently forced to
print "نامشخص — سرور حرکت حریف را به تیم شما گزارش نمی‌دهد" ("unknown — the
server does not report the opponent's move to your team"). That is an honest
message about a broken loop: the entire teaching point of this game is that the
outcome depends on the opponent's choice, and the attacker is the one player who
can never see that choice.

**Ask.** After a turn resolves, send the attacking team an event naming the
defence the target team played that turn — the mirror of what the defender
already gets. Minimum useful payload:

```json
{ "turn": 3, "role": "counterparty",
  "opponentTeamId": 2200000102, "opponentTeamName": "Blue Team",
  "actionCode": "DEF_HARDEN_IDENTITY",
  "actionName_fa": "…",
  "success": false }
```

**Timing note.** This is safe to send only **after both teams have locked**, in
the `CALCULATION` phase, exactly like the existing resolution events. We
verified in the capture that resolutions arrive after voting closes, so no
information leaks into a live vote. Please keep that ordering — an earlier
delivery would let one team's choice influence the other's.

---

## 3. Report the probability that was actually rolled

**Today.** `availableActions` in `GAME_STATE_SNAPSHOT` exposes the odds *before*
the roll:

```json
{ "id": 5000463842, "code": "DEF_HARDEN_IDENTITY",
  "name": "Harden Identity and Access", "cost": 8,
  "baseProbability": 74, "currentProbability": 74,
  "canUse": false, "isLocked": false, "isOnCooldown": false,
  "cooldownTurnsRemaining": 0 }
```

but no resolution event carries any probability field. We grepped all four
captured logs: `probability` appears only inside `availableActions`, never in
`TEAM_ACTION_RESOLVED` or `SCENARIO_STEP_RESOLVED`.

**Why it matters.** The three moves on each side are tuned so that
probability × points is equal — that is the lesson the game exists to teach. A
player who fails a 90 % move and a player who fails a 30 % move currently see
the identical screen: "ناموفق". Without the applied probability on the
resolution we cannot show *why* a turn went the way it did, and we will not
invent the number.

**Ask.** On `TEAM_ACTION_RESOLVED` (actor copy), add:

- `baseProbability` — the action's configured chance;
- `appliedProbability` — the chance actually used for the roll, after counters,
  black-market modifiers and government effects;
- `counterActionCode` (nullable) — the opposing action that modified it, when
  one did;
- optionally `roll` — the value rolled, if you are willing to expose it.

If `appliedProbability` is out of scope, `baseProbability` alone still lets us
show the honest "you took a 30 % shot" line.

---

## 4. `opponentTeam` in the snapshot is the wrong team

**Today.** In Blue Team's own `GAME_STATE_SNAPSHOT`, `opponentTeam` is the
**Red Government**, not the Red player team:

```json
"opponentTeam": {
  "teamId": 1100000101, "teamName": "Red Government",
  "sideName": "Red", "role": "GOVERNMENT",
  "credits": 120, "points": 0,
  "status": { "isReady": false, "hasChosenAction": false, "actionVisible": false },
  "playerCount": 1, "connectedPlayerCount": 1, "activeEffects": []
}
```

while the team Blue is actually playing against is `1100000102` ("Red Team",
role `ATTACKER`).

**Why it matters.** Every "opponent" reading on the player screen — points,
credits, ready state, whether they have chosen — is about a team that is not in
the match. `points: 0` for a government that never scores looks like a tied game
when it is not. This one is a plain defect, not a feature request.

**Ask.** `opponentTeam` should resolve to the opposing team with the same
non-government role class as `myTeam` (ATTACKER ↔ DEFENCER). If the government
panel is wanted too, add it as a separate field such as `opponentGovernment`.

---

## 5. What does a defence "success" mean?

**Today.** Defences resolve on their own roll, independently of whether an
attack arrived. In the capture, Blue played `DEF_HARDEN_IDENTITY` on turns 1 and
4 and it resolved `failed` both times — including turn 1, a turn on which Red's
attack also failed. Meanwhile Blue's `role: "target"` copy of Red's turn-3
attack reads `"success": true`, because that field describes the **attacker's**
outcome, not the defender's.

So on the defender's screen the same word arrives twice in one turn with
opposite meanings: their own defence "failed" and the incoming attack
"succeeded".

**Ask.** Please state, in writing, what the engine means by each:

1. A defence resolving `success` — does it do anything on a turn with no
   incoming attack?
2. A defence resolving `failed` — is that just a lost roll, or does it leave the
   asset more exposed?
3. On the `role: "target"` copy, is `success` always attacker-relative?

We will word the Persian UI from your answer. Right now we are choosing the
wording by inference, which is how a screen ends up teaching the wrong rule.

---

## 6. Are counters actually applied?

`GET /client/game_state` pairs every action with a counter
(`ATK_PROBE_ACCESS` ↔ `DEF_HARDEN_IDENTITY`, and so on via `counterActionId`),
and the admin plan configures counter effectiveness. **We cannot verify from the
client that any of it changes a roll.** In the capture, `currentProbability`
always equals `baseProbability`, and there is no turn where the matching counter
was in play during its attack, so the logs neither prove nor disprove the
mechanic.

**Ask.** Confirm whether counter effectiveness modifies the attack's success
chance at resolution time, and if so, where that shows up. Request #3 would make
this visible to us — and to the players, who currently have no way to learn that
countering works.

---

## 7. `timeUnit` in the client game state

The new `time_unit` feature (`GET /admin/time-units`,
`game_config.time_unit`, `actions-history`) is fully wired on the admin side.
It cannot reach players, because **`/client/game_state` does not expose it.**
The `data.game` object of a live response contains:

```
id · gameId · phase · status · currentTurn · totalTurns · pointThreshold
winnerSideId · currentPhase · turnStatus · phaseStatus · serverTime
```

and no time unit. Both endpoints that do return it require an admin JWT, so the
player and government clients cannot reach them.

**Ask.** Add to `data.game` in `GET /client/game_state`:

```json
"timeUnit": { "key": "month", "name": "ماه" }
```

— the same object `POST /admin/configure_all` echoes and
`GET /api/games/{gameId}/actions-history` returns at the top level, with the
same `{"key":"day","name":"روز"}` fallback for games configured before the
field existed. Read-only, display only.

With it we can render «نوبت ۲ از ۶ · ماه دوم» on the player and government
screens. Without it we render nothing, because guessing the unit client-side
would be inventing data.

---

## 8. Persian display names in the client catalogs

**Today.** In `GET /client/game_state`, the action catalog carries the code and
an English label built from the code, and no Persian name at all:

```json
{ "id": 5000897846, "category": "attack",
  "name": "ATK_PROBE_ACCESS", "displayName": "Atk Probe Access",
  "cost": 8.0, "probability": 90.0, "counterActionId": 5000897849 }
```

Black-market items are worse — the code is used as the name:

```json
{ "id": 6000897846, "name": "BM_RED_RECON_DOSSIER", "cost": 20.0,
  "itemType": "attack_modifier", "effectType": "probability_increase" }
```

The server clearly holds the Persian name: `GET /api/games/{gameId}/actions-history`
returns `actionName_fa` for the same actions. Note also that `availableActions`
inside `GAME_STATE_SNAPSHOT` returns a *different*, better English label
(`"name": "Harden Identity and Access"`) than `/client/game_state`'s
`displayName` (`"Def Harden Identity"`) — the two endpoints disagree.

**Why it matters.** The player interface is Persian-only; a raw code or an
English label on a card is a defect by our own standards. We currently patch
this in the client with a token dictionary, which works for the demo plan and
silently breaks for any action an admin adds later.

**Ask.**

1. Add `displayName_fa` (or `name_fa`) to each entry in `actions` in
   `GET /client/game_state`, with the same value `actions-history` returns as
   `actionName_fa`.
2. Same for `blackMarketItems` — a real `name` and a `name_fa`, not the code.
3. Same for `availableActions` inside `GAME_STATE_SNAPSHOT`.
4. Align `displayName` between `/client/game_state` and `availableActions` so
   the two endpoints agree on the English label.

---

## Sources

| What | File |
|---|---|
| Red attacker SSE log, 6 turns | `red-success.txt`, game `1790173164872137442` |
| Blue defender SSE log, same game | `blue-success.txt` |
| Live client state | `GET /client/game_state`, game `1790229282688571413`, 2026-09-24 |
| Time-unit contract | backend guide *Time Units and Action Durations*, §1–§3 |
