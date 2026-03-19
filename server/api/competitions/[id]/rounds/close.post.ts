import { db, schema } from '@nuxthub/db'
import { eq, and, inArray } from 'drizzle-orm'
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

  const roundMatchIds = roundMatches.map((m) => m.id)
  const voteRows = await db
    .select({ matchId: schema.votes.matchId })
    .from(schema.votes)
    .where(inArray(schema.votes.matchId, roundMatchIds))
  const voteCountByMatchId: Record<number, number> = {}
  for (const mid of roundMatchIds) voteCountByMatchId[mid] = 0
  for (const r of voteRows) voteCountByMatchId[r.matchId] = (voteCountByMatchId[r.matchId] ?? 0) + 1
  const matchWithNoVotes = roundMatches.find((m) => (voteCountByMatchId[m.id] ?? 0) === 0)
  if (matchWithNoVotes) {
    throw createError({
      statusCode: 400,
      message: 'Every match in this round must have at least one vote before closing'
    })
  }

  // Compute winner per match from votes (majority; ties broken at random)
  for (const match of roundMatches) {
    const rows = await db.select().from(schema.votes).where(eq(schema.votes.matchId, match.id))
    const tally: Record<number, number> = {}
    for (const r of rows) {
      tally[r.entryId] = (tally[r.entryId] ?? 0) + 1
    }
    let winnerEntryId: number | null = null
    if (Object.entries(tally).length > 0) {
      const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1])
      const maxCount = sorted[0][1]
      const tiedIds = sorted.filter(([, count]) => count === maxCount).map(([entryId]) => Number(entryId))
      winnerEntryId = tiedIds.length === 1 ? tiedIds[0]! : tiedIds[Math.floor(Math.random() * tiedIds.length)]!
    }
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
