import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { createCompetition } from '~/utils/abilities'
import { requireUser } from '~/server/utils/auth'
import { generateSlug } from '~/server/utils/slug'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  await authorize(event, createCompetition)

  const body = await readBody<{ title: string }>(event)
  if (!body?.title?.trim()) {
    throw createError({ statusCode: 400, message: 'Title is required' })
  }

  let slug = generateSlug()
  const existing = await db.select().from(schema.competitions).where(eq(schema.competitions.slug, slug))
  while (existing.length > 0) {
    slug = generateSlug()
    const again = await db.select().from(schema.competitions).where(eq(schema.competitions.slug, slug))
    if (again.length === 0) break
  }

  const [competition] = await db
    .insert(schema.competitions)
    .values({
      ownerId: user.id!,
      title: body.title.trim(),
      slug,
      status: 'draft',
      currentRound: 1
    })
    .returning()

  return competition
})
