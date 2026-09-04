# Deployment and Environment Runbook

Everything needed to take this repository from a clone to a working production
deployment, and what to check first when it breaks.

Derived by reading the source on 2026-09-04 — every variable below was found by
grepping `process.env` across `apps/` and `packages/`, not copied from an older
document.

---

## 1. Environment variables

### `apps/web` — required everywhere

| Variable | Read by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_CLIENT_URL` | browser and server (12 call sites) | Base URL of the Python game server. The single most important value. |
| `GAME_API_URL` | server only | Same server, used by server-side code. Set it to the same value. |
| `NEXT_PUBLIC_SERVER_URL` | server only | Third fallback in the auth URL list. Set it or leave it unset; duplicates are de-duplicated. |

`apps/web/server/communication/auth.ts` builds its game-server URL list from all
three, in that order, removing duplicates. If none is set, every server-side
route fails with `GAME_SERVER_NOT_CONFIGURED`.

### `apps/web` — messaging storage

Pick **one** backend. The selector in `apps/web/server/communication/index.ts`
resolves in this order:

1. `COMMUNICATION_STORAGE` if set — `turso` (or `libsql`), `mongodb`, `sqlite`
2. otherwise `TURSO_DATABASE_URL` present → turso
3. otherwise `MONGODB_URI` or `MONGODB_HOST` present → mongodb
4. otherwise → sqlite

| Variable | Backend | Notes |
| --- | --- | --- |
| `COMMUNICATION_STORAGE` | all | `sqlite` locally, `turso` in production |
| `COMMUNICATION_SQLITE_PATH` | sqlite | Default `.data/communication.sqlite` |
| `TURSO_DATABASE_URL` | turso | `libsql://<db>-<org>.<region>.turso.io` |
| `TURSO_AUTH_TOKEN` | turso | Required unless the URL is `file:` |
| `MONGODB_URI` | mongodb | Full connection string |
| `MONGODB_HOST` / `MONGODB_PORT` | mongodb | Used to build a URI when `MONGODB_URI` is absent; port defaults to `27017` |
| `MONGODB_USER` *or* `MONGODB_USERNAME` | mongodb | Either name works — `MONGODB_USER` wins |
| `MONGODB_PASSWORD` | mongodb | A password without a user does nothing |
| `MONGODB_DB_NAME` | mongodb | Database name |

### `apps/web` — optional

| Variable | Default | Purpose |
| --- | --- | --- |
| `GAME_SERVER_TIMEOUT_MS` | `6000` | Deadline on each auth call to the game server |
| `NEXT_PUBLIC_ADMIN_APP_URL` | — | Link target on the docs page |
| `COMMUNICATION_ALLOW_PUBLIC_ANNOUNCEMENTS` | `false` | Server-side permission |
| `COMMUNICATION_ALLOW_PLAYER_ENEMY_MESSAGES` | `false` | Server-side permission |
| `NEXT_PUBLIC_COMMUNICATION_ALLOW_PUBLIC_ANNOUNCEMENTS` | `false` | The same permission, for the UI |
| `NEXT_PUBLIC_COMMUNICATION_MODE` | `server` | Set to `mock` only for isolated local UI work |

`VERCEL` and `NODE_ENV` are set by the platform. Together they decide whether
the SQLite guard trips — see §3.

