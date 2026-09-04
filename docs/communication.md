# Messaging Subsystem

`apps/web/server/communication/` — 1277 lines across eight files. The only
server-side code in this repository, and the only place it owns persistent data.

Derived by reading the source on 2026-09-04.

---

## 1. Shape

```
route.ts  →  resolveCommunicationActor()      auth.ts     who is calling
          →  CommunicationMessageService      service.ts  build + authorise
               ├─ parseCommunicationMessageInput()  policy.ts  schema
               ├─ validateCommunicationPermission() policy.ts  may they say this?
               └─ CommunicationRepository            storage
                    ├─ sqliteRepository    local dev
                    ├─ tursoRepository     production
                    └─ mongoRepository     alternative
```

| File | Lines | Owns |
| --- | --- | --- |
| `auth.ts` | 181 | Resolving a bearer token into a `CommunicationActor` |
| `policy.ts` | 258 | Input schema and who may send what to whom |
| `service.ts` | 87 | Assembling the message, game-access check |
| `types.ts` | 72 | The repository interface and `CommunicationHttpError` |
| `index.ts` | 92 | Backend selection and the serverless guard |
| `sqliteRepository.ts` | 181 | Local `node:sqlite` |
| `tursoRepository.ts` | 229 | Hosted libSQL over HTTP |
| `mongoRepository.ts` | 177 | MongoDB |

---

## 2. The repository interface

Deliberately tiny — two methods:

```ts
interface CommunicationRepository {
  create(message: CommunicationMessage): Promise<CommunicationMessage>;
  listVisible(query: CommunicationRepositoryQuery): Promise<CommunicationMessage[]>;
}
```

Everything else — validation, permissions, id generation, timestamps — happens in
`service.ts` and `policy.ts` **before** a repository is touched. A backend only
stores and filters. That is why swapping storage has twice been a contained
change rather than a rewrite.

A backend receives a fully-formed, already-authorised message. It must not
re-validate, and it must not apply its own policy beyond visibility filtering.

---

## 3. Backend selection

`index.ts` resolves in this order:

1. `COMMUNICATION_STORAGE` if set — `turso` / `libsql`, `mongodb`, `sqlite`
2. `TURSO_DATABASE_URL` present → turso
3. `MONGODB_URI` or `MONGODB_HOST` present → mongodb
4. otherwise → sqlite

Each backend is behind a **dynamic import**, so a deployment never resolves a
driver it does not use — `node:sqlite` in particular does not exist on every
runtime.

### The serverless guard

Selecting sqlite while `process.env.VERCEL` is set or `NODE_ENV === "production"`
throws `COMMUNICATION_STORAGE_UNAVAILABLE` and logs the fix.

This is intentional and must not be "helpfully" removed. SQLite writes to the
local filesystem; on a serverless host every invocation gets a fresh, ephemeral
container and two concurrent requests do not share a file. Messages would be
written and silently lost, and two players would never see each other's chat.
A loud failure beats silent data loss.

### The service is cached, failures are not

`getCommunicationMessageService()` memoises the service promise, but clears it on
rejection so the next request retries. `tursoRepository` does the same for its
client and schema bootstrap — the promise is cached so concurrent first requests
share one round-trip, and cleared on failure.

---

## 4. Visibility

The rule, identical in all three backends: a viewer sees a message if **any** of
these hold.

| Condition | Meaning |
| --- | --- |
| `sender_user_id = viewer.userId` | you always see your own |
| `audience.type = 'all'` | public announcements |
| `audience.type = 'team' AND audience.id = viewer.teamId` | your team's chat |
| `audience.type = 'side' AND audience.id = viewer.sideId` | your side |
| `audience.type = 'government' AND (audience.id IS NULL OR = viewer.teamId)` | only when `viewer.role = 'GOVERNMENT'` |

`role === "ADMIN"` bypasses the filter entirely and sees every message in the
game. Messages with `status = 'hidden'` are excluded for everyone.

> **The visibility clause is duplicated across three backends.** `visibilitySql`
> in `sqliteRepository.ts` and `tursoRepository.ts` is character-identical except
> for one type annotation (`unknown[]` vs `SqlArg[]`); `mongoRepository.ts`
> expresses the same rule as a Mongo `$or`. **A change to one must be mirrored in
> the other two**, or the stores enforce different policies and what a player
> sees depends on which database is configured.
>
> Verified identical on 2026-09-04. Re-check after any edit:
> ```bash
> cd apps/web/server/communication
> diff <(sed -n '/^const visibilitySql/,/^};$/p' sqliteRepository.ts) \
>      <(sed -n '/^const visibilitySql/,/^};$/p' tursoRepository.ts)
> ```

---

## 5. Authentication

`resolveCommunicationActor(request)` in `auth.ts`:

1. Require `Authorization: Bearer …`, else `AUTH_REQUIRED` (401).
2. `GET /client/game_state` on the game server with that token. On success, build
   the actor from `data.clientContext` — user id, team, side, role, game id,
   turn, phase.
3. If that fails or yields `userId === 0`, try `GET /admin/game_state` and build
   an ADMIN actor.
4. Otherwise `AUTH_INVALID` (401 or 403).

The game-server URL comes from `NEXT_PUBLIC_CLIENT_URL`, `GAME_API_URL`,
`NEXT_PUBLIC_SERVER_URL`, de-duplicated, tried in order.

Each fetch carries `AbortSignal.timeout(GAME_SERVER_TIMEOUT_MS)`, default
**6000 ms**. Failures are logged with the target URL and the error name, and
distinguished in the response: `GAME_SERVER_TIMEOUT` when a request aborted,
`GAME_SERVER_UNREACHABLE` otherwise.

