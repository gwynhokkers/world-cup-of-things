# Deploying World Cup of Things (NuxtHub + Cloudflare)

## Prerequisites

- Cloudflare account
- GitHub or Google OAuth app (for auth)

## 1. Cloudflare resources

1. **D1 database**: In Cloudflare dashboard → Workers & Pages → D1 → Create database. Note the **Database ID**.
2. **R2 bucket**: R2 → Create bucket. Note the **bucket name**.

## 2. Environment variables

Set in your Cloudflare project (or `.env` for local):

- **`NUXT_SESSION_PASSWORD`** — at least 32 characters (session cookie encryption). Required for login to work.
- **GitHub login**: `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` (from your [GitHub OAuth App](https://github.com/settings/developers)). If your build doesn’t have access to secrets, use **`NUXT_OAUTH_GITHUB_CLIENT_ID`** and **`NUXT_OAUTH_GITHUB_CLIENT_SECRET`** so Nuxt picks them up at runtime.
- **Google login**: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (or `NUXT_OAUTH_GOOGLE_CLIENT_ID` / `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` for runtime).
- **Production only**: `NUXT_HUB_CLOUDFLARE_DATABASE_ID`, `NUXT_HUB_CLOUDFLARE_BUCKET_NAME`.
- **Optional**: `ADMIN_GITHUB_IDS` — comma-separated GitHub user IDs that get the admin role.

## 3. Nuxt config (production)

`nuxt.config.ts` already uses `$production` to set:

- `hub.db` with `driver: 'd1'` and `connection.databaseId` from `NUXT_HUB_CLOUDFLARE_DATABASE_ID`.
- `hub.blob` with `driver: 'cloudflare-r2'` and `bucketName` from `NUXT_HUB_CLOUDFLARE_BUCKET_NAME`.

Ensure those env vars are set in your Cloudflare Workers/Pages environment.

## 4. D1 migrations

Migrations are in `server/db/migrations/sqlite/`. On Cloudflare, migrations do **not** run during build. Apply them before or after deploy.

**Apply all unapplied migrations (recommended):**

```bash
# Production and preview (NuxtHub expects binding name DB in wrangler.jsonc)
bunx wrangler d1 migrations apply DB --remote --env production
bunx wrangler d1 migrations apply DB --remote --env preview
```

This uses the `migrations_dir` and `migrations_table` from `wrangler.jsonc`, applies migrations in order, and records them so only new ones run next time. In CI/non-interactive runs, the confirmation step is skipped.

**If a migration fails with "table already exists":** the schema was applied earlier (e.g. via a manual `d1 execute --file=...`) but the migrations table doesn’t know it. Mark that migration as applied, then run `migrations apply` again:

```bash
# Mark the migration as applied (replace with the failing migration name, e.g. 0002_users.sql)
bunx wrangler d1 execute DB --remote --env production --command "INSERT INTO _hub_migrations (name) VALUES ('0002_users.sql');"

# Then apply any remaining migrations
bunx wrangler d1 migrations apply DB --remote --env production
```

**Manual single-file fallback** (only if you need to run one file by hand):

```bash
bunx wrangler d1 execute DB --remote --env production --file=./server/db/migrations/sqlite/0001_initial.sql
```

**Local development:** `bun run db:migrate` applies migrations to the local SQLite DB (e.g. `.data/`).

## 5. Deploy

- **Cloudflare Pages**: Connect the repo; build command `bun run build`; output directory `.output/public`; root `.`.
- **Cloudflare Workers**: Use the NuxtHub preset so Nitro outputs a Worker; set the env vars and D1/R2 bindings as required by NuxtHub.

After deploy, set the same env vars in the Cloudflare dashboard for the project.

## 6. OAuth callback URLs

In your GitHub and Google OAuth app settings, set the callback URL to your **live** site (not localhost):

- **GitHub**: Authorized callback URL: `https://<your-production-domain>/auth/github`
- **Google**: Authorized redirect URI: `https://<your-production-domain>/auth/google`

The value must match exactly (including `https` and no trailing slash), or token exchange will fail and login will return 500.

---

**If login still returns 500:** check your Cloudflare Worker/Pages logs:
- **`[nuxt-hub] DB binding not found`** — D1 must be bound as `DB` in wrangler (see above); production and preview both use `"binding": "DB"`.
- **`Empty password`** (on `/api/_auth/session`) — set **`NUXT_SESSION_PASSWORD`** in the Cloudflare project (at least 32 characters). Without it, sessions cannot be created.
- Other errors: the line after `[auth/github] OAuth error:` shows the cause (e.g. callback URL mismatch, missing GitHub env vars). In local dev, the 500 page shows the message.
