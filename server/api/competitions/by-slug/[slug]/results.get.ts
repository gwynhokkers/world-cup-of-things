import { db, schema } from '@nuxthub/db'
import { eq, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 404, message: 'Not found' })

  const [competition] = await db.select().from(schema.competitions).where(eq(schema.competitions.slug, slug))
  if (!competition) throw createError({ statusCode: 404, message: 'Competition not found' })
  if (competition.status !== 'completed') {
    throw createError({ statusCode: 404, message: 'Results are not available yet' })
  }

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

  const matchIds = matchesList.map((m) => m.id)
  if (matchIds.length === 0) {
    return {
      ...competition,
      entries: entriesList,
      matches: matchesList,
      voteDetails: []
    }
  }

  const votesList = await db
    .select({
      matchId: schema.votes.matchId,
      userId: schema.votes.userId,
      entryId: schema.votes.entryId
    })
    .from(schema.votes)
    .where(inArray(schema.votes.matchId, matchIds))

  const userIds = [...new Set(votesList.map((v) => v.userId))]
  const usersList =
    userIds.length > 0
      ? await db
          .select({
            id: schema.users.id,
            name: schema.users.name,
            image: schema.users.image
          })
          .from(schema.users)
          .where(inArray(schema.users.id, userIds))
      : []
  const usersById = new Map(usersList.map((u) => [u.id, u]))

  const voteDetailsByMatch = new Map<
    number,
    Array<{ entryId: number; count: number; voters: Array<{ userId: string; name: string | null; image: string | null }> }>
  >()
  for (const m of matchesList) {
    voteDetailsByMatch.set(m.id, [])
  }
  const tallyByMatch = new Map<number, Map<number, Array<string>>>()
  for (const m of matchesList) {
    tallyByMatch.set(m.id, new Map())
  }
  for (const v of votesList) {
    let entryMap = tallyByMatch.get(v.matchId)!
    if (!entryMap.has(v.entryId)) entryMap.set(v.entryId, [])
    entryMap.get(v.entryId)!.push(v.userId)
  }
  for (const m of matchesList) {
    const entryMap = tallyByMatch.get(m.id)!
    const details: Array<{ entryId: number; count: number; voters: Array<{ userId: string; name: string | null; image: string | null }> }> = []
    for (const [entryId, userIdsForEntry] of entryMap) {
      const voters = userIdsForEntry.map((uid) => {
        const u = usersById.get(uid)
        return { userId: uid, name: u?.name ?? null, image: u?.image ?? null }
      })
      details.push({ entryId, count: voters.length, voters })
    }
    voteDetailsByMatch.set(m.id, details)
  }

  const voteDetails = matchesList.map((m) => ({
    matchId: m.id,
    round: m.round,
    matchIndex: m.matchIndex,
    entryAId: m.entryAId,
    entryBId: m.entryBId,
    winnerId: m.winnerId,
    votes: voteDetailsByMatch.get(m.id) ?? []
  }))

  return {
    ...competition,
    entries: entriesList,
    matches: matchesList,
    voteDetails
  }
})
