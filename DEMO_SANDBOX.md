# Demo sandbox

Public visitors can sign in with a dedicated **demo ITS**; the app stores their session JWT with a `demo` claim and routes all MongoDB reads/writes to a **separate database** (`MONGODB_DEMO_DB`, default `fmb_demo`). Production data stays in `MONGODB_DB` (default `fmb`).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DEMO_ITS` | ITS number that triggers demo DB login (must match user in demo DB) |
| `DEMO_PASSWORD` | Password for demo user (hashed in DB; must match at login) |
| `DEMO_ADMIN_NAME` | Optional display name (default `Demo Admin`) |
| `DEMO_CONTACT` | Optional contact string on user record |
| `MONGODB_DEMO_DB` | Demo database name (default `fmb_demo`) |
| `MONGODB_DB` | Production database (default `fmb`) |
| `RESET_DEMO_SECRET` | Bearer token for `POST /api/cron/reset-demo` |
| `DEMO_HIDE_LOGIN_HINT` | Set to `true` to hide the suggested demo ITS/password on `/login` (hint shows by default when `DEMO_ITS` and `DEMO_PASSWORD` are set) |

## First-time setup (demo database)

Option A — full reset (drops `MONGODB_DEMO_DB` and re-seeds user, stores, ingredients):

```bash
npm run reset:demo
```

Option B — upsert demo admin only (then seed stores + ingredients yourself):

```bash
npm run seed:demo
MONGODB_DB=fmb_demo npm run seed:stores
MONGODB_DB=fmb_demo npm run seed:ingredients
```

(`seed:stores` / `seed:ingredients` use `MONGODB_DB`; point them at the demo DB name you use.)

## Scheduled reset (production)

Call the API on a timer (e.g. Netlify scheduled function, GitHub Actions, or cron-job.org):

```http
POST /api/cron/reset-demo
Authorization: Bearer <RESET_DEMO_SECRET>
```

Demo sessions use a shorter cookie/JWT lifetime (`DEMO_SESSION_MAX_AGE_SECONDS`, default 1 hour).

## Notes

- Concurrent demo users share the same sandbox database until the next reset.
- Use an ITS value for `DEMO_ITS` that is **not** used in production `fmb`, so logins are unambiguous.
