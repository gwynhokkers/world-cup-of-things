import { blob, ensureBlob } from '@nuxthub/blob'
import { readFormData, createError } from 'h3'
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { editCompetition } from '~/utils/abilities'
import { requireUser } from '~/server/utils/auth'

const MAX_SIZE = '10MB'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

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

  const form = await readFormData(event)
  const file = form.get('file') as File | null
  if (!file || !file.size) throw createError({ statusCode: 400, message: 'No file provided' })

  ensureBlob(file, { maxSize: MAX_SIZE, types: ALLOWED_TYPES })

  const pathname = `competitions/${compId}/entries/${Date.now()}-${file.name}`
  const result = await blob.put(pathname, file, { addRandomSuffix: true, prefix: '' })
  return result
})
