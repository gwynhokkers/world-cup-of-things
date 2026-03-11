import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { editCompetition } from '~/utils/abilities'
import { requireUser } from '~~/server/utils/auth'

const VALID_SIZES = [4, 8, 16, 32]

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 404 })
  const compId = parseInt(id, 10)
  if (Number.isNaN(compId)) throw createError({ statusCode: 404 })

  const [competition] = await db.select().from(schema.competitions).where(eq(schema.competitions.id, compId))
  if (!competition) throw createError({ statusCode: 404, message: 'Competition not found' })
  if (competition.status !== 'draft') throw createError({ statusCode: 400, message: 'Competition already started' })

  await authorize(event, editCompetition, competition)

  const entriesList = await db
    .select()
    .from(schema.entries)
    .where(eq(schema.entries.competitionId, compId))
    .orderBy(schema.entries.seed)

  if (!VALID_SIZES.includes(entriesList.length)) {
    throw createError({
      statusCode: 400,
      message: `Entry count must be 4, 8, 16, or 32 (got ${entriesList.length})`
    })
  }

  // Round 1: pair by seed (1v2, 3v4, 5v6, ...)
  const round1Count = entriesList.length / 2
  for (let i = 0; i < round1Count; i++) {
    await db.insert(schema.matches).values({
      competitionId: compId,
      round: 1,
      matchIndex: i + 1,
      entryAId: entriesList[i * 2].id,
      entryBId: entriesList[i * 2 + 1].id
    })
  }

  await db
    .update(schema.competitions)
    .set({ status: 'open', currentRound: 1 })
    .where(eq(schema.competitions.id, compId))

  const updated = await db.select().from(schema.competitions).where(eq(schema.competitions.id, compId))
  return updated[0]
})