### `apps/admin`

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CLIENT_URL` | Base URL of the Python game server |
| `NEXT_PUBLIC_PLAYER_APP_URL` | Link to the player app from the admin docs page |

> The admin app had **no `.env.example`** until 2026-09-04. One has been added.
> If you deployed admin before that date, check both values are actually set.

---

## 2. Local development

```bash
pnpm install
cp apps/web/.env.example   apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
# fill in NEXT_PUBLIC_CLIENT_URL in both
pnpm dev
```

Player on `:7009`, admin on `:7008`. Chat uses `node:sqlite` and needs no
separate service — the file is created on first use.

Requires **Node 24+**, because `node:sqlite` is not present on older runtimes.
If it is missing, the app fails with `COMMUNICATION_STORAGE_UNAVAILABLE` rather
than crashing.

---

## 3. Why local SQLite cannot be used in production

`sqliteRepository.ts` writes to a file on the local filesystem. On a serverless
host every invocation gets a **fresh, ephemeral container**, and two concurrent
requests can land on two different ones. Messages would be written to a file
that disappears, and two players would never see each other's chat.

`index.ts` therefore refuses it: when `process.env.VERCEL` is set or
`NODE_ENV === "production"`, selecting the sqlite backend throws
`COMMUNICATION_STORAGE_UNAVAILABLE` and logs a line naming the fix. This is
deliberate — silent data loss is worse than a loud failure.

---

## 4. Production setup — Turso

Turso is libSQL: the same SQLite schema and the same SQL, reached over HTTP
instead of the filesystem, which is what makes it work on serverless.

**Create the database** (the Turso Cloud CLI is not the `turso` package on npm —
that one is the local engine):

```bash
brew install tursodatabase/tap/turso     # or: curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
turso db create <name>
turso db show <name>                     # gives TURSO_DATABASE_URL
turso db tokens create <name>            # gives TURSO_AUTH_TOKEN
```

The database name and the hostname differ — the host embeds your org slug. Use
the name from `turso db list` for the CLI, and the URL from `turso db show`.

**Set three variables** in Vercel → Settings → Environment Variables, scoped to
Production (and Preview if you want chat there):

```
COMMUNICATION_STORAGE = turso
TURSO_DATABASE_URL    = libsql://<db>-<org>.<region>.turso.io
TURSO_AUTH_TOKEN      = <token>
```

**Then redeploy.** Vercel does not apply environment changes to deployments that
already exist.

You do not need to create the table. `tursoRepository.ts` runs
`CREATE TABLE IF NOT EXISTS` plus its indexes once per warm container, and the
bootstrap promise is cached so concurrent first requests share one round-trip.

Test the whole path locally before deploying: put the same three values in
`apps/web/.env.local` and send a message. Same code, same transport.

---

## 5. Function region

Server-side code calls the Python game server. If the function runs far from
that server — or somewhere it cannot reach at all — every server-side route
fails.

**Vercel defaults new projects to Washington, D.C. (`iad1`).**

On the **Hobby** plan you get **one region for the whole project**. Set it in
Settings → Functions → Function Regions, or with `vercel.json`:

```json
{ "$schema": "https://openapi.vercel.sh/vercel.json", "regions": ["fra1"] }
```

`vercel.json` is only read if it sits in the project's **Root Directory** — for
this monorepo that is `apps/web`. The dashboard setting is unambiguous and is
the safer choice.

> **Next.js `preferredRegion` per route is not honoured here.** It was tried and
> the deployment log still reported `iad1`. Use one of the two mechanisms above.

---

## 6. Troubleshooting

Every failure from the messaging route returns a JSON body shaped
`{ detail: { code, detail } }`. **Read `detail.code` first** — it identifies the
layer that failed, and saves guessing.

| `detail.code` | Status | Meaning | First thing to check |
| --- | --- | --- | --- |
| `GAME_SERVER_NOT_CONFIGURED` | 503 | No game-server URL in the environment | `NEXT_PUBLIC_CLIENT_URL` / `GAME_API_URL` are set for this environment |
| `GAME_SERVER_TIMEOUT` | 503 | The game server did not answer within `GAME_SERVER_TIMEOUT_MS` | The deployment region cannot reach the game server — see §7 |
| `GAME_SERVER_UNREACHABLE` | 503 | Connection refused, DNS or TLS failure | URL correctness, then the server itself |
| `AUTH_REQUIRED` | 401 | No `Authorization: Bearer` header | The caller is not signed in |
| `AUTH_INVALID` | 401 / 403 | The game server rejected the token, or the user is not in an active game | Sign in again; confirm the game is running |
| `COMMUNICATION_STORAGE_UNAVAILABLE` | 503 | No usable storage backend | `COMMUNICATION_STORAGE` and its credentials; on serverless, that sqlite is not selected |
| `COMMUNICATION_WRITE_FAILED` | 503 | Storage reachable, insert failed | Function logs — the underlying error is logged |
| `COMMUNICATION_READ_FAILED` | 503 | Storage reachable, query failed | Function logs |

**Duration is a diagnostic.** A configuration error throws in under 100 ms. A
run lasting exactly `GAME_SERVER_TIMEOUT_MS` is a hung network call, not a bad
variable. That distinction is what identified the outage in §7.

Codes such as `GOVERNMENT_TO_ENEMY_TEAM`, `PLAYER_MESSAGE_FORBIDDEN` and
`UNSAFE_SIMULATION_MESSAGE` are **policy rejections, not deployment faults** —
the message was understood and refused. They live in
`apps/web/server/communication/policy.ts`.

---

## 7. Known limitation — server-side reachability

**Every server-side API route in this repository authenticates by calling the
Python game server.** `resolveCommunicationActor` runs before any storage code
and posts the bearer token to `/client/game_state`.

The consequence: if the deployment region cannot reach `game.darkube.ir`, no
server-side route works — regardless of how correctly the database is set up.

This is easy to misdiagnose, because **the browser-side application keeps
working perfectly**. The browser talks to the game server directly and, when the
user is on the same network as that server, has no trouble. Only the serverless
function is blocked. The symptom is that everything works except chat.

Status as of 2026-09-04: unresolved. `iad1` timed out; a move to `fra1` was the
next thing to try. If no region can reach the game server, the fix is
architectural, not configuration — the messaging API has to run where it can
reach the game server, i.e. alongside it rather than on Vercel. The
`CommunicationRepository` interface is two methods, so moving it is cheap.

For a demo or a recording, running the whole stack locally sidesteps this
entirely.

---

## 8. Pre-deploy checklist

- [ ] `pnpm install` committed a lockfile change if `package.json` changed — Vercel installs with a frozen lockfile and **fails the build** on a mismatch
- [ ] `apps/web/.env.local` and `.env.production.local` are gitignored (they are; verify after any `.gitignore` edit)
- [ ] No token in `.env.example` — placeholders only
- [ ] The three Turso variables set for the right environment scope
- [ ] Function region set deliberately, not left at the default
- [ ] Redeployed *after* changing environment variables
- [ ] Sent one real message on the deployed site and got it back
