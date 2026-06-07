# `@workspace/trpc`

Shared TypeScript wrappers for the Python Game Server API.

This package is aligned to the provided OpenAPI 3.1 contract:

- API title: `Python Game Server API`
- API version: `3.0.0`
- Source spec mirrored in `client.json`, `server.json`, and generated types in `openapi-types.ts`

## Contract Notes

- REST responses use an envelope shape with `success`, `data`, `timestamp`, and optional `error`.
- Player identity is `userId`; do not depend on a separate public `playerId`.
- Use `GET /client/game_state`, `GET /client/actions`, and `GET /client/targets` for client bootstrap.
- Use `status + currentPhase` for gameplay gating. The `phase` field is only the coarse lifecycle.
- SSE readiness is driven by connecting to `/api/games/{gameId}/events/stream`; there is no `/client/connect/{...}` endpoint in this contract.
- Directives are admin routes under `/admin/*`, for example `/admin/configure_directives`.

For exact path, operation, request, and response types, import from `openapi-types.ts`:

```ts
import type { components, paths } from "@workspace/trpc";
```
