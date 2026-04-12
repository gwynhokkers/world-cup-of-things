# Email notifications (Resend)

Round-close emails use [Resend](https://resend.com) from the server. They are **transactional**: when a competition owner successfully closes a round, every user who **voted in that round** can receive one email describing what happened next.

## When emails are sent

Emails run **after** the database updates for closing the round succeed. The HTTP response to “close round” returns immediately; sending is scheduled so it does not block the client for long.

| Outcome | Message |
|--------|---------|
| Another round exists | Recipients are told the next round number is open and are linked to the competition page. |
| Final round just closed | Recipients are told the competition is complete and are linked to see results. |

**Who receives mail:** distinct users with at least one vote on **any match in the round that was closed** (joined via `votes` → `matches` for that competition and round). Users must have a non-empty `email` on the `users` table (from OAuth signup).

**When nothing is sent:** no API key / no `from` address (see below), no voters in that round, or no eligible user rows. In development, missing Resend configuration logs a warning and skips sending.

## Configuration

Set these in `.env` locally and in your Cloudflare / NuxtHub project for production:

| Variable | Purpose |
|----------|---------|
| `NUXT_RESEND_API_KEY` | Resend API key (`re_...`). |
| `NUXT_RESEND_FROM` | Sender string Resend accepts, e.g. `App Name <notify@yourdomain.com>`. Must use a [verified domain](https://resend.com/docs/dashboard/domains/introduction) in production. |
| `NUXT_PUBLIC_SITE_URL` | Public site origin without a trailing slash, e.g. `https://your-domain.com`. Used for “View competition” links. If unset, the server falls back to the **current request origin** (fine for local dev, not for background-only contexts). |

See also the environment variable list in [DEPLOY.md](./DEPLOY.md).

## Implementation overview

- **Trigger:** `POST` handler that closes a round — [`server/api/competitions/[id]/rounds/close.post.ts`](../server/api/competitions/[id]/rounds/close.post.ts).
- **Notification logic:** [`server/utils/notifyRoundParticipants.ts`](../server/utils/notifyRoundParticipants.ts) — loads voters, builds HTML, calls Resend’s **batch** API (up to 100 messages per request, multiple batches if needed). Each batch uses an **idempotency key** derived from competition id, closed round, and batch index to reduce duplicate sends on retries.
- **Scheduling:** [`server/utils/runAfterResponse.ts`](../server/utils/runAfterResponse.ts) — on Cloudflare, uses `event.context.cloudflare.waitUntil` when available so work can continue after the response; otherwise the promise is fired without blocking.

Sending failures are **logged** only; they do **not** roll back the round or return an error to the owner (the competition state is already committed).

## Cloudflare

The app targets **Cloudflare Workers** via NuxtHub. Resend is called over HTTPS from the Worker; no extra binding is required beyond env vars. If `waitUntil` is not attached to `event.context.cloudflare` in a given preset, email still runs as a non-blocking `void` promise on the same isolate (typical in local dev).

## Testing

1. Configure `NUXT_RESEND_API_KEY` and `NUXT_RESEND_FROM` (Resend’s docs cover testing with approved senders).
2. Ensure at least one logged-in user has voted in every match of the current round (required to close the round).
3. Close the round from the UI as the competition owner.
4. Confirm delivery in the [Resend dashboard](https://resend.com/emails) and that the link opens `/comp/<slug>` on the URL you expect.

## Future improvements (not implemented)

Examples: per-user opt-out, unsubscribe links, queuing for very large voter counts, or notifications when a competition starts.
