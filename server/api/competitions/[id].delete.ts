import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { editCompetition } from '~/utils/abilities'
import { requireUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 404 })
  const compId = parseInt(id, 10)
  if (Number.isNaN(compId)) throw createError({ statusCode: 404 })

  const [competition] = await db.select().from(schema.competitions).where(eq(schema.competitions.id, compId))
  if (!competition) throw createError({ statusCode: 404, message: 'Competition not found' })

  await authorize(event, editCompetition, competition)

  await db.delete(schema.competitions).where(eq(schema.competitions.id, compId))
  setResponseStatus(event, 204)
})
