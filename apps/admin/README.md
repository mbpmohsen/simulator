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

| Route | Purpose |
| --- | --- |
| `/admin/game-plan` | The scenario builder — 16 tabs, described below |
| `/admin/game-plan/graph` | The whole plan as one node graph |
| `/admin/ai` | AI assistant level ladder (also a tab in the builder) |
| `/admin/current-flow` | The published plan as a readable flow |
| `/monitoring` | «کنسول عملیات بازی» — live event stream, team readiness, active orders, game control |
| `/analytics` | Turn results, and actual play against optimal play |
| `/game`, `/configuration`, `/game-plan` | Older screens, superseded by the above |
| `/docs` | Facilitator documentation |

---

## The builder

`/admin/game-plan` edits a **draft** in browser state. Nothing reaches the server
until «اعتبارسنجی و انتشار». Load a starting point from the default scenario, the
demo scenario, the currently published plan, or a file.

Sixteen tabs, in four groups:

**Structure** — نمای کلی · اعضای تیم‌ها · اهداف · موضوع‌ها · زیرموضوع‌ها ·
سناریوها · گام‌ها

**Moves** — کنش‌ها · تعادل بازی · بازار سیاه

**Layers** — دولت‌ها · قوانین اثرگذاری · نمایش رویدادها

**Output** — گراف بازی · اعتبارسنجی و انتشار · دستیار هوشمند

Eight of these are collections edited through one generic `CollectionEditor`: a
searchable list on one side, and on the other a summary card plus a raw JSON
`<Textarea>`.

> **The JSON textarea is the editor, not a preview.** There are no field-level
> inputs — saving runs `JSON.parse`. The summary cards above it were added to
> make the values readable, not to replace it.

`CollectionSummary.tsx` builds those cards per collection: cost, probability,
points, and — for actions — the **equilibrium weight** from `buildEquilibrium`,
with a warning when the solver reports a move as dominated. That warning is the
only thing catching a plan that validates cleanly but is unplayable, because
validation does not check it.

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
- `docs/equilibrium-formulas.html` — what «تعادل بازی» computes
- `docs/deployment.md` — environment variables
