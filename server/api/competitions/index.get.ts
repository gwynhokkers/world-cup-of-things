import { db, schema } from '@nuxthub/db'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const list = await db.select().from(schema.competitions).orderBy(desc(schema.competitions.createdAt)).limit(50)
  return list
})
