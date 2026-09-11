# Black Market — Endpoint Contract

**Status (2026-09-11): the list endpoint is LIVE. The purchase endpoint is not.**

`GET /client/player/black-market` was implemented and matches this contract
field-for-field, including `target_action_code` as a code rather than a numeric
id. Verified against the live OpenAPI schema.

`POST /client/player/black-market/{itemCode}/purchase` does **not** appear in the
schema. Until it exists the panel lists items and the buy button fails. Section 2
below is still a specification, not a description.

### One thing the implementation did better than this spec

`unavailable_reason` was specified here as Persian display text. The server
instead returns a **stable reason code** — `NOT_YET_AVAILABLE`,
`PER_TEAM_LIMIT_REACHED`, `OUT_OF_STOCK`, `INSUFFICIENT_CREDITS`,
`ALREADY_ACTIVE_NOT_STACKABLE` — which is the better design: the server stays
language-neutral and the client localizes. The client now maps these to Persian
in `PlayerBlackMarket.tsx`; **a new code added on the server needs a line added
there**, and falls back to a neutral sentence until it is.

Frontend: `apps/web/hooks/usePlayerBlackMarket.ts`,
`apps/web/components/v2/player/PlayerBlackMarket.tsx`.
Types: `BlackMarketItemView` and `BlackMarketPurchaseResponse` in
`packages/api/game-server/types.ts`.

---

## Why new endpoints are needed

`GET /client/game_state` already returns `blackMarketItems`, but that shape
cannot drive a usable UI:

| Needed | In `game_state` | Consequence |
| --- | --- | --- |
| `name_fa` | ✗ | the card shows English in a Persian RTL interface |
| `description` / `description_fa` | ✗ | no way to say what an item does |
| target as a **code** | `targetActionId` (number) | client must build an id→code map to name the target |
| availability | ✗ | client would have to re-implement `start_turn` / `max_purchases` rules |
| purchases already used | ✗ | cannot show what is left |

The last one is the important one. If the client derives availability itself, the
rule exists in two places and they drift. The server already owns the plan and
the purchase history, so it should decide and the client should render.

---

## 1. `GET /client/player/black-market`

Items available to the **calling player's team**, for the current turn.

Auth: `Authorization: Bearer <token>` — same as every other `/client/player/*`
endpoint.

### Response — `BlackMarketItemView[]`

A bare array, or the usual `{ success, data }` envelope. The client accepts both.

```jsonc
[
  {
    "code": "BM_RED_RECON_DOSSIER",   // required — the join key, from the plan
    "name": "Recon Dossier",           // required
    "name_fa": "پروندهٔ شناسایی",
    "description": "Raises the success chance of the blackout move for one turn.",
    "description_fa": "شانس موفقیت حرکت «قطعی» را برای یک نوبت بالا می‌برد.",

    "item_type": "attack_modifier",
    "item_type_fa": "اصلاح‌گر تهاجمی",

    "effect_type": "probability_increase",
    "effect_value": 12,

    "target_action_code": "ATK_BLACKOUT_SERVICE",  // code, NOT a numeric id
    "duration_turns": 1,

    "cost": 20,

    "available": true,
    "unavailable_reason": null,
    "purchases_used": 0,
    "max_purchases": 1
  }
]
```

### Field notes

| Field | Required | Notes |
| --- | --- | --- |
| `code` | ✅ | Straight from `black_market[].code` in the plan |
| `cost` | ✅ | Credits |
| `name` | ✅ | |
| `name_fa` | — | Omitting it means English text on a Persian screen |
| `description`, `description_fa` | — | Rendered under the title if present |
| `item_type`, `item_type_fa` | — | Shown as a small label |
| `effect_type` | — | The plan's own spelling is fine; the client maps known values to Persian and falls through to the raw string |
| `effect_value` | — | The number from `effect.value` |
| `target_action_code` | — | **Must be the action code**, so the client can resolve it to the Persian action name with the join it already does elsewhere |
| `duration_turns` | — | |
| `available` | ✅ | **Server's decision.** `false` greys the card and disables the button |
| `unavailable_reason` | — | A **stable code**, not display text. The client localizes it |
| `purchases_used`, `max_purchases` | — | Together they render «۱ خرید باقی‌مانده» |

