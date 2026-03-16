import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string

  const config = useRuntimeConfig(event)
  const clientId = config.oauth?.github?.clientId
  const clientSecret = config.oauth?.github?.clientSecret

  if (!code) {
    if (!clientId) {
      throw createError({
        statusCode: 500,
        statusMessage: 'GitHub OAuth not configured'
      })
    }

    const redirectUri = `${getRequestURL(event).origin}/auth/github`
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`

    return sendRedirect(event, githubAuthUrl)
  }

  if (!clientId || !clientSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'GitHub OAuth not configured'
    })
  }

  const origin = getRequestURL(event).origin
  const redirectUri = `${origin}/auth/github`
  const userAgent = `WorldCupOfThings (${origin})`

  try {
    const tokenResponse = await $fetch<{ access_token?: string; error?: string; error_description?: string }>('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': userAgent
      },
      body: {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      }
    })

    if (tokenResponse.error) {
      console.error('[auth/github] GitHub token error:', tokenResponse.error, tokenResponse.error_description, 'redirect_uri=', redirectUri)
      throw createError({ statusCode: 400, statusMessage: `GitHub: ${tokenResponse.error_description || tokenResponse.error}. Check that the Authorization callback URL in your GitHub OAuth app is exactly: ${redirectUri}` })
    }
    const accessToken = tokenResponse.access_token
    if (!accessToken) {
      console.error('[auth/github] No access_token in response:', typeof tokenResponse)
      throw createError({ statusCode: 500, statusMessage: 'GitHub did not return an access token' })
    }

    const userResponse = await $fetch<{
      id: number
      login: string
      name: string
      email: string
      avatar_url: string
    }>('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': userAgent
      }
    })

    let email = userResponse.email
    if (!email) {
      const emails = await $fetch<Array<{ email: string; primary: boolean }>>('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': userAgent
        }
      })
      const primaryEmail = emails.find(e => e.primary)
      email = primaryEmail?.email || emails[0]?.email || ''
    }

    const adminGithubIds = (config.adminGithubIds || '').split(',').map((s: string) => s.trim()).filter(Boolean)
    const githubId = userResponse.id.toString()

    let user = await db.select().from(schema.users)
      .where(eq(schema.users.githubId, githubId))
      .limit(1)
      .then(rows => rows[0])

    if (!user) {
      user = await db.select().from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1)
        .then(rows => rows[0])

      const assignedRole = adminGithubIds.includes(githubId) ? 'admin' : 'viewer'

      if (user) {
        await db.update(schema.users)
          .set({
            githubId,
            image: userResponse.avatar_url,
            role: assignedRole,
            updatedAt: new Date()
          })
          .where(eq(schema.users.id, user.id))
        user = { ...user, githubId, image: userResponse.avatar_url, role: assignedRole }
      } else {
        const userId = nanoid()
        await db.insert(schema.users).values({
          id: userId,
          name: userResponse.name || userResponse.login,
          email,
          githubId,
          image: userResponse.avatar_url,
          emailVerified: true,
          role: assignedRole
        })
        user = await db.select().from(schema.users)
          .where(eq(schema.users.id, userId))
          .limit(1)
          .then(rows => rows[0])!
      }
    } else {
      const roleUpdate = adminGithubIds.includes(githubId) ? 'admin' : user.role
      await db.update(schema.users)
        .set({
          name: userResponse.name || userResponse.login,
          email,
          image: userResponse.avatar_url,
          role: roleUpdate,
          updatedAt: new Date()
        })
        .where(eq(schema.users.id, user.id))
      user = { ...user, name: userResponse.name || userResponse.login, email, image: userResponse.avatar_url, role: roleUpdate }
    }

    if (!user) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to load user after login' })
    }

    await setUserSession(event, {
      user: {
        id: user.id,
        name: user.name || userResponse.login,
        email: user.email,
        image: user.image,
        role: user.role
      }
    })

    return sendRedirect(event, '/')
  } catch (error: unknown) {
    const err = error as { message?: string; statusCode?: number; data?: unknown }
    console.error('[auth/github] OAuth error:', err?.message ?? error)
    if (err?.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to authenticate with GitHub'
    })
  }
})
