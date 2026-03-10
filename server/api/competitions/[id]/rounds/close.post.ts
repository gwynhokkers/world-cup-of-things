import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'
import { closeRound } from '~/utils/abilities'
import { requireUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 404 })
  const compId = parseInt(id, 10)
  if (Number.isNaN(compId)) throw createError({ statusCode: 404 })

  const [competition] = await db.select().from(schema.competitions).where(eq(schema.competitions.id, compId))
  if (!competition) throw createError({ statusCode: 404, message: 'Competition not found' })

  await authorize(event, closeRound, competition)

  const currentRound = competition.currentRound
  const matches = await db
    .select()
    .from(schema.matches)
    .where(eq(schema.matches.competitionId, compId))
    .orderBy(schema.matches.matchIndex)

  const roundMatches = matches.filter((m) => m.round === currentRound)
  if (roundMatches.length === 0) throw createError({ statusCode: 400, message: 'No matches in current round' })

  // Compute winner per match from votes (majority)
  for (const match of roundMatches) {
    const rows = await db.select().from(schema.votes).where(eq(schema.votes.matchId, match.id))
    const tally: Record<number, number> = {}
    for (const r of rows) {
      tally[r.entryId] = (tally[r.entryId] ?? 0) + 1
    }
    const winnerEntryId =
      Object.entries(tally).length > 0
        ? Number(Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0])
        : null
    await db.update(schema.matches).set({ winnerId: winnerEntryId }).where(eq(schema.matches.id, match.id))
  }

  const totalRounds = Math.log2(roundMatches.length * 2)
  const nextRound = currentRound + 1
  if (nextRound > totalRounds) {
    await db.update(schema.competitions).set({ status: 'completed', currentRound: nextRound - 1 }).where(eq(schema.competitions.id, compId))
  } else {
    // Create next round matches from winners (re-read to get winnerId)
    const updatedRoundMatches = await db
      .select()
      .from(schema.matches)
      .where(and(eq(schema.matches.competitionId, compId), eq(schema.matches.round, currentRound)))
      .orderBy(schema.matches.matchIndex)

    const winners = updatedRoundMatches.map((m) => m.winnerId).filter(Boolean) as number[]
    for (let i = 0; i < winners.length; i += 2) {
      if (winners[i] != null && winners[i + 1] != null) {
        await db.insert(schema.matches).values({
          competitionId: compId,
          round: nextRound,
          matchIndex: i / 2 + 1,
          entryAId: winners[i],
          entryBId: winners[i + 1]
        })
      }
    }
    await db
      .update(schema.competitions)
      .set({ currentRound: nextRound })
      .where(eq(schema.competitions.id, compId))
  }

  const updated = await db.select().from(schema.competitions).where(eq(schema.competitions.id, compId))
  return updated[0]
})
