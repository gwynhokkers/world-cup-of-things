export default defineOAuthGitHubEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        id: user.id,
        email: user.email ?? '',
        name: user.name ?? user.login ?? '',
        avatar: user.avatar_url,
        provider: 'github'
      },
      loggedInAt: Date.now()
    })
    return sendRedirect(event, '/')
  }
})
