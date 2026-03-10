import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

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

  return {
    ...competition,
    entries: entriesList,
    matches: matchesList
  }
})
