export default defineOAuthGoogleEventHandler({
  config: {
    authorizationParams: {
      access_type: 'offline'
    }
  },
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        id: user.sub,
        email: user.email ?? '',
        name: user.name ?? '',
        avatar: user.picture,
        provider: 'google'
      },
      loggedInAt: Date.now()
    })
    return sendRedirect(event, '/')
  }
})
