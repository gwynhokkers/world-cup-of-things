import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import type { User } from '~~/server/db/schema'

const STUB_USER_ID = 'dev-stub-user'

function parseRole (s: string | undefined): 'viewer' | 'editor' | 'admin' {
  if (s === 'admin' || s === 'editor' || s === 'viewer') {
    return s
  }
  return 'admin'
}

let cached: User | null | undefined

export async function getOrCreateDevStubUser (options: {
  email: string
  name: string
  role: string | undefined
}): Promise<User> {
  if (cached) {
    return cached
  }

  const role = parseRole(options.role)
  const now = new Date()

  const byId = await db.select().from(schema.users)
    .where(eq(schema.users.id, STUB_USER_ID))
    .limit(1)
    .then(rows => rows[0])

  if (byId) {
    cached = byId
    return byId
  }

  const byEmail = await db.select().from(schema.users)
    .where(eq(schema.users.email, options.email))
    .limit(1)
    .then(rows => rows[0])

  if (byEmail) {
    cached = byEmail
    return byEmail
  }

  try {
    await db.insert(schema.users).values({
      id: STUB_USER_ID,
      name: options.name,
      email: options.email,
      emailVerified: true,
      image: null,
      role,
      githubId: null,
      googleId: null,
      createdAt: now,
      updatedAt: now
    })
  } catch {
    // Concurrent dev requests may race the same insert
  }

  const row = await db.select().from(schema.users)
    .where(eq(schema.users.id, STUB_USER_ID))
    .limit(1)
    .then(rows => rows[0])
    ?? await db.select().from(schema.users)
      .where(eq(schema.users.email, options.email))
      .limit(1)
      .then(rows => rows[0])

  if (!row) {
    throw new Error('[dev-stub-auth] Failed to load dev stub user after insert')
  }

  cached = row
  return row
}
