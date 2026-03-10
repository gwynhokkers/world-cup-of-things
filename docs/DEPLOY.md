# Deploying World Cup of Things (NuxtHub + Cloudflare)

## Prerequisites

- Cloudflare account
- GitHub or Google OAuth app (for auth)

## 1. Cloudflare resources

1. **D1 database**: In Cloudflare dashboard → Workers & Pages → D1 → Create database. Note the **Database ID**.
2. **R2 bucket**: R2 → Create bucket. Note the **bucket name**.

## 2. Environment variables

Set in your Cloudflare project (or `.env` for local):

- `NUXT_SESSION_PASSWORD` — at least 32 characters (session cookie encryption).
- `NUXT_GITHUB_CLIENT_ID` / `NUXT_GITHUB_CLIENT_SECRET` (if using GitHub login).
- `NUXT_GOOGLE_CLIENT_ID` / `NUXT_GOOGLE_CLIENT_SECRET` (if using Google login).
- **Production only**: `NUXT_HUB_CLOUDFLARE_DATABASE_ID`, `NUXT_HUB_CLOUDFLARE_BUCKET_NAME`.

## 3. Nuxt config (production)

`nuxt.config.ts` already uses `$production` to set:

- `hub.db` with `driver: 'd1'` and `connection.databaseId` from `NUXT_HUB_CLOUDFLARE_DATABASE_ID`.
- `hub.blob` with `driver: 'cloudflare-r2'` and `bucketName` from `NUXT_HUB_CLOUDFLARE_BUCKET_NAME`.

Ensure those env vars are set in your Cloudflare Workers/Pages environment.

## 4. D1 migrations

Migrations are in `server/db/migrations/sqlite/`. On Cloudflare, migrations do **not** run during build. Apply them before or after deploy:

```bash
# Using Wrangler (replace <database-id> with your D1 Database ID)
bunx wrangler d1 execute <database-id> --remote --file=./server/db/migrations/sqlite/0001_initial.sql
```

Or use the NuxtHub CLI when available:

```bash
bun run db:migrate
```

## 5. Deploy

- **Cloudflare Pages**: Connect the repo; build command `bun run build`; output directory `.output/public`; root `.`.
- **Cloudflare Workers**: Use the NuxtHub preset so Nitro outputs a Worker; set the env vars and D1/R2 bindings as required by NuxtHub.

After deploy, set the same env vars in the Cloudflare dashboard for the project.

## 6. OAuth callback URLs

- **GitHub**: Authorized callback URL: `https://your-domain.com/auth/github`.
- **Google**: Authorized redirect URI: `https://your-domain.com/auth/google`.

Use your production URL in both.
