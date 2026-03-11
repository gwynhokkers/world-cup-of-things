# AGENTS.md

## Cursor Cloud specific instructions

This is a **Nuxt 4** full-stack app ("World Cup of Things") using **Bun** as the package manager. It uses local SQLite (via NuxtHub) and local blob storage in dev mode — no external databases or Docker required.

### Key commands

| Task | Command |
|---|---|
| Install deps | `bun install` (also runs `nuxt prepare` via postinstall) |
| Dev server | `bun run dev` (serves on `http://localhost:3000`) |
| DB migrations | `bun run db:migrate` |
| Production build | `bun run build` |
| TypeScript check | `npx nuxi typecheck` |

### Gotchas

- **Nuxt 4 path aliases**: In server-side code (`server/`), use `~~/` (double tilde) to reference files relative to the project root. The single `~/` alias resolves to the `app/` directory, not the project root. For example, use `~~/server/utils/auth` not `~/server/utils/auth`.
- **Server routes vs server/api**: Custom server routes (like OAuth handlers) must live under `server/routes/` to be accessible at their URL path. Files in `server/api/` are mounted under `/api/`. Auth handlers are at `server/routes/auth/github.get.ts` and `server/routes/auth/google.get.ts`.
- **No ESLint or test framework**: The project has no lint or test scripts configured. TypeScript checking via `npx nuxi typecheck` has pre-existing type errors that do not block the dev server or build.
- **OAuth env var naming**: The `nuxt-auth-utils` module expects `NUXT_OAUTH_GITHUB_CLIENT_ID` and `NUXT_OAUTH_GITHUB_CLIENT_SECRET` (note the `_OAUTH_` prefix), not `NUXT_GITHUB_CLIENT_ID`. The `.env.example` uses the shorter names, but the module requires the `OAUTH` variant.
- **Session password**: `NUXT_SESSION_PASSWORD` must be at least 32 characters. A random hex string works.
- **Local data**: SQLite database and blob uploads are stored in the `.data/` directory at the project root.
- **DB migrations**: Run `bun run db:migrate` after first install and after schema changes. The migration must be applied before the dev server can serve API requests that touch the database.
