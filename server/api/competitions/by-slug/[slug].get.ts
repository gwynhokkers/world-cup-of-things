import { db, schema } from '@nuxthub/db'
import { eq, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 404, message: 'Not found' })

  const [competition] = await db.select().from(schema.competitions).where(eq(schema.competitions.slug, slug))
  if (!competition) throw createError({ statusCode: 404, message: 'Competition not found' })

  const entriesList = await db
    .select()
    .from(schema.entries)
    .where(eq(schema.entries.competitionId, competition.id))
    .orderBy(schema.entries.seed)

  const matchesList = await db
    .select()
    .from(schema.matches)
    .where(eq(schema.matches.competitionId, competition.id))
    .orderBy(schema.matches.round, schema.matches.matchIndex)

  let voteCountByMatchId: Record<number, number> | undefined
  if (competition.status === 'open' && matchesList.length > 0) {
    const currentRoundMatchIds = matchesList.filter((m) => m.round === competition.currentRound).map((m) => m.id)
    if (currentRoundMatchIds.length > 0) {
      const voteRows = await db
        .select({ matchId: schema.votes.matchId })
        .from(schema.votes)
        .where(inArray(schema.votes.matchId, currentRoundMatchIds))
      voteCountByMatchId = {}
      for (const mid of currentRoundMatchIds) voteCountByMatchId[mid] = 0
      for (const r of voteRows) voteCountByMatchId[r.matchId] = (voteCountByMatchId[r.matchId] ?? 0) + 1
    }
  }

  return {
    ...competition,
    entries: entriesList,
    matches: matchesList,
    ...(voteCountByMatchId !== undefined && { voteCountByMatchId })
  }
})
