import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'
import { voteOnCompetition } from '~/utils/abilities'
import { requireUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ matchId: number; entryId: number }>(event)
  if (body?.matchId == null || body?.entryId == null) {
    throw createError({ statusCode: 400, message: 'matchId and entryId required' })
  }

  const [match] = await db.select().from(schema.matches).where(eq(schema.matches.id, body.matchId))
  if (!match) throw createError({ statusCode: 404, message: 'Match not found' })

  const [competition] = await db.select().from(schema.competitions).where(eq(schema.competitions.id, match.competitionId))
  if (!competition) throw createError({ statusCode: 404 })
  if (competition.status !== 'open') throw createError({ statusCode: 400, message: 'Competition is not open for voting' })
  if (match.round !== competition.currentRound) throw createError({ statusCode: 400, message: 'This round is not open for voting' })
  if (body.entryId !== match.entryAId && body.entryId !== match.entryBId) {
    throw createError({ statusCode: 400, message: 'Invalid entry for this match' })
  }

  await authorize(event, voteOnCompetition, competition)

  const existing = await db
    .select()
    .from(schema.votes)
    .where(and(eq(schema.votes.matchId, body.matchId), eq(schema.votes.userId, user.id!)))
  if (existing.length > 0) throw createError({ statusCode: 409, message: 'Already voted in this match' })

  const [vote] = await db
    .insert(schema.votes)
    .values({ matchId: body.matchId, userId: user.id!, entryId: body.entryId })
    .returning()
  return vote
})
