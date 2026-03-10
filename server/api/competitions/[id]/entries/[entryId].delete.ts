import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'
import { editCompetition } from '~/utils/abilities'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const id = getRouterParam(event, 'id')
  const entryIdParam = getRouterParam(event, 'entryId')
  if (!id || !entryIdParam) throw createError({ statusCode: 404 })
  const compId = parseInt(id, 10)
  const entryId = parseInt(entryIdParam, 10)
  if (Number.isNaN(compId) || Number.isNaN(entryId)) throw createError({ statusCode: 404 })

  const [competition] = await db.select().from(schema.competitions).where(eq(schema.competitions.id, compId))
  if (!competition) throw createError({ statusCode: 404, message: 'Competition not found' })
  if (competition.status !== 'draft') throw createError({ statusCode: 400, message: 'Cannot delete entry after start' })

  await authorize(event, editCompetition, competition)

  await db.delete(schema.entries).where(and(eq(schema.entries.id, entryId), eq(schema.entries.competitionId, compId)))
  return { ok: true }
})
