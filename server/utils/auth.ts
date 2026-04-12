import type { SessionUser } from '~/utils/abilities'

export async function getSessionUser(event: any): Promise<SessionUser | null> {
  const session = await getUserSession(event)
  return session?.user ?? null
}

export type AuthenticatedUser = SessionUser & { id: string }

export async function requireUser(event: any): Promise<AuthenticatedUser> {
  const user = await getSessionUser(event)
  if (!user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  return user as AuthenticatedUser
}