> **This is the subsystem's hard dependency.** Authentication requires a
> server-to-server call. If the deployment region cannot reach the game server,
> nothing here works — while the browser-side app keeps working perfectly,
> because the browser reaches the game server directly. The symptom is that
> everything works except chat. See `docs/deployment.md` §7.

---

## 6. Policy

`policy.ts` runs after auth and before storage.

**Schema** (`parseCommunicationMessageInput`, zod): `body` is 1–1000 characters
after trimming; `body_fa` optional, max 1000; the `related_*` fields are
nullable strings capped at 250.

**Message types**: `TEAM_CHAT`, `GOVERNMENT_TO_OWN_TEAM`,
`GOVERNMENT_TO_ALLIED_SIDE`, `GOVERNMENT_TO_ENEMY_GOVERNMENT`,
`GOVERNMENT_TO_ENEMY_TEAM`, `PUBLIC_ANNOUNCEMENT`, `FAKE_NEWS_SIMULATION`,
`THREAT_SIMULATION`, `COACH_ADVICE`, `SYSTEM_EVENT_REFERENCE`.

**Audience types**: `team`, `side`, `government`, `all`, `admin`.

**Rejections** — all business rules, not faults:

| Code | Status |
| --- | --- |
| `INVALID_AUDIENCE` | 400 |
| `SIMULATION_AUDIENCE_INVALID` | 400 |
| `UNSAFE_SIMULATION_MESSAGE` | 400 |
| `ACTOR_CONTEXT_MISSING` | 403 |
| `PLAYER_TEAM_CHAT_FORBIDDEN` | 403 |
| `PLAYER_MESSAGE_FORBIDDEN` | 403 |
| `GOVERNMENT_MESSAGE_FORBIDDEN` | 403 |
| `GOVERNMENT_SIDE_FORBIDDEN` | 403 |
| `GOVERNMENT_TARGET_INVALID` | 403 |
| `GOVERNMENT_TARGET_OFF_SIDE` | 403 |
| `ENEMY_TEAM_TARGET_INVALID` | 403 |
| `PUBLIC_ANNOUNCEMENT_FORBIDDEN` | 403 |
| `GAME_ACCESS_FORBIDDEN` | 403 (from `service.ts`) |

Two permissions are environment-gated, both defaulting to off:
`COMMUNICATION_ALLOW_PUBLIC_ANNOUNCEMENTS` and
`COMMUNICATION_ALLOW_PLAYER_ENEMY_MESSAGES`.

### The abuse guard

`FAKE_NEWS_SIMULATION` and `THREAT_SIMULATION` exist so a game can include
deception and pressure. They are **not** a licence for real threats, so
`DISALLOWED_PERSONAL_ABUSE` blocks personal-violence patterns in both Persian and
English — «می‌کشمت», «پیدایت می‌کنم», «آدرس خانه», `kill you`, `find you`,
`home address` — with `UNSAFE_SIMULATION_MESSAGE` (400).

It is a small regex list and easy to evade; it is a guard rail, not a
content-moderation system. Keep both languages in sync when extending it.

---

## 7. The stored message

`service.ts` assembles it. Fields the client cannot set: `id` (`randomUUID()`),
`sender_*` (from the actor, never the request), `turn` and `phase` (from the
actor), `status` (`"delivered"`), `created_at` (ISO), and `simulation_label`
(true for the two simulation types).

`assertGameAccess` rejects a non-ADMIN actor whose `gameId` differs from the
request's with `GAME_ACCESS_FORBIDDEN` — a valid token for one game cannot read
another.

`normalizeAudience` drops `id` for `all` and `admin`, and coerces it to a number
otherwise. The SQL backends store it as text and the Mongo backend matches both
number and string, which is why `audience.id` comparisons look redundant there.

Storage schema (SQL backends):

```sql
communication_messages (
  id TEXT PRIMARY KEY, game_id TEXT NOT NULL, room_id TEXT,
  created_at TEXT NOT NULL, sender_user_id INTEGER NOT NULL,
  audience_type TEXT NOT NULL, audience_id TEXT,
  status TEXT NOT NULL, message_json TEXT NOT NULL
)
```

The full message is kept as JSON in `message_json`; the columns exist only for
filtering and ordering. Rows are ordered `created_at ASC, id ASC`, capped at the
request's `limit` (clamped to 1–200 in the route, default 100).

---

## 8. Adding a fourth backend

1. Implement `CommunicationRepository` — two methods.
2. Reproduce the visibility rule from §4 exactly, in that store's query language.
3. Add a branch to `selectBackend()` and a dynamic import in `createRepository()`.
4. Throw `CommunicationHttpError` with the existing codes, never raw errors —
   the route maps `CommunicationHttpError` to its status and leaks nothing else.
5. Log the underlying error with `console.error` before throwing; the Persian
   message reaches the user, the real cause reaches the logs.
6. Document the new environment variables in `apps/web/.env.example` and
   `docs/deployment.md`.

---

## 9. Known weaknesses

- **The visibility rule is written three times.** Extracting it into one
  declarative structure that each backend compiles would remove a whole class of
  bug. Not done because the three query languages differ enough that a shared
  abstraction risks being worse than the duplication.
- **The abuse guard is a short regex list**, trivially evaded, covering only two
  languages.
- **No rate limiting.** Nothing stops a client posting continuously.
- **`listVisible` has no pagination beyond `limit` and `since`.** A long game
  with a chatty team will re-fetch a growing window.
- **Server-side auth on every request.** No caching of the resolved actor, so
  each poll costs a round-trip to the game server — and inherits its latency and
  its reachability.
