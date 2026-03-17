import { db, schema } from '@nuxthub/db'
import { desc, eq } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const list = await db
    .select({
      id: schema.competitions.id,
      title: schema.competitions.title,
      slug: schema.competitions.slug,
      status: schema.competitions.status,
      createdAt: schema.competitions.createdAt
    })
    .from(schema.competitions)
    .where(eq(schema.competitions.ownerId, user.id))
    .orderBy(desc(schema.competitions.createdAt))
    .limit(50)
  return list
})
