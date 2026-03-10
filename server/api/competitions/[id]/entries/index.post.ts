import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { editCompetition } from '~/utils/abilities'
import { requireUser } from '~/server/utils/auth'

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

  const body = await readBody<{ title: string; imagePath?: string }>(event)
  if (!body?.title?.trim()) throw createError({ statusCode: 400, message: 'Title is required' })

  const count = await db.select().from(schema.entries).where(eq(schema.entries.competitionId, compId))
  const seed = count.length + 1

  const [entry] = await db
    .insert(schema.entries)
    .values({
      competitionId: compId,
      title: body.title.trim(),
      imagePath: body.imagePath ?? null,
      seed
    })
    .returning()

  return entry
})
