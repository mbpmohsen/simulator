# Admin — Facilitator Console

The console a facilitator uses to build a scenario, publish it, run the live
game and read the results afterwards. Next.js App Router, Persian and RTL
throughout.

```bash
pnpm --filter admin dev     # http://localhost:7008
```

Needs `NEXT_PUBLIC_CLIENT_URL` pointing at the Python game server. Copy
`.env.example` to `.env.local`.

`/` redirects to `/admin/game-plan`.

---

## Routes

Every route below sits behind one sign-in (`AdminShell` = `AdminAuthGate` +
`AdminNav`) and shares one navigation bar.

| Route | Nav label | Purpose |
| --- | --- | --- |
| `/admin/game-plan` | تنظیم بازی | The scenario builder — 7 tabs, described below |
| `/admin/current-flow` | نسخهٔ منتشرشده | The published plan as a read-only graph |
| `/monitoring` | پایش بازی | Live event stream, team readiness, active orders, game control |
| `/analytics` | تحلیل بازی | Turn results, and actual play against optimal play |
| `/admin/ai` | دستیار هوشمند | AI assistant levels (also a tab in the builder) |
| `/docs` | راهنما | Facilitator documentation |

---

## The builder

`/admin/game-plan` edits a **draft** in browser state. Nothing reaches the server
until «بررسی و انتشار». Load a starting point from the default scenario, the
demo scenario, the currently published plan, or a file.

Seven tabs:

نمای کلی · اعضای تیم‌ها · کنش‌ها · اهداف و سناریوها · تنظیمات پیشرفته ·
بررسی و انتشار · دستیار هوشمند

- **کنش‌ها** (`components/builder/Arsenal.tsx`) — actions as forms, the
  attack × defence counter matrix, and the black market.
- **اهداف و سناریوها** (`components/builder/CampaignMap.tsx`) — the goal →
  subject → sub-subject → scenario tree with an inspector. Children are created
  from their parent, removal shows and cascades what goes with it, and renaming
  an id rewrites every reference. Checklist scenarios edit their steps as a
  action × uses grid (`StepGrid.tsx`).
- **تنظیمات پیشرفته** — the game's time unit, governments and event visibility
  (read-only), and impact rules. The time unit
  (`components/builder/TimeUnitField.tsx`) answers "how long is one turn in the
  story?" — one turn is exactly one unit, so six turns with «ماه» is a six-month
  campaign. Its catalogue comes from `GET /admin/time-units`: the Persian `name`
  is displayed, the `key` is submitted, and the server's order is never
  re-sorted. **It is required by `configure_all`** — publishing without it
  fails with a 422, so `validateLocally` raises it as a clickable issue first.
  It is kept away from the second-based phase durations on purpose: it is a
  narrative label, not a countdown.

Structural edits live in `packages/api/game-plan/structure.ts` and are tested in
`structure.test.ts`. Validation re-runs on every edit and is always visible in a
status bar; each issue links to the item it is about.

Raw JSON is still available for every record, behind a «ویرایش JSON» button.

> **No equilibrium check in the builder.** It was removed by decision. After
> changing action numbers, run `packages/api/game-plan/equilibrium.test.ts` or
> call `buildEquilibrium` directly — nothing in the UI will flag a dominated
> move.

---

## Monitoring

`/monitoring` is the console to run a live session from: the event stream, team
readiness, active government orders, a catalogue view, and **game control** —
start, pause, resume, reset, clear events, clear directives.

> **Pause and resume are what make a solo recording possible.** A turn is 110
> seconds with 40-second phases, which is impossible to drive across five browser
> windows. Paused, the clock stops.

---

## Analytics

Turn-by-turn results, plus `EquilibriumComparison` — what each team actually
played against what the equilibrium says was optimal, with a total-variation
distance badge. It reads the stored plan draft rather than the published plan,
because the published-plan endpoint is not reachable from this screen.

`ActionDurations` (`components/ActionDurations.tsx`) reads
`GET /api/games/{gameId}/actions-history`: one row per (team, action) with how
long it took, counted from first attempt to last success inclusively and
labelled in the game's time unit. It works for finished games too — it reads
from storage — so it is the after-action view, not a live monitor.

> **`failures` is not "lost rolls".** Attempts rejected before execution —
> not enough credits, no target, banned by a directive — are counted inside
> `failures`, and the server offers no field separating them. The table says so
> above itself, because an admin who reads three failures as three unlucky rolls
> draws the wrong conclusion about the balance. Government interventions do not
> appear here at all.
>
> A row in progress reports `duration: null`, rendered as «در جریان» and never
> as zero.

---

## Layout notes

The interface is `dir="rtl"` throughout. Numbers are rendered with
`toLocaleString("fa-IR")`. Shared components come from `@workspace/ui`, and all
API access goes through `@workspace/trpc` — this app defines no HTTP client of
its own.

---

## Further reading

- `docs/game-plan-model.md` — every field of the contract the builder produces
- `docs/demo-scenario.md` — why the demo numbers are what they are, and the
  checklist for changing them
- `docs/equilibrium-formulas.html` — the equilibrium formulas used by «تحلیل بازی»
- `docs/deployment.md` — environment variables
