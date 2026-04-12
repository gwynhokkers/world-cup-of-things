import { Resend } from 'resend'
import { and, eq, inArray } from 'drizzle-orm'
import { db, schema } from '@nuxthub/db'

const BATCH_SIZE = 100

export type RoundNotifyOutcome =
  | { kind: 'nextRound'; nextRound: number }
  | { kind: 'completed' }

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size))
  }
  return out
}

type NotifyRuntimeConfig = {
  resendApiKey: string
  resendFrom: string
  public: { siteUrl: string }
}

/**
 * Email everyone who voted in `closedRound` that the next round is open or the competition finished.
 * Failures are logged; does not throw (safe to call from waitUntil).
 */
export async function notifyRoundParticipantsAfterRoundClose(
  config: NotifyRuntimeConfig,
  baseUrl: string,
  args: {
    competitionId: number
    slug: string
    title: string
    closedRound: number
    outcome: RoundNotifyOutcome
  }
): Promise<void> {
  if (!config.resendApiKey) {
    if (import.meta.dev) {
      console.warn('[notifyRoundParticipants] NUXT_RESEND_API_KEY is not set; skipping emails.')
    }
    return
  }
  if (!config.resendFrom) {
    if (import.meta.dev) {
      console.warn('[notifyRoundParticipants] NUXT_RESEND_FROM is not set; skipping emails.')
    }
    return
  }

  const origin = baseUrl.replace(/\/$/, '')
  if (!origin) {
    console.warn('[notifyRoundParticipants] No base URL; skipping emails.')
    return
  }

  const voteRows = await db
    .select({ userId: schema.votes.userId })
    .from(schema.votes)
    .innerJoin(schema.matches, eq(schema.votes.matchId, schema.matches.id))
    .where(
      and(eq(schema.matches.competitionId, args.competitionId), eq(schema.matches.round, args.closedRound))
    )

  const userIds = [...new Set(voteRows.map((r) => r.userId))]
  if (userIds.length === 0) return

  const userRows = await db.select().from(schema.users).where(inArray(schema.users.id, userIds))

  const recipients = userRows.filter((u) => u.email && u.email.trim() !== '')
  if (recipients.length === 0) return

  const titleEsc = escapeHtml(args.title)
  const compUrl = `${origin}/comp/${encodeURIComponent(args.slug)}`

  let subject: string
  let leadHtml: string

  if (args.outcome.kind === 'completed') {
    subject = `"${args.title}" is complete — see the results`
    leadHtml = `<p>The final round of <strong>${titleEsc}</strong> is complete. Open the competition to see how it ended.</p>`
  } else {
    const nr = args.outcome.nextRound
    subject = `New round in "${args.title}"`
    leadHtml = `<p>Round ${args.closedRound} of <strong>${titleEsc}</strong> is closed. <strong>Round ${nr}</strong> is now open — cast your votes.</p>`
  }

  const resend = new Resend(config.resendApiKey)

  const batches = chunk(recipients, BATCH_SIZE)
  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b]!
    const payload = batch.map((user) => {
      const greeting = user.name?.trim() ? escapeHtml(user.name.trim()) : 'there'
      const html = `<!DOCTYPE html>
<html><body>
<p>Hi ${greeting},</p>
${leadHtml}
<p><a href="${compUrl}">View competition</a></p>
</body></html>`
      return {
        from: config.resendFrom,
        to: [user.email],
        subject,
        html
      }
    })

    const { error } = await resend.batch.send(payload, {
      idempotencyKey: `round-close-${args.competitionId}-${args.closedRound}-batch-${b}`
    })

    if (error) {
      console.error('[notifyRoundParticipants] Resend batch error:', error.message, error)
    }
  }
}
