# Salvage

Code that is not wired into the app but is worth keeping for reference. Nothing
here is imported or built.

## `zod-plan-schemas.tsx.txt`

Was `apps/admin/tempt.txt` — a `GameConfigPage` component, saved as `.txt` so it
would not be compiled.

It is **not a duplicate of anything**. No file under `apps/admin/src` uses
`zodResolver`, yet `react-hook-form`, `@hookform/resolvers` and `zod` are all
installed dependencies of the admin app. This is an approach that was started and
abandoned.

What it contains that the current builder does not:

- `PlayerConfigSchema`, `ActionConfigSchema`, `BlackMarketItemSchema`,
  `ConfigureAllSchema`, `GameEventSchema` — zod schemas for the plan contract
- form-level validation with `react-hook-form` + `zodResolver`

The current builder edits the plan as **raw JSON in a textarea** and validates
only after the fact, with `validateDefaultGamePlanClientSide`. There are no
field-level inputs and no schema enforcement while typing.

So this file is a sketch of the thing `docs/decisions.md` records as deferred:
form fields for the common properties, with JSON as the escape hatch. If that
work is ever picked up, start here rather than from scratch.

Delete it once form-level editing exists, or once the approach is ruled out.

## `turn-analytics-response.json.txt`

Was `sample.txt` at the repository root — two captured responses from
`GET /api/games/{gameId}/admin/turn-analytics` on the live server.

Scanned on 2026-09-04: **no tokens, passwords or credentials.** Game data only,
plus a game id and the admin analytics URL it was fetched from.

Worth keeping because that endpoint is documented nowhere — not in
`docs/backend-integration.md`, not in `docs/backend-internals.md`, and not in
`docs/gameplay-api.md`, which lists it as an open gap. These two captures are
currently the only record of its response shape.

Fold it into `docs/gameplay-api.md` when the analytics endpoints get written up,
then delete it.
