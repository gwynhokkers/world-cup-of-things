import { db, schema } from '@nuxthub/db'
import { eq, inArray } from 'drizzle-orm'
import { getSessionUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 404, message: 'Not found' })

  const [competition] = await db.select().from(schema.competitions).where(eq(schema.competitions.slug, slug))
  if (!competition) throw createError({ statusCode: 404, message: 'Competition not found' })

  const voters: Array<{ userId: string; name: string | null; image: string | null }> = []
  const userVotes: Array<{ matchId: number; entryId: number }> = []

  if (competition.status !== 'open') {
    return { voters, userVotes }
  }

  const matchesList = await db
    .select()
    .from(schema.matches)
    .where(eq(schema.matches.competitionId, competition.id))
    .orderBy(schema.matches.round, schema.matches.matchIndex)

  const currentRoundMatches = matchesList.filter((m) => m.round === competition.currentRound)
  const currentRoundMatchIds = currentRoundMatches.map((m) => m.id)
  if (currentRoundMatchIds.length === 0) return { voters, userVotes }

  const voteRows = await db
    .select({
      matchId: schema.votes.matchId,
      userId: schema.votes.userId,
      entryId: schema.votes.entryId
    })
    .from(schema.votes)
    .where(inArray(schema.votes.matchId, currentRoundMatchIds))

  // Users who have voted in every match of the round
  const votesByUser = new Map<string, Set<number>>()
  for (const v of voteRows) {
    if (!votesByUser.has(v.userId)) votesByUser.set(v.userId, new Set())
    votesByUser.get(v.userId)!.add(v.matchId)
  }
  const numMatches = currentRoundMatchIds.length
  const completedUserIds = [...votesByUser.entries()]
    .filter(([, matchIds]) => matchIds.size === numMatches)
    .map(([userId]) => userId)

  if (completedUserIds.length > 0) {
    const usersList = await db
      .select({ id: schema.users.id, name: schema.users.name, image: schema.users.image })
      .from(schema.users)
      .where(inArray(schema.users.id, completedUserIds))
    const usersById = new Map(usersList.map((u) => [u.id, u]))
    for (const uid of completedUserIds) {
      const u = usersById.get(uid)
      voters.push({ userId: uid, name: u?.name ?? null, image: u?.image ?? null })
    }
  }

  const user = await getSessionUser(event)
  if (user?.id) {
    for (const v of voteRows) {
      if (v.userId === user.id) userVotes.push({ matchId: v.matchId, entryId: v.entryId })
    }
  }

  return { voters, userVotes }
})
