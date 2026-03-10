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
- **No ESLint or test framework**: The project has no lint or test scripts configured. TypeScript checking via `npx nuxi typecheck` has pre-existing type errors that do not block the dev server or build.
- **OAuth required for auth flows**: Login requires real GitHub or Google OAuth credentials in `.env`. Without them, the homepage loads but authentication endpoints return 404. Set `NUXT_GITHUB_CLIENT_ID`, `NUXT_GITHUB_CLIENT_SECRET` (and/or Google equivalents) for full functionality.
- **Session password**: `NUXT_SESSION_PASSWORD` must be at least 32 characters. A random hex string works.
- **Local data**: SQLite database and blob uploads are stored in the `.data/` directory at the project root.