Items the team may not see at all should simply be **omitted**, not returned
with `available: false`. Use `available: false` for something they can see but
cannot buy yet — that is the more useful teaching signal.

### Availability rules the server should apply

From `black_market[].availability` in the plan: `start_turn`, `end_turn`,
`max_purchases`. Plus whatever the engine enforces about side or role.

Affordability is the one thing the **client** checks, because it already has
`credits` from `/client/player/state` and can grey the button without a round
trip. The server must still reject an unaffordable purchase.

### Errors

| Status | When |
| --- | --- |
| 401 | missing or invalid token |
| 403 | caller is not a player in an active game |
| 404 | **currently returned — treated as "not built yet", panel stays hidden** |

Once implemented, a game with no black-market items should return `200 []`, not
404. An empty array renders «در این بازی آیتمی برای خرید تعریف نشده است».

---

## 2. `POST /client/player/black-market/{itemCode}/purchase`

No request body. The item is in the path, the team comes from the token.

Modelled on `POST /client/player/ai/purchase`, which already exists and does
almost exactly this.

### Response — `BlackMarketPurchaseResponse`

```jsonc
{
  "ok": true,
  "item_code": "BM_RED_RECON_DOSSIER",
  "cost": 20,
  "credits_after": 60,
  "turn": 3,
  "expires_turn": 4        // optional, when duration_turns applies
}
```

The client refetches the list after a successful purchase, so the response does
not need to carry the updated list.

### Errors

Any non-2xx surfaces its message to the player, so **the `detail` should be
Persian and specific**. Suggested codes:

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `BLACK_MARKET_ITEM_UNKNOWN` | no such code in this game |
| 402 / 400 | `INSUFFICIENT_CREDITS` | cost exceeds the team's credits |
| 403 | `BLACK_MARKET_NOT_AVAILABLE` | outside its turn window, or wrong side |
| 409 | `BLACK_MARKET_LIMIT_REACHED` | `max_purchases` already used |
| 409 | `BLACK_MARKET_WRONG_PHASE` | if purchasing is phase-restricted |

Whether purchasing is allowed in every phase or only some is **an open question
for you** — the client does not gate it today. If it is restricted, say so and
the gate will be added alongside `canSelectScenario` and `canVoteStep`.

---

## 3. Optional — active items

Not required for the first version, and not consumed by the client yet.

Knowing what is currently active on a team is genuinely useful — "your recon
dossier expires after this turn" is a good beat. If it is cheap, add to
`GET /client/player/state`:

```jsonc
"active_items": [
  { "item_code": "BM_RED_RECON_DOSSIER", "expires_turn": 4 }
]
```

---

## 4. How to verify it works

1. Publish a plan whose `black_market` array is non-empty — the demo plan has
   six items.
2. Sign in as a player and open `/player`.
3. The «بازار سیاه» panel appears in the right-hand column, under the move
   pattern panel.
4. Each card should show the Persian name, the cost, the effect, and the target
   move **by its Persian name** — not a code, and not an English string.
5. Buy one. Credits fall, the list refetches, and the remaining count drops.

If the panel does not appear, the endpoint is still returning 404 or a network
error — that is the deliberate silent path, not a frontend bug.

---

## 5. What the frontend will not do

- **It will not re-derive availability.** Whatever `available` says, it renders.
- **It will not resolve numeric action ids.** `target_action_code` must be a code.
- **It will not invent Persian text.** A missing `name_fa` shows the English
  `name`; a missing description shows nothing.
- **It will not retry a failed purchase.** One request per click.
