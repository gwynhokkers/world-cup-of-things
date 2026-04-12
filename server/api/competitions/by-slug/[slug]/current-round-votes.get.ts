import { db, schema } from '@nuxthub/db'
import { eq, inArray } from 'drizzle-orm'
import { getSessionUser } from '~~/server/utils/auth'
import {
  buildCurrentRoundVotesPayload,
  getCompletedUserIdsForRound
} from '~~/server/utils/currentRoundVotesPayload'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 404, message: 'Not found' })

  const [competition] = await db.select().from(schema.competitions).where(eq(schema.competitions.slug, slug))
  if (!competition) throw createError({ statusCode: 404, message: 'Competition not found' })

  if (competition.status !== 'open') {
    return { voters: [], userVotes: [] }
  }

  const matchesList = await db
    .select()
    .from(schema.matches)
    .where(eq(schema.matches.competitionId, competition.id))
    .orderBy(schema.matches.round, schema.matches.matchIndex)

  const currentRoundMatches = matchesList.filter((m) => m.round === competition.currentRound)
  const currentRoundMatchIds = currentRoundMatches.map((m) => m.id)
  if (currentRoundMatchIds.length === 0) {
    return { voters: [], userVotes: [] }
  }

  const voteRows = await db
    .select({
      matchId: schema.votes.matchId,
      userId: schema.votes.userId,
      entryId: schema.votes.entryId
    })
    .from(schema.votes)
    .where(inArray(schema.votes.matchId, currentRoundMatchIds))

  const completedUserIds = getCompletedUserIdsForRound(voteRows, currentRoundMatchIds.length)

  let usersList: Array<{ id: string; name: string | null; image: string | null }> = []
  if (completedUserIds.length > 0) {
    usersList = await db
      .select({ id: schema.users.id, name: schema.users.name, image: schema.users.image })
      .from(schema.users)
      .where(inArray(schema.users.id, completedUserIds))
  }

  const user = await getSessionUser(event)

  return buildCurrentRoundVotesPayload(
    voteRows,
    currentRoundMatchIds,
    completedUserIds,
    usersList,
    user?.id ?? null
  )
})
