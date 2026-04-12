import { getOrCreateDevStubUser } from '~~/server/utils/devStubUser'

function skipStubForPath (path: string): boolean {
  if (path.startsWith('/_nuxt/') || path.startsWith('/@') || path.startsWith('/__nuxt')) {
    return true
  }
  if (path === '/favicon.ico') {
    return true
  }
  return false
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', async (event) => {
    if (!import.meta.dev) {
      return
    }

    const config = useRuntimeConfig(event)
    if (!config.devStubAuth) {
      return
    }

    const path = event.path || ''
    if (skipStubForPath(path)) {
      return
    }

    const session = await getUserSession(event)
    if (session.user?.id) {
      return
    }

    const user = await getOrCreateDevStubUser({
      email: String(config.devStubUserEmail || 'dev@local.test'),
      name: String(config.devStubUserName || 'Local Dev'),
      role: config.devStubUserRole as string | undefined
    })

    await replaceUserSession(event, {
      user: {
        id: user.id,
        name: user.name ?? 'Local Dev',
        email: user.email,
        image: user.image ?? undefined,
        role: user.role as 'viewer' | 'editor' | 'admin'
      }
    })
  })
})
